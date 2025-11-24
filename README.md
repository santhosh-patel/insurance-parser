# 🏥 AI Medical Claim Processor

A powerful, dockerized application that automates the processing of medical insurance claims using Google's Gemini AI. This system classifies uploaded documents, extracts critical data, and validates claims in real-time.

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Docker](https://img.shields.io/badge/docker-%230db7ed.svg?style=flat&logo=docker&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-005571?style=flat&logo=fastapi)
![React](https://img.shields.io/badge/react-%2320232a.svg?style=flat&logo=react&logoColor=%2361DAFB)

## ✨ Features

- **🤖 Multi-Agent AI Architecture**:
  - **Classifier Agent**: Automatically identifies document types (Hospital Bills, Discharge Summaries, ID Cards, Pharmacy Bills).
  - **Extraction Agent**: Intelligently extracts key fields (Patient Name, Amounts, Dates, Diagnoses) based on the document type.
- **✅ Smart Validation**:
  - Checks for missing required documents.
  - Detects data discrepancies (e.g., name mismatches across documents).
  - Provides an automated claim decision (Approved, Rejected, or Manual Review).
- **💻 Modern UI**:
  - Clean, responsive React frontend.
  - Drag-and-drop file upload.
  - Real-time processing logs and visual feedback.
- **🐳 Fully Dockerized**: One-command setup for both backend and frontend.

## 🛠️ Tech Stack

- **Backend**: Python, FastAPI, Google Gemini API (Generative AI)
- **Frontend**: React, Vite, Tailwind CSS, Lucide Icons
- **Infrastructure**: Docker, Docker Compose

## 🚀 Getting Started

### Prerequisites

- [Docker Desktop](https://www.docker.com/products/docker-desktop) installed and running.
- A [Google Gemini API Key](https://aistudio.google.com/app/apikey).

### Installation & Run

1.  **Clone the repository**
    ```bash
    git clone https://github.com/santhosh-patel/insurance-parser.git
    cd insurance-parser
    ```

2.  **Set your API Key**
    You have two options:

    *Option A: Create a `.env` file (Recommended)*
    Create a file named `.env` in the root directory (or inside `backend/` if running locally without Docker) and add:
    ```env
    GOOGLE_API_KEY=your_actual_api_key_here
    ```

    *Option B: Pass it via environment variable*
    (See step 3)

3.  **Run with Docker**
    Build and start the application:
    ```bash
    docker compose up --build
    ```
    *If you didn't create a .env file, you can pass the key directly:*
    ```bash
    # Linux/Mac
    GOOGLE_API_KEY=your_key docker compose up --build

    # Windows PowerShell
    $env:GOOGLE_API_KEY="your_key"; docker compose up --build
    ```

4.  **Access the App**
    - **Frontend**: Open [http://localhost:3000](http://localhost:3000) in your browser.
    - **Backend API Docs**: [http://localhost:8000/docs](http://localhost:8000/docs)

## 📂 Project Structure

```
insurance-parser/
├── backend/
│   ├── main.py           # FastAPI application & AI Agents
│   ├── requirements.txt  # Python dependencies
│   └── Dockerfile        # Backend container config
├── frontend/
│   ├── src/              # React source code
│   │   ├── App.jsx       # Main UI component
│   │   └── index.css     # Tailwind styles
│   ├── package.json      # Node dependencies
│   └── Dockerfile        # Frontend container config
└── docker-compose.yml    # Orchestration config
```

## 🛡️ Validation Rules

The system enforces the following rules to approve a claim:
1.  **Required Documents**: Must include a *Hospital Bill*, *Discharge Summary*, and *ID Card*.
2.  **Consistency**: Patient names must match across all documents.
3.  **Data Completeness**: Critical fields like amounts and dates must be extractable.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.