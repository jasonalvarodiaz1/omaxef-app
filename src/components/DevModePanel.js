import React, { useState } from 'react';

const DevModePanel = ({ patientData, medication, dose, onPatientDataUpdate, useEnhancedMode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="dev-mode-panel">
      <button 
        className="toggle-panel"
        onClick={() => setIsOpen(!isOpen)}
      >
        {isOpen ? '▼' : '▲'} Dev Tools
      </button>

      {isOpen && (
        <div className="panel-content">
          <h4>Development Information</h4>
          
          <div className="dev-section">
            <h5>Current State:</h5>
            <ul>
              <li>Patient: {patientData?.name || 'None'}</li>
              <li>Medication: {medication || 'None'}</li>
              <li>Dose: {dose || 'None'}</li>
              <li>Enhanced Mode: {useEnhancedMode ? 'ON' : 'OFF'}</li>
            </ul>
          </div>

          <div className="dev-section">
            <h5>Patient Data:</h5>
            <pre>{JSON.stringify(patientData, null, 2)}</pre>
          </div>

          <div className="dev-actions">
            <button onClick={() => console.log('Patient Data:', patientData)}>
              Log Patient Data
            </button>
            <button onClick={() => window.location.href = '/'}>
              Exit Dev Mode
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default DevModePanel;
