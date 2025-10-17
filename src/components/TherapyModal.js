import React, { useState, useMemo, useEffect } from "react";
import { usePatient } from "../context/PatientContext";
import CoverageDisplay from "./CoverageDisplay";
import PAForm from "./PAForm";
import { getCoverageForDrug } from "../utils/coverageLogic";

function TherapyModalContent({
  allDrugs,
  drugCoverage,
  drugSearch,
  setDrugSearch,
  selectedDrugId,
  setSelectedDrugId,
  selectedDose,
  setSelectedDose,
  therapySubmitted,
  setTherapySubmitted,
  paFormOpen,
  setPaFormOpen,
  paFormSubmitted,
  setPaFormSubmitted,
  paFormData,
  setPaFormData,
  setTherapyModalOpen,
  patient,
  filteredDrugs,
  selectedDrug,
  coverage,
  coverageError
}) {
  return (
    <div 
      className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50"
      role="dialog"
      aria-labelledby="therapy-modal-title"
      aria-modal="true"
    >
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-lg relative overflow-y-auto max-h-[90vh]">
        <h2 id="therapy-modal-title" className="text-xl font-bold mb-4">Initiate Therapy</h2>
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 font-bold"
          onClick={() => {
            setTherapyModalOpen(false);
            setDrugSearch("");
            setSelectedDrugId(null);
            setTherapySubmitted(false);
          }}
          aria-label="Close therapy modal"
        >
          X
        </button>
        <div>
          <label className="block font-semibold mb-2">Search for any drug:</label>
          <input
            type="text"
            className="border p-2 rounded w-full mb-4"
            placeholder="Type drug name or generic..."
            value={drugSearch}
            onChange={e => setDrugSearch(e.target.value)}
          />
          {/* Only show dropdown when searching */}
          {drugSearch.trim() && (
            <ul className="max-h-64 overflow-y-auto">
              {filteredDrugs.map(drug => (
                <li
                  key={drug.id}
                  className={`p-2 mb-2 rounded cursor-pointer hover:bg-blue-100 ${selectedDrugId === drug.id ? "bg-blue-200" : ""}`}
                  onClick={() => {
                    setSelectedDrugId(drug.id);
                    setTherapySubmitted(false);
                    setSelectedDose("");
                    setDrugSearch(drug.name);
                  }}
                >
                  <span className="font-bold">{drug.name}</span> <span className="text-gray-500">({drug.generic})</span>
                  <span className="ml-2 px-2 py-1 bg-gray-200 rounded text-xs">{drug.class}</span>
                </li>
              ))}
            </ul>
          )}
          {/* Dose selection for selected drug */}
          {selectedDrugId && (
            <div className="mb-4">
              <label className="block font-semibold mb-2">Select Dose:</label>
              <select
                className="border p-2 rounded w-full"
                value={selectedDose}
                onChange={e => setSelectedDose(e.target.value)}
              >
                <option value="">Choose dose</option>
                {/* Check if drug has doseSchedule (enhanced) or just doses array */}
                {coverage?.doseSchedule ? (
                  coverage.doseSchedule.map((doseInfo, idx) => (
                    <option key={idx} value={doseInfo.value}>
                      {doseInfo.value} - {doseInfo.duration} ({doseInfo.phase})
                    </option>
                  ))
                ) : (
                  (selectedDrug?.doses || []).map((dose, idx) => (
                    <option key={idx} value={dose}>{dose}</option>
                  ))
                )}
              </select>
            </div>
          )}
          {/* Coverage display */}
          {selectedDrugId && patient && (
            <>
              {coverageError && (
                <div className="bg-red-100 p-3 rounded border border-red-300 text-red-800 mb-4">
                  {coverageError}
                </div>
              )}
              <CoverageDisplay
                insurance={patient.insurance}
                drugName={selectedDrug?.name}
                selectedDose={selectedDose}
                selectedPatient={patient}
                drugCoverage={drugCoverage}
              />
              {/* PA Button logic: only show after dose is selected and PA is required */}
              {selectedDose && coverage && coverage.paRequired && !therapySubmitted && !paFormOpen && !paFormSubmitted && (
                <button
                  className="mt-4 px-6 py-2 bg-yellow-600 text-white rounded shadow font-bold hover:bg-yellow-700 transition"
                  onClick={() => setPaFormOpen(true)}
                >
                  Start PA
                </button>
              )}
              {/* PA mock form modal */}
              <PAForm
                drugName={selectedDrug?.name}
                selectedDose={selectedDose}
                drugCoverage={drugCoverage}
                paFormOpen={paFormOpen}
                setPaFormOpen={setPaFormOpen}
                setPaFormSubmitted={setPaFormSubmitted}
                paFormData={paFormData}
                setPaFormData={setPaFormData}
              />
              {/* PA confirmation */}
              {paFormSubmitted && (
                <div className="mt-4 p-4 bg-yellow-100 border border-yellow-400 rounded text-yellow-900 font-bold">
                  PA submitted for {patient.name} with {selectedDrug?.name}!<br />
                  <span className="text-sm font-normal">(Simulated submission to CoverMyMeds)</span>
                </div>
              )}
            </>
          )}
          {/* Submit Therapy button */}
          {selectedDrugId && patient && !therapySubmitted && selectedDose && (
            <button
              className="mt-6 px-6 py-2 bg-green-700 text-white rounded shadow font-bold hover:bg-green-800 transition"
              onClick={() => {
                setTherapySubmitted(true);
                setPaFormSubmitted(false);
                setPaFormOpen(false);
                setPaFormData({
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
              }}
            >
              Submit Therapy
            </button>
          )}
          {/* Submission confirmation */}
          {therapySubmitted && (
            <div className="mt-6 p-4 bg-green-100 border border-green-400 rounded text-green-900 font-bold">
              Therapy submitted for {patient.name} with {selectedDrug?.name}!
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function TherapyModal({
  therapyModalOpen,
  setTherapyModalOpen,
  allDrugs,
  drugCoverage,
  drugSearch,
  setDrugSearch,
  selectedDrugId,
  setSelectedDrugId,
  selectedDose,
  setSelectedDose,
  therapySubmitted,
  setTherapySubmitted,
  paFormOpen,
  setPaFormOpen,
  paFormSubmitted,
  setPaFormSubmitted,
  paFormData,
  setPaFormData
}) {
  const { selectedPatient: patient } = usePatient();
  const [coverageError, setCoverageError] = useState(null);
  
  const filteredDrugs = allDrugs.filter(drug =>
    drug.name.toLowerCase().includes(drugSearch.toLowerCase()) ||
    drug.generic.toLowerCase().includes(drugSearch.toLowerCase())
  );

  const selectedDrug = allDrugs.find(d => d.id === selectedDrugId);
  
  const coverage = useMemo(() => {
    if (!patient || !selectedDrug) {
      setCoverageError(null);
      return null;
    }
    
    try {
      const result = getCoverageForDrug(drugCoverage, patient.insurance, selectedDrug.name);
      if (!result) {
        setCoverageError(`Coverage not found for ${selectedDrug.name} under ${patient.insurance}`);
        return null;
      }
      setCoverageError(null);
      return result;
    } catch (error) {
      setCoverageError(`Error checking coverage: ${error.message}`);
      return null;
    }
  }, [patient, selectedDrug, drugCoverage]);
  
  // Close modal on Escape key
  useEffect(() => {
    const handleEscape = (e) => {
      if (e.key === 'Escape') {
        setTherapyModalOpen(false);
      }
    };
    
    if (therapyModalOpen) {
      document.addEventListener('keydown', handleEscape);
      return () => document.removeEventListener('keydown', handleEscape);
    }
  }, [therapyModalOpen, setTherapyModalOpen]);
  
  if (!therapyModalOpen) return null;

  return (
    <TherapyModalContent
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
      setTherapyModalOpen={setTherapyModalOpen}
      patient={patient}
      filteredDrugs={filteredDrugs}
      selectedDrug={selectedDrug}
      coverage={coverage}
      coverageError={coverageError}
    />
  );
}
