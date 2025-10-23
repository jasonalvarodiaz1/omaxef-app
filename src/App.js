// App.js - Unified Epic Integration + EHR UI
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { allDrugs } from './data/allDrugs';
import { drugCoverage } from './data/drugCoverage';
import PatientSidebar from './components/PatientSidebar';
import PatientChart from './components/PatientChart';
import TherapyModal from './components/TherapyModal';
import EpicCallback from './components/EpicCallback';
import { isEpicLaunch, initiateEpicAuth } from './utils/epicAuth';
import { fetchCompletePatientData } from './utils/patientDataFetcher';
import { PatientProvider } from './context/PatientContext';
import './App.css';

// Mock patient data for dev mode
const mockPatientData = {
  demographics: {
    id: 'mock-patient-001',
    name: 'Sarah Johnson',
    age: 52,
    birthDate: '1972-03-15',
    gender: 'female',
    mrn: 'MRN-123456'
  },
  conditions: [
    { id: '1', code: 'E11', display: 'Type 2 Diabetes Mellitus', recordedDate: '2020-01-15' },
    { id: '2', code: 'I10', display: 'Essential Hypertension', recordedDate: '2019-06-20' },
    { id: '3', code: 'E66.9', display: 'Obesity, unspecified', recordedDate: '2018-11-10' }
  ],
  medications: [
    { id: '1', medication: 'Metformin 1000mg', dosage: 'twice daily', status: 'active' },
    { id: '2', medication: 'Lisinopril 10mg', dosage: 'once daily', status: 'active' }
  ],
  labs: [
    { id: '1', code: '39156-5', display: 'BMI', value: 34.2, unit: 'kg/m2', date: '2024-10-15' },
    { id: '2', code: '29463-7', display: 'Body Weight', value: 210, unit: 'lbs', date: '2024-10-15' },
    { id: '3', code: '4548-4', display: 'Hemoglobin A1c', value: 7.8, unit: '%', date: '2024-10-01' }
  ],
  coverage: [
    { id: '1', payor: 'CVS Health (Aetna)', type: 'PPO', subscriberId: 'AET123456789' }
  ],
  calculatedValues: {
    bmi: 34.2,
    weight: { value: 210, unit: 'lbs' },
    hasObesityDiagnosis: true,
    hasDiabetes: true,
    hasHypertension: true
  },
  fetchedAt: new Date().toISOString()
};

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
  const selectedPatient = epicPatientData ? convertEpicToAppFormat(epicPatientData) : null;

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
      setEpicPatientData(mockPatientData);
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
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Dev Mode Banner */}
      {devMode && (
        <div className="bg-yellow-100 border-b border-yellow-300 px-4 py-2 text-sm text-yellow-800">
          <strong>Dev Mode:</strong> Using mock patient data. Remove ?dev=true for Epic integration.
        </div>
      )}

      {/* Error Banner */}
      {authError && !devMode && (
        <div className="bg-red-100 border-b-2 border-red-400 px-6 py-3 flex items-center justify-between">
          <div className="flex-1">
            <strong className="text-red-800">Error:</strong>
            <span className="text-red-700 ml-2">{authError.message || authError.error}</span>
            {authError.error === 'not_epic_launch' && (
              <button 
                onClick={enableDevMode}
                className="ml-4 bg-yellow-500 text-white px-4 py-1 rounded hover:bg-yellow-600 font-semibold"
              >
                Enable Dev Mode
              </button>
            )}
          </div>
          <button onClick={clearError} className="text-red-800 text-2xl font-bold hover:text-red-600">×</button>
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
                className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-gray-100"
              >
                Use Dev Mode Instead
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="flex flex-row flex-1">
          {/* Sidebar */}
          <PatientSidebar 
            onPatientDataLoaded={handlePatientDataLoaded}
            devMode={devMode}
            mockData={devMode ? mockPatientData : null}
          />
          
          {/* Main content */}
          <main className="flex-1 flex flex-col items-center py-8 overflow-y-auto">
            <header className="bg-blue-900 text-white py-4 px-8 shadow w-full mb-2 flex justify-between items-center">
              <h1 className="text-2xl font-bold tracking-wide">Electronic Health Record</h1>
            </header>
            
            {selectedPatient && (
              <>
                <nav className="flex space-x-0 mb-6 w-full max-w-2xl border-b border-gray-300">
                  {tabNames.map(tab => (
                    <button
                      key={tab}
                      className={`px-5 py-2 font-semibold border-r border-gray-300 focus:outline-none ${
                        activeTab === tab 
                          ? 'bg-white text-blue-900 border-t-2 border-blue-900' 
                          : 'bg-gray-100 text-gray-700'
                      }`}
                      onClick={() => setActiveTab(tab)}
                    >
                      {tab}
                    </button>
                  ))}
                </nav>
                
                <div className="w-full max-w-2xl">
                  {activeTab === 'Summary' && (
                    <div>
                      <PatientChart patient={selectedPatient} />
                      <div className="bg-white p-4 rounded shadow mt-4">
                        <h2 className="text-xl font-bold mb-2">Allergies</h2>
                        {selectedPatient.allergies && selectedPatient.allergies.length > 0 ? (
                          <ul className="list-disc ml-6">
                            {selectedPatient.allergies.map((allergy, idx) => (
                              <li key={idx}>{allergy}</li>
                            ))}
                          </ul>
                        ) : (
                          <div className="text-gray-500">None</div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'Medications' && (
                    <div className="bg-white p-4 rounded shadow mt-4">
                      <h2 className="text-xl font-bold mb-2">Medications</h2>
                      {selectedPatient.medications && selectedPatient.medications.length > 0 ? (
                        <ul className="list-disc ml-6">
                          {selectedPatient.medications.map((med, idx) => (
                            <li key={idx}>
                              <span className="font-bold">{med.name}</span> — {med.dose}<br />
                              <span className="text-gray-700 italic">{med.sig}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div className="text-gray-500">No medications listed.</div>
                      )}
                      <button
                        className="mt-6 px-6 py-2 bg-blue-700 text-white rounded shadow font-bold hover:bg-blue-800 transition"
                        onClick={() => setTherapyModalOpen(true)}
                      >
                        Initiate Therapy
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'Results' && (
                    <div className="bg-white p-4 rounded shadow mt-4">
                      <h2 className="text-xl font-bold mb-2">Lab Results</h2>
                      {selectedPatient.labs ? (
                        <table className="min-w-full text-left">
                          <thead>
                            <tr>
                              <th className="pr-4">Test</th>
                              <th className="pr-4">Value</th>
                              <th className="pr-4">Units</th>
                            </tr>
                          </thead>
                          <tbody>
                            {Object.entries(selectedPatient.labs).map(([test, obj]) => (
                              <tr key={test}>
                                <td className="pr-4 font-semibold">{test.toUpperCase()}</td>
                                <td className="pr-4">{obj.value}</td>
                                <td className="pr-4">{obj.units}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      ) : (
                        <div className="text-gray-500">No lab results available.</div>
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

function App() {
  return (
    <PatientProvider>
      <Router>
        <Routes>
          <Route path="/callback" element={<EpicCallback />} />
          <Route path="/" element={<AppContent />} />
        </Routes>
      </Router>
    </PatientProvider>
  );
}

export default App;