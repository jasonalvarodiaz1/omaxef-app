import React from 'react';

const PatientInfo = ({ patientData, isDevMode }) => {
  if (!patientData) {
    return (
      <div className="patient-info">
        <p>No patient data available</p>
      </div>
    );
  }

  return (
    <div className="patient-info">
      <h3>Patient Information</h3>
      {isDevMode && <span className="dev-badge">DEV MODE</span>}
      
      <div className="patient-details">
        <div className="detail-row">
          <span className="label">Name:</span>
          <span className="value">{patientData.name}</span>
        </div>
        <div className="detail-row">
          <span className="label">Age:</span>
          <span className="value">{patientData.age}</span>
        </div>
        <div className="detail-row">
          <span className="label">Insurance:</span>
          <span className="value">{patientData.insurance}</span>
        </div>
        {patientData.vitals?.bmi && (
          <div className="detail-row">
            <span className="label">BMI:</span>
            <span className="value">{patientData.vitals.bmi}</span>
          </div>
        )}
      </div>

      {patientData.diagnosis && patientData.diagnosis.length > 0 && (
        <div className="diagnoses">
          <h4>Diagnoses:</h4>
          <ul>
            {patientData.diagnosis.map((dx, idx) => (
              <li key={idx}>{dx}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};

export default PatientInfo;
