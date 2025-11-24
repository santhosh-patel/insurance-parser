import React, { useState } from 'react';
import axios from 'axios';
import { Upload, FileText, AlertTriangle, CheckCircle, XCircle, Loader2 } from 'lucide-react';

function App() {
  const [files, setFiles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleFileChange = (e) => {
    setFiles(Array.from(e.target.files));
    setResult(null);
    setError(null);
  };

  const handleProcess = async () => {
    if (files.length === 0) return;

    setLoading(true);
    setError(null);
    const formData = new FormData();
    files.forEach((file) => {
      formData.append('files', file);
    });

    try {
      const response = await axios.post('http://localhost:8000/process-claim', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      console.log("API Response:", response.data); // Debug log
      setResult(response.data);
    } catch (err) {
      console.error(err);
      setError("Failed to process claim. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 font-sans p-8">
      <div className="max-w-6xl mx-auto">
        <header className="mb-8">
          <h1 className="text-3xl font-bold text-slate-800 flex items-center gap-2">
            <FileText className="w-8 h-8 text-blue-600" />
            Medical Claim AI Processor
          </h1>
          <p className="text-slate-500 mt-2">Upload medical documents to automatically process and validate claims.</p>
        </header>

        <main className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Upload */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
              <h2 className="text-lg font-semibold mb-4">Upload Documents</h2>
              <div className="border-2 border-dashed border-slate-300 rounded-lg p-8 text-center hover:bg-slate-50 transition-colors relative">
                <input
                  type="file"
                  multiple
                  accept=".pdf"
                  onChange={handleFileChange}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                />
                <Upload className="w-10 h-10 text-slate-400 mx-auto mb-2" />
                <p className="text-sm text-slate-600 font-medium">Click or Drag PDFs here</p>
                <p className="text-xs text-slate-400 mt-1">Bills, Discharge Summaries, ID Cards</p>
              </div>

              {files.length > 0 && (
                <div className="mt-4 space-y-2">
                  <p className="text-sm font-medium text-slate-700">Selected Files ({files.length}):</p>
                  <ul className="text-xs text-slate-500 space-y-1">
                    {files.map((f, i) => (
                      <li key={i} className="truncate">• {f.name}</li>
                    ))}
                  </ul>
                </div>
              )}

              <button
                onClick={handleProcess}
                disabled={files.length === 0 || loading}
                className={`w-full mt-6 py-2.5 px-4 rounded-lg font-medium text-white flex items-center justify-center gap-2 transition-all
                  ${files.length === 0 || loading ? 'bg-slate-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700 shadow-md hover:shadow-lg'}
                `}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Process Claim'}
              </button>

              {error && (
                <div className="mt-4 p-3 bg-red-50 text-red-700 text-sm rounded-lg flex items-start gap-2">
                  <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
                  {error}
                </div>
              )}
            </div>
          </div>

          {/* Right Column: Results */}
          <div className="lg:col-span-2 space-y-6">
            {!result && !loading && (
              <div className="h-full flex flex-col items-center justify-center text-slate-400 p-12 border-2 border-dashed border-slate-200 rounded-xl">
                <FileText className="w-16 h-16 mb-4 opacity-20" />
                <p>Process a claim to see results here</p>
              </div>
            )}

            {loading && (
              <div className="h-64 flex flex-col items-center justify-center text-blue-600">
                <Loader2 className="w-12 h-12 animate-spin mb-4" />
                <p className="font-medium animate-pulse">Analyzing documents with AI agents...</p>
              </div>
            )}

            {result && result.claim_decision && (
              <>
                {/* Status Card */}
                <div className={`p-6 rounded-xl border-l-4 shadow-sm
                  ${result.claim_decision.status === 'approved' ? 'bg-green-50 border-green-500 text-green-900' :
                    result.claim_decision.status === 'rejected' ? 'bg-red-50 border-red-500 text-red-900' :
                      'bg-yellow-50 border-yellow-500 text-yellow-900'
                  }
                `}>
                  <div className="flex items-start gap-4">
                    <div className="shrink-0">
                      {result.claim_decision.status === 'approved' && <CheckCircle className="w-10 h-10" />}
                      {result.claim_decision.status === 'rejected' && <XCircle className="w-10 h-10" />}
                      {result.claim_decision.status === 'manual_review' && <AlertTriangle className="w-10 h-10" />}
                    </div>
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold">
                        {result.claim_decision.status?.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase()) || 'Unknown Status'}
                      </h2>
                      <p className="opacity-90 mt-2 text-base">{result.claim_decision.reason}</p>

                      {/* Document Summary */}
                      <div className="mt-4 pt-4 border-t border-current border-opacity-20">
                        <p className="font-semibold text-sm mb-2">📄 Documents Submitted: {result.documents?.length || 0}</p>
                        <ul className="text-sm opacity-90 space-y-1">
                          {result.documents?.map((doc, idx) => (
                            <li key={idx} className="flex items-center gap-2">
                              <span className="w-2 h-2 rounded-full bg-current opacity-50"></span>
                              <span className="font-medium">{doc.document_type?.replace(/_/g, ' ').toUpperCase() || 'UNKNOWN'}</span>
                              {doc.patient_name && <span className="opacity-75">- {doc.patient_name}</span>}
                            </li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Missing Documents Alert */}
                {result.validation?.missing_documents?.length > 0 && (
                  <div className="bg-red-50 border-2 border-red-200 p-6 rounded-xl">
                    <div className="flex items-start gap-3">
                      <XCircle className="w-6 h-6 text-red-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-red-900 text-lg mb-2">Missing Required Documents</h3>
                        <p className="text-red-800 mb-4">
                          We cannot process your insurance claim without the following documents. Please upload these documents to continue:
                        </p>
                        <div className="space-y-2">
                          {result.validation.missing_documents.map((issue, idx) => (
                            <div key={`missing-${idx}`} className="flex items-start gap-2 bg-white bg-opacity-50 p-3 rounded-lg">
                              <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                              <span className="text-sm text-red-900 font-medium">{issue}</span>
                            </div>
                          ))}
                        </div>
                        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                          <p className="text-sm text-blue-900">
                            <span className="font-bold">ℹ️ Required Documents:</span> To process a medical insurance claim, you must submit:
                          </p>
                          <ul className="text-sm text-blue-800 mt-2 ml-6 list-disc space-y-1">
                            <li><strong>Hospital Bill</strong> - Shows treatment costs and services</li>
                            <li><strong>Discharge Summary</strong> - Medical history and diagnosis</li>
                            <li><strong>ID Card</strong> - Patient identification and policy details</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* AI Processing Log */}
                <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border-2 border-blue-200 p-6 rounded-xl">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="bg-blue-600 p-2 rounded-lg">
                      <Loader2 className="w-5 h-5 text-white" />
                    </div>
                    <div>
                      <h3 className="font-bold text-blue-900 text-lg">AI Processing Log</h3>
                      <p className="text-sm text-blue-700">Document classification results from our AI agents</p>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-lg p-4 font-mono text-sm overflow-x-auto">
                    <div className="space-y-2">
                      {result.documents?.map((doc, idx) => (
                        <div key={idx} className="flex items-start gap-3 text-green-400">
                          <span className="text-slate-500 select-none">›</span>
                          <div className="flex-1">
                            <span className="text-cyan-400">Classified</span>
                            <span className="text-white mx-2">{files[idx]?.name || `Document ${idx + 1}`}</span>
                            <span className="text-slate-400">as:</span>
                            <span className="text-yellow-300 ml-2 font-bold">{doc.document_type || 'unknown'}</span>
                            <span className="text-slate-600 ml-3">({Math.round((doc.confidence_score || 0) * 100)}% confidence)</span>
                          </div>
                        </div>
                      ))}
                      <div className="flex items-center gap-3 text-blue-400 mt-4 pt-3 border-t border-slate-700">
                        <span className="text-slate-500 select-none">✓</span>
                        <span>INFO: Processing completed - {result.documents?.length || 0} documents analyzed successfully</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Discrepancies Warning */}
                {result.validation?.discrepancies?.length > 0 && (
                  <div className="bg-yellow-50 border-2 border-yellow-200 p-6 rounded-xl">
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-6 h-6 text-yellow-600 shrink-0 mt-0.5" />
                      <div className="flex-1">
                        <h3 className="font-bold text-yellow-900 text-lg mb-2">Data Discrepancies Detected</h3>
                        <p className="text-yellow-800 mb-4">
                          We found inconsistencies in your submitted documents that require manual review:
                        </p>
                        <div className="space-y-2">
                          {result.validation.discrepancies.map((issue, idx) => (
                            <div key={`discrep-${idx}`} className="flex items-start gap-2 bg-white bg-opacity-50 p-3 rounded-lg">
                              <span className="text-yellow-600">⚠️</span>
                              <span className="text-sm text-yellow-900">{issue}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Extracted Data Summary */}
                <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-200">
                  <h3 className="font-semibold text-slate-800 text-lg mb-4 flex items-center gap-2">
                    <FileText className="w-5 h-5 text-blue-600" />
                    Extracted Data from Your Documents
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {result.documents?.map((doc, idx) => (
                      <div key={idx} className="border-2 border-slate-100 p-4 rounded-lg hover:border-blue-200 transition-colors">
                        <div className="flex justify-between items-start mb-3">
                          <div>
                            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-bold uppercase rounded tracking-wide">
                              {doc.document_type?.replace(/_/g, ' ') || 'UNKNOWN'}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400 font-mono bg-slate-50 px-2 py-1 rounded" title="AI Confidence Score">
                            {Math.round((doc.confidence_score || 0) * 100)}% confidence
                          </span>
                        </div>

                        <div className="space-y-2 mt-3">
                          {doc.patient_name && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">👤 Patient:</span>
                              <span className="text-slate-900 font-semibold">{doc.patient_name}</span>
                            </div>
                          )}
                          {doc.hospital_name && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">🏥 Hospital:</span>
                              <span className="text-slate-900">{doc.hospital_name}</span>
                            </div>
                          )}
                          {doc.total_amount > 0 && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">💰 Amount:</span>
                              <span className="text-green-700 font-bold">
                                ${typeof doc.total_amount === 'number' ? doc.total_amount.toLocaleString() : doc.total_amount}
                              </span>
                            </div>
                          )}
                          {doc.admission_date && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">📅 Admitted:</span>
                              <span className="text-slate-900">{doc.admission_date}</span>
                            </div>
                          )}
                          {doc.discharge_date && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">📅 Discharged:</span>
                              <span className="text-slate-900">{doc.discharge_date}</span>
                            </div>
                          )}
                          {doc.diagnosis && (
                            <div className="text-sm py-1">
                              <span className="text-slate-500 font-medium block mb-1">🩺 Diagnosis:</span>
                              <span className="text-slate-900 bg-slate-50 p-2 rounded block">{doc.diagnosis}</span>
                            </div>
                          )}
                          {doc.policy_number && (
                            <div className="flex justify-between text-sm py-1 border-b border-slate-100">
                              <span className="text-slate-500 font-medium">🆔 Policy #:</span>
                              <span className="text-slate-900 font-mono">{doc.policy_number}</span>
                            </div>
                          )}

                          {/* Show if no data extracted */}
                          {!doc.patient_name && !doc.hospital_name && !doc.total_amount && !doc.diagnosis && !doc.policy_number && (
                            <div className="text-center py-4">
                              <p className="text-xs text-slate-400 italic">⚠️ No data could be extracted from this document</p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}

export default App;
