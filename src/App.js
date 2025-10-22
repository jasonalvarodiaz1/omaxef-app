// App.js - Main application component
import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import PatientSidebar from './components/PatientSidebar';
import CoverageDisplay from './components/CoverageDisplay';
import EpicCallback from './components/EpicCallback';
import { isEpicLaunch, initiateEpicAuth } from './utils/epicAuth';
import './App.css';

function App() {
  const [patientData, setPatientData] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [authError, setAuthError] = useState(null);

  useEffect(() => {
    // Check if we're in the OAuth callback
    if (window.location.pathname === '/callback') {
      return; // Let EpicCallback component handle this
    }

    // Check for authentication
    const accessToken = sessionStorage.getItem('epic_access_token');
    const authSuccess = sessionStorage.getItem('epic_auth_success');
    
    if (accessToken && authSuccess) {
      setIsAuthenticated(true);
      
      // Check for any auth errors
      const error = sessionStorage.getItem('epic_error');
      if (error) {
        try {
          const errorData = JSON.parse(error);
          setAuthError(errorData);
        } catch (e) {
          console.error('Error parsing auth error:', e);
        }
      }
    } else if (isEpicLaunch()) {
      // This is a launch from Epic, but not authenticated yet
      console.log('Epic launch detected, initiating authentication...');
      try {
        initiateEpicAuth();
      } catch (error) {
        console.error('Error initiating Epic auth:', error);
        setAuthError({ error: 'auth_init_failed', message: error.message });
      }
    } else {
      // Not a launch from Epic
      console.warn('App must be launched from Epic EHR');
      setAuthError({ 
        error: 'not_epic_launch', 
        message: 'This application must be launched from Epic EHR' 
      });
    }
  }, []);

  const handlePatientDataLoaded = (data) => {
    console.log('Patient data loaded in App:', data);
    setPatientData(data);
  };

  const clearError = () => {
    sessionStorage.removeItem('epic_error');
    setAuthError(null);
  };

  return (
    <Router>
      <Routes>
        <Route path="/callback" element={<EpicCallback />} />
        <Route 
          path="/" 
          element={
            <div className="app">
              {authError && (
                <div className="app-error-banner">
                  <div className="error-content">
                    <strong>Error:</strong> {authError.message || authError.error}
                    {authError.error_description && (
                      <div className="error-description">{authError.error_description}</div>
                    )}
                  </div>
                  <button onClick={clearError} className="error-dismiss">×</button>
                </div>
              )}

              {isAuthenticated ? (
                <div className="app-container">
                  <PatientSidebar onPatientDataLoaded={handlePatientDataLoaded} />
                  <main className="main-content">
                    <CoverageDisplay patientData={patientData} />
                  </main>
                </div>
              ) : (
                <div className="loading-screen">
                  <div className="loading-content">
                    <div className="spinner-large"></div>
                    <h2>Connecting to Epic...</h2>
                    <p>Please wait while we authenticate with Epic EHR</p>
                  </div>
                </div>
              )}
            </div>
          } 
        />
      </Routes>
    </Router>
  );
}

export default App;