import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const EpicCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const state = urlParams.get('state');
        const error = urlParams.get('error');

        // Handle error responses
        if (error) {
          console.error('Epic OAuth Error:', error);
          const errorDescription = urlParams.get('error_description');
          sessionStorage.setItem('epic_error', JSON.stringify({ error, errorDescription }));
          navigate('/');
          return;
        }

        // Validate state
        const storedState = sessionStorage.getItem('auth_state');
        if (state !== storedState) {
          console.error('State mismatch - possible CSRF attack');
          navigate('/');
          return;
        }

        if (!code) {
          console.error('No authorization code received');
          navigate('/');
          return;
        }

        // Exchange code for token
        const codeVerifier = sessionStorage.getItem('code_verifier');
        const tokenResponse = await fetch('https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            grant_type: 'authorization_code',
            code: code,
            redirect_uri: process.env.REACT_APP_EPIC_REDIRECT_URI,
            client_id: process.env.REACT_APP_EPIC_CLIENT_ID,
            code_verifier: codeVerifier,
          }),
        });

        if (!tokenResponse.ok) {
          const errorData = await tokenResponse.json();
          console.error('Token exchange failed:', errorData);
          sessionStorage.setItem('epic_error', JSON.stringify(errorData));
          navigate('/');
          return;
        }

        const tokenData = await tokenResponse.json();
        console.log('Token response:', tokenData);

        // Store core authentication data
        sessionStorage.setItem('epic_access_token', tokenData.access_token);
        sessionStorage.setItem('epic_token_type', tokenData.token_type || 'Bearer');
        sessionStorage.setItem('epic_expires_in', tokenData.expires_in);
        sessionStorage.setItem('epic_scope', tokenData.scope);
        
        // Calculate and store expiration timestamp
        const expiresAt = Date.now() + (tokenData.expires_in * 1000);
        sessionStorage.setItem('epic_expires_at', expiresAt);

        // Store refresh token if provided
        if (tokenData.refresh_token) {
          sessionStorage.setItem('epic_refresh_token', tokenData.refresh_token);
        }

        // CRITICAL: Store patient context
        if (tokenData.patient) {
          sessionStorage.setItem('epic_patient_id', tokenData.patient);
          console.log('Patient ID from token:', tokenData.patient);
        } else {
          console.warn('No patient ID in token response - check launch context');
        }

        // Store encounter context (if provided)
        if (tokenData.encounter) {
          sessionStorage.setItem('epic_encounter_id', tokenData.encounter);
          console.log('Encounter ID from token:', tokenData.encounter);
        }

        // Store intent context (e.g., "order", "view")
        if (tokenData.intent) {
          sessionStorage.setItem('epic_intent', tokenData.intent);
          console.log('Intent from token:', tokenData.intent);
        }

        // Store FHIR user (provider information)
        if (tokenData.fhirUser) {
          sessionStorage.setItem('epic_fhir_user', tokenData.fhirUser);
          console.log('FHIR User:', tokenData.fhirUser);
        }

        // Store ID token if using OpenID Connect
        if (tokenData.id_token) {
          sessionStorage.setItem('epic_id_token', tokenData.id_token);
        }

        // Store complete token response for debugging
        sessionStorage.setItem('epic_token_response', JSON.stringify(tokenData));

        // Store authentication timestamp
        sessionStorage.setItem('epic_auth_timestamp', Date.now());

        // Clear temporary auth data
        sessionStorage.removeItem('code_verifier');
        sessionStorage.removeItem('auth_state');
        sessionStorage.removeItem('epic_launch');

        // Set success flag
        sessionStorage.setItem('epic_auth_success', 'true');

        console.log('Authentication successful - redirecting to app');
        
        // Navigate to main app
        navigate('/');

      } catch (error) {
        console.error('Error in callback handler:', error);
        sessionStorage.setItem('epic_error', JSON.stringify({ 
          error: 'callback_error', 
          message: error.message 
        }));
        navigate('/');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      height: '100vh',
      flexDirection: 'column',
      gap: '1rem'
    }}>
      <div className="spinner" style={{
        border: '4px solid #f3f3f3',
        borderTop: '4px solid #3498db',
        borderRadius: '50%',
        width: '40px',
        height: '40px',
        animation: 'spin 1s linear infinite'
      }}></div>
      <p>Completing Epic authentication...</p>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
        `}
      </style>
    </div>
  );
};

export default EpicCallback;