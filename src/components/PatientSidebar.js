import React from "react";
import { usePatient } from "../context/PatientContext";

export default function PatientSidebar() {
  const { 
    selectedPatient: patient,
    patients,
    patientSearch,
    setPatientSearch,
    selectedPatientId,
    setSelectedPatientId
  } = usePatient();
  
  return (
    <aside className="w-72 bg-gray-200 border-r border-gray-400 flex flex-col p-4 shadow-lg">
      {/* Patient photo silhouette */}
      {patient && (
        <div className="flex justify-center mb-4">
          <div className="w-20 h-20 rounded-full bg-gray-400 flex items-center justify-center">
            {/* SVG silhouette icon */}
            <span>
              <svg width="48" height="48" viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="24" cy="16" r="10" fill="#b0b0b0" />
                <ellipse cx="24" cy="36" rx="14" ry="8" fill="#b0b0b0" />
              </svg>
            </span>
          </div>
        </div>
      )}
      <input
        type="text"
        className="border p-2 rounded w-full mb-2"
        placeholder="Search patients..."
        value={patientSearch}
        onChange={e => setPatientSearch(e.target.value)}
      />
      <select
        className="border p-2 rounded w-full bg-white text-gray-900"
        value={selectedPatientId}
        onChange={e => {
          setSelectedPatientId(e.target.value);
          setPatientSearch("");
        }}
      >
        <option value="">Choose a patient</option>
        {patients.filter(p =>
          p.name.toLowerCase().includes(patientSearch.toLowerCase())
        ).map(p => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      {patient && (
        <div className="bg-white rounded shadow p-4 mb-6 mt-4">
          <div className="font-bold text-lg mb-2">{patient.name}</div>
          <div className="mb-1 text-sm"><strong>Insurance:</strong> {patient.insurance}</div>
          <div className="mb-1 text-sm"><strong>Diagnoses:</strong> {patient.diagnosis.join(", ")}</div>
          <div className="mb-1 text-sm"><strong>Allergies:</strong> {patient.allergies && patient.allergies.length > 0 ? patient.allergies.join(", ") : "None"}</div>
          <div className="mb-1 text-sm"><strong>Labs:</strong>
            {patient.labs && (
              <ul className="ml-2">
                {Object.entries(patient.labs).map(([test, obj]) => (
                  <li key={test}>
                    {test.toUpperCase()}: {obj.value} {obj.units}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}
