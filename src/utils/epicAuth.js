// Epic SMART on FHIR Authentication Utilities

const EPIC_CONFIG = {
  clientId: process.env.REACT_APP_EPIC_CLIENT_ID,
  fhirBaseUrl: process.env.REACT_APP_EPIC_FHIR_BASE,
  authUrl: process.env.REACT_APP_EPIC_AUTH_URL,
  tokenUrl: process.env.REACT_APP_EPIC_TOKEN_URL,
  redirectUri: process.env.REACT_APP_REDIRECT_URI,
  scope: process.env.REACT_APP_EPIC_SCOPE || 'patient/Patient.read patient/Condition.read patient/MedicationRequest.read patient/Observation.read patient/Coverage.read openid fhirUser'
};

// Updated scopes to include additional permissions
const EPIC_SCOPES = 'launch launch/patient patient/Patient.read patient/Condition.read patient/Observation.read patient/MedicationRequest.read patient/Coverage.read launch/encounter openid fhirUser';

// Step 1: Initiate SMART launch - STANDALONE PROVIDER MODE
export const launchEpicAuth = () => {
  const state = generateRandomState();
  sessionStorage.setItem('epic_auth_state', state);
  
  // STANDALONE PROVIDER LAUNCH for Epic Sandbox
  const authParams = new URLSearchParams({
    response_type: 'code',
    client_id: EPIC_CONFIG.clientId,
    redirect_uri: EPIC_CONFIG.redirectUri,
    scope: 'user/Patient.read user/Condition.read user/MedicationRequest.read user/Observation.read user/Coverage.read fhirUser openid',
    state: state,
    aud: EPIC_CONFIG.fhirBaseUrl
  });
  
  const authUrl = `${EPIC_CONFIG.authUrl}?${authParams.toString()}`;
  console.log('Auth URL:', authUrl); // Debug
  window.location.href = authUrl;
};

// Check if app was launched from Epic
export const isEpicLaunch = () => {
  const urlParams = new URLSearchParams(window.location.search);
  return urlParams.has('launch') && urlParams.has('iss');
};

// Initiate auth with launch context
export const initiateEpicAuth = () => {
  const urlParams = new URLSearchParams(window.location.search);
  const launchToken = urlParams.get('launch');
  const issuer = urlParams.get('iss');

  if (!launchToken || !issuer) {
    throw new Error('Missing launch parameters - app must be launched from Epic EHR');
  }

  sessionStorage.setItem('epic_launch', launchToken);
  sessionStorage.setItem('epic_iss', issuer);

  const codeVerifier = generateCodeVerifier();
  const codeChallenge = generateCodeChallenge(codeVerifier);
  sessionStorage.setItem('code_verifier', codeVerifier);

  const state = generateRandomState();
  sessionStorage.setItem('auth_state', state);

  const authUrl = new URL(`${issuer}/oauth2/authorize`);
  authUrl.searchParams.append('response_type', 'code');
  authUrl.searchParams.append('client_id', EPIC_CONFIG.clientId);
  authUrl.searchParams.append('redirect_uri', EPIC_CONFIG.redirectUri);
  authUrl.searchParams.append('scope', EPIC_SCOPES);
  authUrl.searchParams.append('state', state);
  authUrl.searchParams.append('aud', issuer);
  authUrl.searchParams.append('launch', launchToken);
  authUrl.searchParams.append('code_challenge', codeChallenge);
  authUrl.searchParams.append('code_challenge_method', 'S256');

  window.location.href = authUrl.toString();
};

// Step 2: Handle OAuth callback
export const handleEpicCallback = async () => {
  const params = new URLSearchParams(window.location.search);
  const code = params.get('code');
  const state = params.get('state');
  const storedState = sessionStorage.getItem('epic_auth_state');
  
  // Verify state (security check)
  if (state !== storedState) {
    throw new Error('Invalid state parameter - possible CSRF attack');
  }
  
  if (!code) {
    throw new Error('No authorization code received');
  }
  
  // Exchange code for access token
  const tokenParams = new URLSearchParams({
    grant_type: 'authorization_code',
    code: code,
    redirect_uri: EPIC_CONFIG.redirectUri,
    client_id: EPIC_CONFIG.clientId
  });
  
  try {
    const response = await fetch(EPIC_CONFIG.tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: tokenParams
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Token exchange failed: ${errorText}`);
    }
    
    const tokenData = await response.json();
    
    // Store token and patient ID
    sessionStorage.setItem('epic_access_token', tokenData.access_token);
    sessionStorage.setItem('epic_patient_id', tokenData.patient);
    sessionStorage.setItem('epic_token_expires', Date.now() + (tokenData.expires_in * 1000));
    
    // Clean up
    sessionStorage.removeItem('epic_auth_state');
    
    return {
      accessToken: tokenData.access_token,
      patientId: tokenData.patient,
      expiresIn: tokenData.expires_in
    };
  } catch (error) {
    console.error('Epic token exchange error:', error);
    throw error;
  }
};

// Step 3: Check if we have a valid token
export const hasValidEpicToken = () => {
  const token = sessionStorage.getItem('epic_access_token');
  const expires = sessionStorage.getItem('epic_token_expires');
  
  if (!token || !expires) return false;
  
  return Date.now() < parseInt(expires);
};

// Step 4: Get stored token
export const getEpicToken = () => {
  return sessionStorage.getItem('epic_access_token');
};

// Step 5: Get stored patient ID
export const getEpicPatientId = () => {
  return sessionStorage.getItem('epic_patient_id');
};

// Step 6: Clear Epic session
export const clearEpicSession = () => {
  sessionStorage.removeItem('epic_access_token');
  sessionStorage.removeItem('epic_patient_id');
  sessionStorage.removeItem('epic_token_expires');
  sessionStorage.removeItem('epic_auth_state');
};

// Utility: Generate random state for CSRF protection
function generateRandomState() {
  return Math.random().toString(36).substring(2, 15) + 
         Math.random().toString(36).substring(2, 15);
}

// Function to generate code verifier for PKCE
function generateCodeVerifier() {
  const array = new Uint32Array(28);
  window.crypto.getRandomValues(array);
  return Array.from(array, dec2hex).join('');
}

// Function to generate code challenge for PKCE
function generateCodeChallenge(verifier) {
  return window.crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier))
    .then(buffer => {
      return Array.from(new Uint8Array(buffer), dec2hex).join('');
    });
}

// Decimal to hex converter
function dec2hex(dec) {
  return ('0' + dec.toString(16)).padStart(2, '0');
}

// Function to search for patients using Epic FHIR API
export const searchPatients = async (accessToken, searchParams) => {
  const { name, birthdate, identifier } = searchParams;
  const params = new URLSearchParams();

  if (name) params.append('name', name);
  if (birthdate) params.append('birthdate', birthdate);
  if (identifier) params.append('identifier', identifier);

  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/Patient?${params}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Patient search failed: ${errorText}`);
  }

  return await response.json();
};

// Function to capture launch parameters from Epic
export const captureLaunchParameters = () => {
  const params = new URLSearchParams(window.location.search);
  const launch = params.get('launch');
  const iss = params.get('iss');

  if (!launch || !iss) {
    throw new Error('Missing launch parameters: launch or iss');
  }

  return { launch, iss };
};

export default EPIC_CONFIG;
