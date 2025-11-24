import uvicorn
import os
import json
import typing
from enum import Enum
from typing import List, Optional, Dict, Any
from fastapi import FastAPI, File, UploadFile, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import google.generativeai as genai
from google.generativeai.types import HarmCategory, HarmBlockThreshold

# --- CONFIGURATION ---
GOOGLE_API_KEY = "AIzaSyDBMVYmWIIuMbG_dAT6CT67BBHFP5d0BWU"

genai.configure(api_key=GOOGLE_API_KEY)

# Initialize Model with Safety Config to avoid blocking medical terms
generation_config = {
    "temperature": 0.1,
    "response_mime_type": "application/json"
}

safety_settings = {
    HarmCategory.HARM_CATEGORY_HARASSMENT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_HATE_SPEECH: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT: HarmBlockThreshold.BLOCK_NONE,
    HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT: HarmBlockThreshold.BLOCK_NONE,
}

app = FastAPI(title="AI Medical Claim Processor", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- DATA MODELS ---
class DocumentType(str, Enum):
    BILL = "bill"
    DISCHARGE_SUMMARY = "discharge_summary"
    ID_CARD = "id_card"
    PHARMACY_BILL = "pharmacy_bill"
    CLAIM_FORM = "claim_form"
    UNKNOWN = "unknown"

class ClaimStatus(str, Enum):
    APPROVED = "approved"
    REJECTED = "rejected"
    MANUAL_REVIEW = "manual_review"

class ExtractedData(BaseModel):
    document_type: DocumentType
    patient_name: Optional[str] = None
    admission_date: Optional[str] = None
    discharge_date: Optional[str] = None
    total_amount: Optional[float] = 0.0
    hospital_name: Optional[str] = None
    policy_number: Optional[str] = None
    diagnosis: Optional[str] = None
    confidence_score: float = 0.0

class ValidationResult(BaseModel):
    missing_documents: List[str]
    discrepancies: List[str]

class ClaimDecision(BaseModel):
    status: ClaimStatus
    reason: str

class FinalResponse(BaseModel):
    documents: List[Dict[str, Any]]
    validation: ValidationResult
    claim_decision: ClaimDecision

# --- LLM AGENT BASE ---
class BaseAgent:
    def __init__(self):
        self.model = genai.GenerativeModel(
            model_name='gemini-2.5-flash',
            generation_config=generation_config,
            safety_settings=safety_settings
        )

    def analyze(self, file_content: bytes, mime_type: str, prompt: str) -> Dict:
        try:
            # Construct the request
            response = self.model.generate_content([
                {'mime_type': mime_type, 'data': file_content},
                prompt
            ])
            
            # Debug: Print raw response if needed
            # print(f"Raw LLM Response: {response.text}")

            return json.loads(response.text)

        except Exception as e:
            print(f"❌ LLM ERROR: {e}")
            # If response was blocked, it often has no text
            return {"error": str(e), "document_type": "unknown"}

# --- SPECIALIZED AGENTS ---
class ClassifierAgent(BaseAgent):
    def classify(self, file_content: bytes) -> str:
        prompt = """
        Analyze this image/PDF. Classify it into exactly one of these categories:
        - bill
        - discharge_summary
        - id_card
        - pharmacy_bill
        - claim_form
        
        Return a JSON object with a single key "document_type".
        Example: {"document_type": "bill"}
        """
        data = self.analyze(file_content, "application/pdf", prompt)
        return data.get("document_type", "unknown")

class ExtractionAgent(BaseAgent):
    def extract(self, file_content: bytes, doc_type: str) -> ExtractedData:
        prompts = {
            "bill": "Extract: patient_name, total_amount, hospital_name, admission_date. Return JSON.",
            "discharge_summary": "Extract: patient_name, admission_date, discharge_date, diagnosis. Return JSON.",
            "id_card": "Extract: patient_name, policy_number. Return JSON.",
            "pharmacy_bill": "Extract: patient_name, total_amount. Return JSON.",
            "claim_form": "Extract: patient_name, total_amount. Return JSON."
        }
        
        base_prompt = prompts.get(doc_type, "Extract all visible text.")
        full_prompt = f"""
        {base_prompt}
        Also return a 'confidence_score' (0.0 to 1.0).
        If fields are missing, use null.
        Ensure keys match: patient_name, admission_date, discharge_date, total_amount, hospital_name, policy_number, diagnosis.
        """
        
        data = self.analyze(file_content, "application/pdf", full_prompt)
        
        # Safe defaults
        return ExtractedData(
            document_type=doc_type,
            patient_name=data.get("patient_name"),
            admission_date=data.get("admission_date"),
            discharge_date=data.get("discharge_date"),
            total_amount=float(data.get("total_amount") or 0.0),
            hospital_name=data.get("hospital_name"),
            policy_number=data.get("policy_number"),
            diagnosis=data.get("diagnosis"),
            confidence_score=data.get("confidence_score", 0.0)
        )

# --- VALIDATION ENGINE ---
class Validator:
    @staticmethod
    def validate(extracted_docs: List[ExtractedData]) -> tuple[ValidationResult, ClaimDecision]:
        missing = []
        discrepancies = []
        
        types_found = [doc.document_type for doc in extracted_docs]
        required = [DocumentType.BILL, DocumentType.DISCHARGE_SUMMARY, DocumentType.ID_CARD]
        
        for req in required:
            if req not in types_found:
                missing.append(f"Missing required document: {req.value}")

        # Simple Name Check
        names = [doc.patient_name.lower() for doc in extracted_docs if doc.patient_name]
        if len(names) > 1:
            base = names[0]
            if not all(base in n or n in base for n in names):
                discrepancies.append(f"Name mismatch: {names}")

        validation_res = ValidationResult(missing_documents=missing, discrepancies=discrepancies)
        
        if missing:
            decision = ClaimDecision(status=ClaimStatus.REJECTED, reason="Missing required documents")
        elif discrepancies:
            decision = ClaimDecision(status=ClaimStatus.MANUAL_REVIEW, reason="Discrepancies detected")
        else:
            decision = ClaimDecision(status=ClaimStatus.APPROVED, reason="All documents consistent")
            
        return validation_res, decision

# --- API ENDPOINTS ---
@app.post("/process-claim", response_model=FinalResponse)
async def process_claim(files: List[UploadFile] = File(...)):
    if not files:
        raise HTTPException(status_code=400, detail="No files uploaded")

    classifier = ClassifierAgent()
    extractor = ExtractionAgent()
    processed_docs = []
    
    for file in files:
        content = await file.read()
        # 1. Classify
        doc_type = classifier.classify(content)
        print(f"Classified {file.filename} as: {doc_type}") # DEBUG LOG
        
        # 2. Extract
        data = extractor.extract(content, doc_type)
        processed_docs.append(data)

    # 3. Validate
    val_res, decision = Validator.validate(processed_docs)

    return FinalResponse(
        documents=[doc.dict() for doc in processed_docs],
        validation=val_res,
        claim_decision=decision
    )

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)