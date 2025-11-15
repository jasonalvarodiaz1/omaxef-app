import React, { useEffect } from 'react';

const EHRInterface = ({ onPatientDataUpdate, isAuthenticated }) => {
  useEffect(() => {
    if (isAuthenticated) {
      // Simulate loading patient data from EHR
      const mockPatientData = {
        id: 'EHR-001',
        name: 'EHR Patient',
        age: 45,
        insurance: 'Blue Cross',
        vitals: {
          bmi: 32.5,
          weight: { value: 220, units: 'lbs' }
        },
        diagnosis: ['Type 2 Diabetes', 'Obesity']
      };
      
      onPatientDataUpdate(mockPatientData);
    }
  }, [isAuthenticated, onPatientDataUpdate]);

  return (
    <div className="ehr-interface">
      <h3>EHR Integration</h3>
      {isAuthenticated ? (
        <div className="ehr-status">
          <span className="status-indicator connected"></span>
          <span>Connected to EHR</span>
        </div>
      ) : (
        <div className="ehr-status">
          <span className="status-indicator disconnected"></span>
          <span>Not Connected</span>
        </div>
      )}
    </div>
  );
};

export default EHRInterface;
