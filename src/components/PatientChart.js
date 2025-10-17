import React from "react";

export default function PatientChart({ patient }) {
  if (!patient) {
    return (
      <div className="text-gray-500">No patient selected.</div>
    );
  }
  return (
    <div className="bg-white p-4 rounded shadow">
      <h2 className="text-xl font-bold mb-2">{patient.name}</h2>
      <div className="mb-2"><strong>Age:</strong> {patient.age}</div>
      <div className="mb-2"><strong>Insurance:</strong> {patient.insurance}</div>
      <div className="mb-2"><strong>Diagnoses:</strong> {patient.diagnosis.join(", ")}</div>
      
      <div className="mb-2"><strong>Vitals:</strong>
        {patient.vitals && (
          <ul className="ml-2 inline">
            <li style={{ display: "inline", marginRight: "1em" }}>
              Height: {patient.vitals.height.value} {patient.vitals.height.units}
            </li>
            <li style={{ display: "inline", marginRight: "1em" }}>
              Weight: {patient.vitals.weight.value} {patient.vitals.weight.units}
            </li>
            <li style={{ display: "inline", marginRight: "1em" }}>
              BMI: {patient.vitals.bmi}
            </li>
          </ul>
        )}
      </div>
      
      <div><strong>Labs:</strong>
        {patient.labs && (
          <ul className="ml-2 inline">
            {Object.entries(patient.labs).map(([test, obj]) => (
              <li key={test} style={{ display: "inline", marginRight: "1em" }}>
                {test.toUpperCase()}: {obj.value} {obj.units}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
