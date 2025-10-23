import React, { useState, useEffect, useCallback } from 'react';
import { fetchCompletePatientData } from '../utils/patientDataFetcher';
import './PatientSidebar.css';

const PatientSidebar = ({ onPatientDataLoaded, devMode = false, mockData = null }) => {
  const [patientData, setPatientData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [isConnected, setIsConnected] = useState(false);

  const loadPatientData = useCallback(async () => {
    // Dev mode: use mock data immediately
    if (devMode && mockData) {
      console.log('🔧 Loading mock patient data in dev mode');
      setPatientData(mockData);
      if (onPatientDataLoaded) {
        onPatientDataLoaded(mockData);
      }
      return;
    }

    // Production mode: fetch from Epic
    setLoading(true);
    setError(null);

    try {
      const patientId = sessionStorage.getItem('epic_patient_id');

      if (!patientId) {
        throw new Error('No patient ID available. Check Epic launch context.');
      }

      console.log('📡 Fetching patient data from Epic for patient:', patientId);
      const data = await fetchCompletePatientData(patientId);
      setPatientData(data);

      if (onPatientDataLoaded) {
        onPatientDataLoaded(data);
      }

      console.log('✅ Patient data loaded successfully:', data);
    } catch (err) {
      console.error('❌ Error loading patient data:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [devMode, mockData, onPatientDataLoaded]);

  useEffect(() => {
    // Dev mode: load mock data immediately
    if (devMode && mockData) {
      setIsConnected(true);
      loadPatientData();
      return;
    }

    // Production mode: check for Epic token
    const accessToken = sessionStorage.getItem('epic_access_token');
    const patientId = sessionStorage.getItem('epic_patient_id');

    setIsConnected(!!accessToken);

    if (accessToken && patientId && !patientData) {
      loadPatientData();
    }
  }, [devMode, mockData, patientData, loadPatientData]);

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString();
  };

  const getConnectionStatus = () => {
    if (devMode) {
      return { text: 'Dev Mode (Mock Data)', className: 'status-connected' };
    }
    if (!isConnected) {
      return { text: 'Not Connected', className: 'status-disconnected' };
    }
    if (patientData) {
      return { text: 'Connected & Loaded', className: 'status-connected' };
    }
    return { text: 'Connected', className: 'status-connected' };
  };

  const status = getConnectionStatus();

  return (
    <div className="patient-sidebar">
      <div className="sidebar-header">
        <h2>Patient Information</h2>
        <div className={`connection-status ${status.className}`}>
          <span className="status-indicator"></span>
          {status.text}
        </div>
      </div>

      {error && (
        <div className="error-message">
          <strong>Error:</strong> {error}
        </div>
      )}

      {!patientData && isConnected && !loading && !devMode && (
        <button 
          className="load-button"
          onClick={loadPatientData}
        >
          Load Patient Data
        </button>
      )}

      {loading && (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading patient data from Epic...</p>
        </div>
      )}

      {patientData && (
        <div className="patient-details">
          <section className="detail-section">
            <h3>Demographics</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">Name:</span>
                <span className="value">{patientData.demographics.name}</span>
              </div>
              <div className="detail-item">
                <span className="label">Age:</span>
                <span className="value">{patientData.demographics.age} years</span>
              </div>
              <div className="detail-item">
                <span className="label">DOB:</span>
                <span className="value">{formatDate(patientData.demographics.birthDate)}</span>
              </div>
              <div className="detail-item">
                <span className="label">Gender:</span>
                <span className="value">{patientData.demographics.gender}</span>
              </div>
              <div className="detail-item">
                <span className="label">MRN:</span>
                <span className="value">{patientData.demographics.mrn || 'N/A'}</span>
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h3>Clinical Metrics</h3>
            <div className="detail-grid">
              <div className="detail-item">
                <span className="label">BMI:</span>
                <span className="value highlight">
                  {patientData.calculatedValues.bmi?.toFixed(1) || 'N/A'}
                </span>
              </div>
              <div className="detail-item">
                <span className="label">Weight:</span>
                <span className="value">
                  {patientData.calculatedValues.weight 
                    ? `${patientData.calculatedValues.weight.value} ${patientData.calculatedValues.weight.unit}`
                    : 'N/A'}
                </span>
              </div>
            </div>
            
            {/* Key Diagnoses Badges */}
            <div className="key-diagnoses">
              <div className={`diagnosis-badge ${patientData.calculatedValues.hasDiabetes ? 'present' : 'absent'}`}>
                {patientData.calculatedValues.hasDiabetes ? '✓' : '○'} Diabetes
              </div>
              <div className={`diagnosis-badge ${patientData.calculatedValues.hasObesityDiagnosis ? 'present' : 'absent'}`}>
                {patientData.calculatedValues.hasObesityDiagnosis ? '✓' : '○'} Obesity
              </div>
              <div className={`diagnosis-badge ${patientData.calculatedValues.hasHypertension ? 'present' : 'absent'}`}>
                {patientData.calculatedValues.hasHypertension ? '✓' : '○'} Hypertension
              </div>
            </div>
          </section>

          <section className="detail-section">
            <h3>Active Conditions ({patientData.conditions.length})</h3>
            <div className="conditions-list">
              {patientData.conditions.length === 0 ? (
                <p className="empty-state">No active conditions recorded</p>
              ) : (
                <ul>
                  {patientData.conditions.slice(0, 5).map(condition => (
                    <li key={condition.id} className="condition-item">
                      <span className="condition-name">{condition.display}</span>
                      <span className="condition-date">{formatDate(condition.recordedDate)}</span>
                    </li>
                  ))}
                  {patientData.conditions.length > 5 && (
                    <li className="more-items">
                      +{patientData.conditions.length - 5} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>

          <section className="detail-section">
            <h3>Active Medications ({patientData.medications.length})</h3>
            <div className="medications-list">
              {patientData.medications.length === 0 ? (
                <p className="empty-state">No active medications</p>
              ) : (
                <ul>
                  {patientData.medications.slice(0, 5).map(med => (
                    <li key={med.id} className="medication-item">
                      <span className="med-name">{med.medication}</span>
                      {med.dosage && <span className="med-dosage">{med.dosage}</span>}
                    </li>
                  ))}
                  {patientData.medications.length > 5 && (
                    <li className="more-items">
                      +{patientData.medications.length - 5} more
                    </li>
                  )}
                </ul>
              )}
            </div>
          </section>

          {patientData.coverage && patientData.coverage.length > 0 && (
            <section className="detail-section">
              <h3>Coverage</h3>
              <div className="coverage-list">
                {patientData.coverage.map(cov => (
                  <div key={cov.id} className="coverage-item">
                    <div className="coverage-payor">{cov.payor}</div>
                    <div className="coverage-type">{cov.type}</div>
                    {cov.subscriberId && (
                      <div className="coverage-id">ID: {cov.subscriberId}</div>
                    )}
                  </div>
                ))}
              </div>
            </section>
          )}

          <div className="data-timestamp">
            Last updated: {formatDate(patientData.fetchedAt)}
          </div>
        </div>
      )}

      {!isConnected && !devMode && (
        <div className="not-connected-message">
          <p>App must be launched from Epic EHR to access patient data.</p>
        </div>
      )}
    </div>
  );
};

export default PatientSidebar;
