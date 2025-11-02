// App.js - Unified Epic Integration + EHR UI with Patient Selection
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { ThemeProvider } from '@mui/material/styles';
import CssBaseline from '@mui/material/CssBaseline';
import { darkTheme } from './theme';
import { allDrugs } from './data/allDrugs';
import { drugCoverage } from './data/drugCoverage';
import { patients as mockPatients } from './data/patients';
import PatientSidebar from './components/PatientSidebar';
import PatientChart from './components/PatientChart';
import TherapyModal from './components/TherapyModal';
import EpicCallback from './components/EpicCallback';
import { isEpicLaunch, initiateEpicAuth } from './utils/epicAuth';
import { fetchCompletePatientData } from './utils/patientDataFetcher';
import './App.css';

// Convert Epic patient data to app format
const convertEpicToAppFormat = (epicData) => {
  if (!epicData) return null;
  
  return {
    id: epicData.demographics.id,
    name: epicData.demographics.name,
    age: epicData.demographics.age,
    insurance: epicData.coverage?.[0]?.payor || 'Unknown',
    diagnosis: epicData.conditions.map(c => c.display),
    allergies: [], // TODO: Add if needed
    vitals: {
      height: epicData.calculatedValues?.height || { value: 65, units: 'in' },
      weight: epicData.calculatedValues?.weight || { value: 210, units: 'lbs' },
      bmi: epicData.calculatedValues?.bmi || 34.2
    },
    labs: {
      a1c: epicData.labs.find(l => l.code === '4548-4') 
        ? { value: epicData.labs.find(l => l.code === '4548-4').value, units: '%' }
        : { value: 7.8, units: '%' },
      bmi: { value: epicData.calculatedValues?.bmi || 34.2, units: 'kg/m2' }
    },
    medications: epicData.medications.map(m => ({
      name: m.medication,
      dose: m.dosage || '',
      sig: m.dosage || 'As directed'
    })),
    clinicalNotes: {
      hasWeightProgram: false,
      baselineWeight: epicData.calculatedValues?.weight || { value: 210, units: 'lbs' },
      currentWeight: epicData.calculatedValues?.weight || { value: 210, units: 'lbs' },
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: []
  };
};

function AppContent() {
  // Epic integration state
  const [epicPatientData, setEpicPatientData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);
  const [devMode, setDevMode] = useState(false);
  const location = useLocation();
  
  // Patient selection state (for dev mode)
  const [selectedPatientId, setSelectedPatientId] = useState('');
  const [patientSearch, setPatientSearch] = useState('');
  const [patients, setPatients] = useState(mockPatients);
  
  // EHR UI state
  const [activeTab, setActiveTab] = useState('Summary');
  const [therapyModalOpen, setTherapyModalOpen] = useState(false);
  const [drugSearch, setDrugSearch] = useState('');
  const [selectedDrugId, setSelectedDrugId] = useState(null);
  const [therapySubmitted, setTherapySubmitted] = useState(false);
  const [selectedDose, setSelectedDose] = useState('');
  
  // PA form state
  const [paFormOpen, setPaFormOpen] = useState(false);
  const [paFormSubmitted, setPaFormSubmitted] = useState(false);
  const [paFormData, setPaFormData] = useState({
    paReason: '',
    therapyDuration: '',
    weightLoss: '',
    weightMaintained: '',
    weightProgram: '',
    bmi: '',
    comorbidities: [],
    pediatricPercentile: '',
    maintenanceDose: '',
    bmiReduction: '',
    docUpload: ''
  });

  // Converted patient for app components
  const selectedPatient = devMode 
    ? (selectedPatientId ? patients.find(p => p.id === selectedPatientId) : null)
    : (epicPatientData ? convertEpicToAppFormat(epicPatientData) : null);

  // Store patient globally for TherapyModal and PAForm to access
  useEffect(() => {
    if (selectedPatient) {
      window.__selectedPatient = selectedPatient;
    }
  }, [selectedPatient]);

  // Update BMI in PA form when patient changes
  useEffect(() => {
    if (selectedPatient?.vitals?.bmi) {
      setPaFormData(prev => ({ ...prev, bmi: selectedPatient.vitals.bmi.toString() }));
    }
  }, [selectedPatient]);

  // Epic authentication logic
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const isDevMode = urlParams.get('dev') === 'true';
    
    if (isDevMode) {
      console.log('🔧 DEV MODE: Using mock patient data');
      setDevMode(true);
      setIsAuthenticated(true);
      // Auto-select first patient in dev mode
      if (!selectedPatientId && mockPatients.length > 0) {
        setSelectedPatientId(mockPatients[0].id);
      }
      return;
    }

    if (location.pathname === '/callback') {
      return;
    }

    const accessToken = sessionStorage.getItem('epic_access_token');
    const authSuccess = sessionStorage.getItem('epic_auth_success');
    
    if (accessToken && authSuccess) {
      setIsAuthenticated(true);
      
      // Load patient data if not already loaded
      const patientId = sessionStorage.getItem('epic_patient_id');
      if (patientId && !epicPatientData) {
        loadEpicPatientData(patientId);
      }
      
      const error = sessionStorage.getItem('epic_error');
      if (error) {
        try {
          setAuthError(JSON.parse(error));
        } catch (e) {
          console.error('Error parsing auth error:', e);
        }
      }
    } else if (isEpicLaunch()) {
      console.log('🚀 Epic launch detected, initiating authentication...');
      try {
        initiateEpicAuth();
      } catch (error) {
        console.error('Error initiating Epic auth:', error);
        setAuthError({ error: 'auth_init_failed', message: error.message });
      }
    } else {
      console.warn('⚠️ App must be launched from Epic EHR');
      setAuthError({ 
        error: 'not_epic_launch', 
        message: 'This application must be launched from Epic EHR' 
      });
    }
  }, [location.pathname, epicPatientData]);

  const loadEpicPatientData = async (patientId) => {
    try {
      console.log('📡 Fetching patient data from Epic...');
      const data = await fetchCompletePatientData(patientId);
      setEpicPatientData(data);
      console.log('✅ Patient data loaded:', data);
    } catch (error) {
      console.error('❌ Error loading patient data:', error);
      setAuthError({ error: 'data_fetch_failed', message: error.message });
    }
  };

  const handlePatientDataLoaded = (data) => {
    console.log('📊 Patient data loaded in App:', data);
    setEpicPatientData(data);
  };

  const clearError = () => {
    sessionStorage.removeItem('epic_error');
    setAuthError(null);
  };

  const enableDevMode = () => {
    window.location.href = '/?dev=true';
  };

  const tabNames = ['Summary', 'Medications', 'Results'];

  return (
    <div className="min-h-screen bg-slate-900 flex flex-col">
      {/* Dev Mode Banner */}
      {devMode && (
        <div className="bg-yellow-900 border-b border-yellow-700 px-4 py-2 text-sm text-yellow-200">
          <strong>Dev Mode:</strong> Using mock patient data. Remove ?dev=true for Epic integration.
        </div>
      )}

      {/* Error Banner */}
      {authError && !devMode && (
        <div className="bg-red-900 border-b-2 border-red-700 px-6 py-3 flex items-center justify-between">
          <div className="flex-1">
            <strong className="text-red-200">Error:</strong>
            <span className="text-red-300 ml-2">{authError.message || authError.error}</span>
            {authError.error === 'not_epic_launch' && (
              <button 
                onClick={enableDevMode}
                className="ml-4 bg-yellow-600 text-white px-4 py-1 rounded hover:bg-yellow-500 font-semibold"
              >
                Enable Dev Mode
              </button>
            )}
          </div>
          <button onClick={clearError} className="text-red-200 text-2xl font-bold hover:text-red-400">×</button>
        </div>
      )}

      {!isAuthenticated ? (
        <div className="flex-1 flex items-center justify-center bg-gradient-to-br from-blue-500 to-purple-600">
          <div className="text-center text-white">
            <div className="spinner-large mb-6"></div>
            <h2 className="text-2xl font-bold mb-2">Connecting to Epic...</h2>
            <p className="mb-4">Please wait while we authenticate with Epic EHR</p>
            {authError && authError.error === 'not_epic_launch' && (
              <button 
                onClick={enableDevMode}
                className="bg-slate-800 text-blue-400 px-6 py-3 rounded-lg font-semibold hover:bg-slate-700"
              >
                Use Dev Mode Instead
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-row flex-1">
          {/* Sidebar with Patient Selection */}
          {devMode ? (
            <div className="patient-sidebar" style={{ width: '350px', height: '100vh', background: '#1e293b', borderRight: '1px solid #334155', overflowY: 'auto', padding: '1.5rem' }}>
              {/* Header with Patient Selector */}
              <div className="sidebar-header" style={{ marginBottom: '1.5rem' }}>
                <h2 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', color: '#e2e8f0' }}>Patient Information</h2>
                <div className="connection-status status-connected" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.875rem', padding: '0.5rem', borderRadius: '6px', fontWeight: '500', background: '#78350f', color: '#fcd34d' }}>
                  <span className="status-indicator" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f59e0b', boxShadow: '0 0 4px rgba(245, 158, 11, 0.6)' }}></span>
                  Dev Mode (Mock Data)
                </div>
              </div>

              {/* Patient Search & Selector */}
              <div style={{ marginBottom: '1.5rem' }}>
                <input
                  type="text"
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #475569', borderRadius: '6px', marginBottom: '0.5rem', background: '#0f172a', color: '#e2e8f0' }}
                  placeholder="Search patients..."
                  value={patientSearch}
                  onChange={e => setPatientSearch(e.target.value)}
                />
                <select
                  style={{ width: '100%', padding: '0.5rem', border: '1px solid #475569', borderRadius: '6px', background: '#0f172a' }}
                  value={selectedPatientId}
                  onChange={e => {
                    setSelectedPatientId(e.target.value);
                    setPatientSearch('');
                  }}
                >
                  <option value="">Choose a patient</option>
                  {patients.filter(p =>
                    p.name.toLowerCase().includes(patientSearch.toLowerCase())
                  ).map(p => (
                    <option key={p.id} value={p.id}>{p.name}</option>
                  ))}
                </select>
              </div>

              {/* Patient Details */}
              {selectedPatient && (
                <div className="patient-details" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                  <section className="detail-section" style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)', border: '1px solid #334155' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.5rem' }}>Demographics</h3>
                    <div className="detail-grid" style={{ display: 'grid', gap: '0.75rem' }}>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>Name:</span>
                        <span className="value" style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>{selectedPatient.name}</span>
                      </div>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>Age:</span>
                        <span className="value" style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>{selectedPatient.age} years</span>
                      </div>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>Gender:</span>
                        <span className="value" style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>{selectedPatient.gender || 'N/A'}</span>
                      </div>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>Insurance:</span>
                        <span className="value" style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>{selectedPatient.insurance}</span>
                      </div>
                    </div>
                  </section>

                  <section className="detail-section" style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.5rem' }}>Clinical Metrics</h3>
                    <div className="detail-grid" style={{ display: 'grid', gap: '0.75rem' }}>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0', borderBottom: '1px solid #1e293b' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>BMI:</span>
                        <span className="value highlight" style={{ color: '#0d6efd', fontWeight: '600', fontSize: '1rem' }}>
                          {selectedPatient.vitals?.bmi?.toFixed?.(1) || selectedPatient.vitals?.bmi || 'N/A'}
                        </span>
                      </div>
                      <div className="detail-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem 0' }}>
                        <span className="label" style={{ fontWeight: '500', color: '#94a3b8', fontSize: '0.875rem' }}>Weight:</span>
                        <span className="value" style={{ color: '#e2e8f0', fontWeight: '500', fontSize: '0.875rem' }}>
                          {selectedPatient.vitals?.weight?.value} {selectedPatient.vitals?.weight?.units}
                        </span>
                      </div>
                    </div>
                  </section>

                  <section className="detail-section" style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.5rem' }}>Active Conditions ({selectedPatient.diagnosis?.length || 0})</h3>
                    <div className="conditions-list">
                      {selectedPatient.diagnosis && selectedPatient.diagnosis.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                          {selectedPatient.diagnosis.slice(0, 5).map((diagnosis, idx) => (
                            <li key={idx} className="condition-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #1e293b', fontSize: '0.875rem' }}>
                              <span className="condition-name" style={{ flex: '1', color: '#e2e8f0', fontWeight: '500' }}>{diagnosis}</span>
                            </li>
                          ))}
                          {selectedPatient.diagnosis.length > 5 && (
                            <li className="more-items" style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '0.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                              +{selectedPatient.diagnosis.length - 5} more
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="empty-state" style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No active conditions recorded</p>
                      )}
                    </div>
                  </section>

                  <section className="detail-section" style={{ background: '#0f172a', borderRadius: '8px', padding: '1rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                    <h3 style={{ margin: '0 0 0.75rem 0', fontSize: '1rem', color: '#94a3b8', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.5rem' }}>Active Medications ({selectedPatient.medications?.length || 0})</h3>
                    <div className="medications-list">
                      {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: '0', margin: '0' }}>
                          {selectedPatient.medications.slice(0, 5).map((med, idx) => (
                            <li key={idx} className="medication-item" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.5rem', borderBottom: '1px solid #1e293b', fontSize: '0.875rem' }}>
                              <span className="med-name" style={{ flex: '1', color: '#e2e8f0', fontWeight: '500' }}>{med.name}</span>
                              {med.dose && <span className="med-dosage" style={{ color: '#94a3b8', fontSize: '0.75rem', fontStyle: 'italic' }}>{med.dose}</span>}
                            </li>
                          ))}
                          {selectedPatient.medications.length > 5 && (
                            <li className="more-items" style={{ color: '#94a3b8', fontSize: '0.8rem', padding: '0.5rem', textAlign: 'center', fontStyle: 'italic' }}>
                              +{selectedPatient.medications.length - 5} more
                            </li>
                          )}
                        </ul>
                      ) : (
                        <p className="empty-state" style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No active medications</p>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          ) : (
            <PatientSidebar 
              onPatientDataLoaded={handlePatientDataLoaded}
              devMode={false}
              mockData={null}
            />
          )}
          
          {/* Main content */}
          <main className="flex-1 flex flex-col overflow-y-auto" style={{ background: '#1e293b' }}>
            <header style={{ background: '#0f172a', borderBottom: '1px solid #334155', padding: '1.5rem 2rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.3)' }}>
              <h1 style={{ margin: '0', fontSize: '1.75rem', fontWeight: '600', color: '#e2e8f0' }}>Electronic Health Record</h1>
            </header>
            
            {selectedPatient && (
              <>
                <nav style={{ background: '#0f172a', borderBottom: '1px solid #334155', display: 'flex', padding: '0 2rem' }}>
                  {tabNames.map(tab => (
                    <button
                      key={tab}
                      style={{
                        padding: '1rem 1.5rem',
                        fontWeight: '500',
                        fontSize: '0.95rem',
                        border: 'none',
                        background: activeTab === tab ? '#1e293b' : 'transparent',
                        color: activeTab === tab ? '#60a5fa' : '#94a3b8',
                        borderBottom: activeTab === tab ? '3px solid #60a5fa' : '3px solid transparent',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        outline: 'none'
                      }}
                      onClick={() => setActiveTab(tab)}
                      onMouseEnter={(e) => {
                        if (activeTab !== tab) {
                          e.target.style.background = '#1e293b';
                          e.target.style.color = '#cbd5e1';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (activeTab !== tab) {
                          e.target.style.background = 'transparent';
                          e.target.style.color = '#6c757d';
                        }
                      }}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
                
                <div style={{ padding: '2rem', maxWidth: '900px', margin: '0 auto', width: '100%' }}>
                  {activeTab === 'Summary' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
                      <PatientChart patient={selectedPatient} />
                      <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                        <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#e2e8f0', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.75rem' }}>Allergies</h2>
                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                          <ul style={{ listStyle: 'none', padding: '0', margin: '0', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {selectedPatient.allergies.map((allergy, idx) => (
                              <li key={idx} style={{ padding: '0.75rem', background: '#fff3cd', border: '1px solid #ffc107', borderRadius: '6px', color: '#856404', fontWeight: '500', fontSize: '0.875rem' }}>
                                ⚠️ {allergy}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No known allergies</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'Medications' && (
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#e2e8f0', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.75rem' }}>Medications</h2>
                      {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
                        <ul style={{ listStyle: 'none', padding: '0', margin: '0', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {selectedPatient.medications.map((med, idx) => (
                            <li key={idx} style={{ padding: '1rem', background: '#1e293b', borderRadius: '6px', border: '1px solid #334155' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.5rem' }}>
                                <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '0.95rem' }}>{med.name}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontWeight: '500' }}>{med.dose}</span>
                              </div>
                              <span style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic' }}>{med.sig}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No medications listed.</div>
                      )}
                      <button
                        style={{ marginTop: '1.5rem', padding: '0.75rem 1.5rem', background: '#0d6efd', color: 'white', border: 'none', borderRadius: '6px', fontSize: '1rem', fontWeight: '500', cursor: 'pointer', width: '100%', transition: 'background 0.2s' }}
                        onClick={() => setTherapyModalOpen(true)}
                        onMouseEnter={(e) => e.target.style.background = '#0b5ed7'}
                        onMouseLeave={(e) => e.target.style.background = '#0d6efd'}
                      >
                        Initiate Therapy
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'Results' && (
                    <div style={{ background: '#0f172a', borderRadius: '8px', padding: '1.5rem', boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)' }}>
                      <h2 style={{ margin: '0 0 1rem 0', fontSize: '1.25rem', color: '#e2e8f0', fontWeight: '600', borderBottom: '2px solid #334155', paddingBottom: '0.75rem' }}>Lab Results</h2>
                      {selectedPatient.labs ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                          {Object.entries(selectedPatient.labs).map(([test, obj]) => (
                            <div key={test} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: '#1e293b', borderRadius: '6px', border: '1px solid #334155' }}>
                              <span style={{ fontWeight: '600', color: '#94a3b8', fontSize: '0.95rem', textTransform: 'uppercase' }}>{test}</span>
                              <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'baseline' }}>
                                <span style={{ fontWeight: '600', color: '#e2e8f0', fontSize: '1.1rem' }}>{obj.value}</span>
                                <span style={{ color: '#94a3b8', fontSize: '0.875rem' }}>{obj.units}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div style={{ color: '#94a3b8', fontSize: '0.875rem', fontStyle: 'italic', textAlign: 'center', padding: '1rem 0' }}>No lab results available.</div>
                      )}
                    </div>
                  )}
                </div>
              </>
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
          </main>
        </div>
      )}
    </div>
  );
}

// Update logo to use the provided omaxef logo
const Logo = () => (
  <div style={{
    position: 'fixed',
    bottom: '20px',
    right: '20px',
    zIndex: 1000,
  }}>
    <img src="/omaxef-logo.png" alt="Omaxef Logo" style={{ width: '50px', height: '50px' }} />
  </div>
);

function App() {
  return (
    <ThemeProvider theme={darkTheme}>
      <CssBaseline />
      <Router>
        <div className="App">
          <Routes>
            <Route path="/callback" element={<EpicCallback />} />
            <Route path="/" element={<AppContent />} />
          </Routes>
          <Logo />
        </div>
      </Router>
    </ThemeProvider>
  );
}

export default App;