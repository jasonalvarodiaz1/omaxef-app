import React from "react";
import { usePatient } from "../context/PatientContext";
import { getCoverageForDrug, getApplicableCriteria } from "../utils/coverageLogic";

export default function PAForm({ 
  drugName,
  selectedDose,
  drugCoverage,
  paFormOpen,
  setPaFormOpen,
  setPaFormSubmitted,
  paFormData,
  setPaFormData
}) {
  const { selectedPatient: patient } = usePatient();
  
  if (!paFormOpen) return null;

  const coverage = getCoverageForDrug(drugCoverage, patient?.insurance, drugName);
  const applicableCriteria = coverage ? getApplicableCriteria(coverage, selectedDose, patient, drugName) : [];
  
  // Check which criterion types are applicable
  const criteriaTypes = new Set(applicableCriteria.map(c => c.type));
  const showMaintenance = criteriaTypes.has("maintenance");
  const showWeightLoss = criteriaTypes.has("weightLoss");
  const showWeightMaintained = criteriaTypes.has("weightMaintained");
  
  // Helper to update paFormData
  const updateFormData = (field, value) => {
    setPaFormData(prev => ({ ...prev, [field]: value }));
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-40 flex items-center justify-center z-50">
      <div className="bg-white p-6 rounded-xl shadow-xl w-full max-w-md relative overflow-y-auto max-h-[90vh]">
        <h2 className="text-xl font-bold mb-4">Prior Authorization Form</h2>
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-red-600 font-bold"
          onClick={() => setPaFormOpen(false)}
        >
          X
        </button>
        <form onSubmit={e => {e.preventDefault(); setPaFormOpen(false); setPaFormSubmitted(true);}}>
          <div className="mb-3">
            <label className="block font-semibold mb-1">Patient Name</label>
            <input className="border p-2 rounded w-full" value={patient?.name || ""} disabled />
          </div>
          <div className="mb-3">
            <label className="block font-semibold mb-1">Age</label>
            <input className="border p-2 rounded w-full" value={patient?.age || ""} disabled />
          </div>
          <div className="mb-3">
            <label className="block font-semibold mb-1">Drug</label>
            <input className="border p-2 rounded w-full" value={drugName || ""} disabled />
          </div>
          <div className="mb-3">
            <label className="block font-semibold mb-1">Dose</label>
            <input className="border p-2 rounded w-full" value={selectedDose} disabled />
          </div>
          <div className="mb-3">
            <label className="block font-semibold mb-1">Insurance</label>
            <input className="border p-2 rounded w-full" value={patient?.insurance || ""} disabled />
          </div>
          {/* Show all PA criteria for any drug requiring PA */}
          {coverage && coverage.paRequired && (
            <>
                            {/* Maintenance dose criteria - only show if applicable */}
              {showMaintenance && (
                <div className="mb-3">
                  <label className="block font-semibold mb-1">Months on therapy at maintenance dose</label>
                  <input type="number" className="border p-2 rounded w-full" value={paFormData.therapyDuration} onChange={e => updateFormData('therapyDuration', e.target.value)} min="0" />
                </div>
              )}
              {showWeightLoss && (
                <div className="mb-3">
                  <label className="block font-semibold mb-1">Lost at least 5% of baseline body weight?</label>
                  <select className="border p-2 rounded w-full" value={paFormData.weightLoss} onChange={e => updateFormData('weightLoss', e.target.value)}>
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              )}
              {showWeightMaintained && (
                <div className="mb-3">
                  <label className="block font-semibold mb-1">Maintained initial 5% weight loss?</label>
                  <select className="border p-2 rounded w-full" value={paFormData.weightMaintained} onChange={e => updateFormData('weightMaintained', e.target.value)}>
                    <option value="">Select</option>
                    <option value="yes">Yes</option>
                    <option value="no">No</option>
                  </select>
                </div>
              )}
              <div className="mb-3">
                <label className="block font-semibold mb-1">Comprehensive weight management program?</label>
                <select className="border p-2 rounded w-full" value={paFormData.weightProgram} onChange={e => updateFormData('weightProgram', e.target.value)}>
                  <option value="">Select</option>
                  <option value="yes">Yes</option>
                  <option value="no">No</option>
                </select>
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1">BMI</label>
                <input type="number" className="border p-2 rounded w-full" value={paFormData.bmi} onChange={e => updateFormData('bmi', e.target.value)} min="0" step="0.1" />
              </div>
              <div className="mb-3">
                <label className="block font-semibold mb-1">Comorbid conditions</label>
                <div className="flex flex-wrap gap-2">
                  {['Hypertension', 'Type 2 Diabetes', 'Dyslipidemia'].map(cond => (
                    <label key={cond} className="flex items-center">
                      <input type="checkbox" checked={paFormData.comorbidities.includes(cond)} onChange={e => {
                        if (e.target.checked) updateFormData('comorbidities', [...paFormData.comorbidities, cond]);
                        else updateFormData('comorbidities', paFormData.comorbidities.filter(c => c !== cond));
                      }} />
                      <span className="ml-1">{cond}</span>
                    </label>
                  ))}
                </div>
              </div>
              {/* Pediatric criteria */}
              <div className="mb-3">
                <label className="block font-semibold mb-1">BMI Percentile</label>
                <input type="number" className="border p-2 rounded w-full" value={paFormData.pediatricPercentile} onChange={e => updateFormData('pediatricPercentile', e.target.value)} min="0" max="100" />
              </div>
            </>
          )}
          <div className="mb-3">
            <label className="block font-semibold mb-1">Attach documentation (simulated)</label>
            <input type="text" className="border p-2 rounded w-full" value={paFormData.docUpload} onChange={e => updateFormData('docUpload', e.target.value)} placeholder="e.g. Chart note, PDF, etc." />
          </div>
          <button type="submit" className="mt-4 px-6 py-2 bg-blue-700 text-white rounded shadow font-bold hover:bg-blue-800 transition">Submit PA</button>
        </form>
      </div>
    </div>
  );
}
