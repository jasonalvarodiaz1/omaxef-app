import React, { useState, useEffect } from "react";
import { allDrugs } from "./data/allDrugs";
import { drugCoverage } from "./data/drugCoverage";
import { PatientProvider, usePatient } from "./context/PatientContext";
import PatientSidebar from "./components/PatientSidebar";
import PatientChart from "./components/PatientChart";
import TherapyModal from "./components/TherapyModal";

function AppContent() {
  const { selectedPatient } = usePatient();
  
  // Tab state
  const [activeTab, setActiveTab] = useState("Summary");
  
  // Therapy modal state
  const [therapyModalOpen, setTherapyModalOpen] = useState(false);
  const [drugSearch, setDrugSearch] = useState("");
  const [selectedDrugId, setSelectedDrugId] = useState(null);
  const [therapySubmitted, setTherapySubmitted] = useState(false);
  const [selectedDose, setSelectedDose] = useState("");
  
  // PA form state - grouped related fields
  const [paFormOpen, setPaFormOpen] = useState(false);
  const [paFormSubmitted, setPaFormSubmitted] = useState(false);
  const [paFormData, setPaFormData] = useState({
    paReason: "",
    therapyDuration: "",
    weightLoss: "",
    weightMaintained: "",
    weightProgram: "",
    bmi: "",
    comorbidities: [],
    pediatricPercentile: "",
    maintenanceDose: "",
    bmiReduction: "",
    docUpload: ""
  });
  
  // Update BMI when patient changes
  useEffect(() => {
    if (selectedPatient?.vitals?.bmi) {
      setPaFormData(prev => ({ ...prev, bmi: selectedPatient.vitals.bmi.toString() }));
    }
  }, [selectedPatient]);
  
  const tabNames = ["Summary", "Medications", "Results"];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-row">
      {/* Sidebar */}
      <PatientSidebar />
      
      {/* Main content */}
      <main className="flex-1 flex flex-col items-center py-8">
        <header className="bg-blue-900 text-white py-4 px-8 shadow w-full mb-2 flex justify-between items-center">
          <h1 className="text-2xl font-bold tracking-wide">Electronic Health Record</h1>
        </header>
        
        <nav className="flex space-x-0 mb-6 w-full max-w-2xl border-b border-gray-300">
          {tabNames.map(tab => (
            <button
              key={tab}
              className={`px-5 py-2 font-semibold border-r border-gray-300 focus:outline-none ${activeTab === tab ? "bg-white text-blue-900 border-t-2 border-blue-900" : "bg-gray-100 text-gray-700"}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab}
            </button>
          ))}
        </nav>
        
        <div className="w-full max-w-2xl">
          {/* Tab content rendering */}
          {selectedPatient && (
            <div>
              {activeTab === "Summary" && (
                <div>
                  <PatientChart patient={selectedPatient} />
                  <div className="bg-white p-4 rounded shadow mt-4">
                    <h2 className="text-xl font-bold mb-2">Allergies</h2>
                    {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                      <ul className="list-disc ml-6">
                        {selectedPatient.allergies.map((allergy, idx) => (
                          <li key={idx}>{allergy}</li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-gray-500">None</div>
                    )}
                  </div>
                </div>
              )}
              
              {activeTab === "Medications" && (
                <div className="bg-white p-4 rounded shadow mt-4">
                  <h2 className="text-xl font-bold mb-2">Medications</h2>
                  {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
                    <ul className="list-disc ml-6">
                      {selectedPatient.medications.map((med, idx) => (
                        <li key={idx}>
                          <span className="font-bold">{med.name}</span> — {med.dose}<br />
                          <span className="text-gray-700 italic">{med.sig}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-gray-500">No medications listed.</div>
                  )}
                  <button
                    className="mt-6 px-6 py-2 bg-blue-700 text-white rounded shadow font-bold hover:bg-blue-800 transition"
                    onClick={() => setTherapyModalOpen(true)}
                  >
                    Initiate Therapy
                  </button>
                </div>
              )}
              
              {activeTab === "Results" && (
                <div className="bg-white p-4 rounded shadow mt-4">
                  <h2 className="text-xl font-bold mb-2">Lab Results</h2>
                  {selectedPatient.labs ? (
                    <table className="min-w-full text-left">
                      <thead>
                        <tr>
                          <th className="pr-4">Test</th>
                          <th className="pr-4">Value</th>
                          <th className="pr-4">Units</th>
                        </tr>
                      </thead>
                      <tbody>
                        {Object.entries(selectedPatient.labs).map(([test, obj]) => (
                          <tr key={test}>
                            <td className="pr-4 font-semibold">{test.toUpperCase()}</td>
                            <td className="pr-4">{obj.value}</td>
                            <td className="pr-4">{obj.units}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="text-gray-500">No lab results available.</div>
                  )}
                </div>
              )}
            </div>
          )}
          
          {/* Therapy Modal */}
          <TherapyModal
            therapyModalOpen={therapyModalOpen}
            setTherapyModalOpen={setTherapyModalOpen}
            allDrugs={allDrugs}
            drugCoverage={drugCoverage}
            drugSearch={drugSearch}
            setDrugSearch={setDrugSearch}
            selectedDrugId={selectedDrugId}
            setSelectedDrugId={setSelectedDrugId}
            selectedDose={selectedDose}
            setSelectedDose={setSelectedDose}
            therapySubmitted={therapySubmitted}
            setTherapySubmitted={setTherapySubmitted}
            paFormOpen={paFormOpen}
            setPaFormOpen={setPaFormOpen}
            paFormSubmitted={paFormSubmitted}
            setPaFormSubmitted={setPaFormSubmitted}
            paFormData={paFormData}
            setPaFormData={setPaFormData}
          />
        </div>
      </main>
    </div>
  );
}

export default function App() {
  return (
    <PatientProvider>
      <AppContent />
    </PatientProvider>
  );
}
