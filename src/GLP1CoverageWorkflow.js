import React, { useState } from "react";
import { patients } from "./data/patients";
import { glp1Drugs } from "./data/glp1Drugs";

function getCoverage(drug, patient) {
  if (!drug || !patient) return null;
  const rule = drug.coverageRules.find(r => r.insurance === patient.insurance);
  if (!rule) return { isCovered: false, paRequired: false, paQuestions: [], preferred: false, stepTherapy: false };

  // Example: Add logic based on diagnosis/labs (expand as needed)
  if (drug.id === "ozempic" && patient.insurance === "Medicare") {
    if (!patient.diagnosis.includes("Type 2 Diabetes") || patient.labs.a1c <= 7) {
      return { ...rule, isCovered: false };
    }
  }
  if (drug.id === "mounjaro" && patient.insurance === "Commercial") {
    if (patient.labs.bmi <= 30) {
      return { ...rule, isCovered: false, paRequired: false, paQuestions: [] };
    }
  }
  // More custom logic can go here

  return rule;
}

export default function GLP1CoverageWorkflow({ selectedPatientId }) {
  const [selectedDrugId, setSelectedDrugId] = useState("");

  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  const selectedDrug = glp1Drugs.find(d => d.id === selectedDrugId);

  const coverage = getCoverage(selectedDrug, selectedPatient);

  // Only show if patient is selected
  if (!selectedPatient) return null;

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <h3 className="text-xl font-bold text-blue-800 mb-4">GLP-1 Coverage Checker</h3>

      {/* Drug Selector */}
      <div className="mb-4">
        <label className="block font-semibold mb-1">Select GLP-1 drug:</label>
        <select
          className="border p-2 rounded w-full"
          value={selectedDrugId}
          onChange={e => setSelectedDrugId(e.target.value)}
        >
          <option value="">Choose a drug</option>
          {glp1Drugs.map(d => (
            <option key={d.id} value={d.id}>
              {d.name} ({d.generic})
            </option>
          ))}
        </select>
      </div>

      {/* Coverage Display */}
      {selectedDrug && (
        <div className="bg-blue-50 p-4 rounded border border-blue-200 mt-4">
          <h4 className="text-lg font-bold mb-2">Coverage Decision</h4>
          <ul className="mb-2">
            <li>
              <strong>Covered:</strong>{" "}
              {coverage && coverage.isCovered ? (
                <span className="text-green-700 font-bold">Yes</span>
              ) : (
                <span className="text-red-700 font-bold">No</span>
              )}
            </li>
            <li>
              <strong>Prior Auth Required:</strong>{" "}
              {coverage && coverage.paRequired ? (
                <span className="text-yellow-700 font-bold">Yes</span>
              ) : (
                <span>No</span>
              )}
            </li>
            <li>
              <strong>Preferred:</strong>{" "}
              {coverage && coverage.preferred ? "Yes" : "No"}
            </li>
            <li>
              <strong>Step Therapy:</strong>{" "}
              {coverage && coverage.stepTherapy ? "Yes" : "No"}
            </li>
          </ul>
          {coverage && coverage.paRequired && coverage.paQuestions.length > 0 && (
            <div className="mt-3">
              <strong>PA Questions:</strong>
              <ul className="list-disc ml-5">
                {coverage.paQuestions.map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}