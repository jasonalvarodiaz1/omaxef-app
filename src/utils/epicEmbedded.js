// Epic Hyperspace Embedded Activity Integration
// Handles communication with Epic via postMessage and embedded context

/**
 * Initialize embedded Epic integration
 * This handles Epic's Hyperspace Activity messaging framework
 */
export const initializeEpicEmbedded = () => {
  console.log('🔌 Initializing Epic Embedded Mode');
  
  // Check if running in iframe (embedded mode)
  const isEmbedded = window.self !== window.top;
  
  if (!isEmbedded) {
    console.log('⚠️ Not running in iframe - embedded mode not available');
    return null;
  }

  // Listen for messages from Epic
  window.addEventListener('message', handleEpicMessage);
  
  // Notify Epic that the app is ready using Epic's protocol
  sendMessageToEpic({
    action: 'Loaded',
    success: true
  });
  
  // Also request launch context
  setTimeout(() => {
    sendMessageToEpic({
      action: 'GetLaunchContext'
    });
  }, 500);
  
  return {
    isEmbedded: true,
    sendMessage: sendMessageToEpic,
    cleanup: () => {
      window.removeEventListener('message', handleEpicMessage);
    }
  };
};

/**
 * Handle messages from Epic Hyperspace
 */
const handleEpicMessage = (event) => {
  // Security: verify origin is Epic
  // In production, you should validate event.origin matches Epic's domain
  
  const message = event.data;
  console.log('📨 Received message from Epic:', message);
  
  if (!message || typeof message !== 'object') {
    return;
  }
  
  // Handle Epic's response messages
  if (message.error) {
    console.warn('⚠️ Epic responded with error:', message.error);
    return;
  }
  
  // Ignore webpack hot reload messages
  if (message.type === 'webpackOk' || message.type?.includes('webpack')) {
    return;
  }
  
  // Handle different message types/actions
  const messageType = message.type || message.action || message.messageType;
  
  switch (messageType) {
    case 'LaunchContext':
    case 'GetLaunchContextResponse':
      handleLaunchContext(message.data || message);
      break;
      
    case 'PatientContext':
      handlePatientContext(message.data || message);
      break;
      
    case 'UserContext':
      handleUserContext(message.data || message);
      break;
      
    case 'CloseActivity':
      handleCloseActivity();
      break;
      
    default:
      if (messageType) {
        console.log('Unknown message type:', messageType);
      }
  }
};

/**
 * Send message to Epic parent window
 */
const sendMessageToEpic = (message) => {
  if (window.parent && window.parent !== window) {
    window.parent.postMessage(message, '*');
    console.log('📤 Sent message to Epic:', message);
  }
};

/**
 * Handle launch context from Epic
 */
const handleLaunchContext = (data) => {
  console.log('🚀 Launch context received:', data);
  
  // Store launch context - Epic may send these in different formats
  const token = data.access_token || data.accessToken || data.token;
  const patientId = data.patient || data.patientId || data.context?.patient;
  const fhirBase = data.fhirBaseUrl || data.fhirBase || data.iss;
  
  if (token) {
    sessionStorage.setItem('epic_access_token', token);
    console.log('✅ Stored access token');
  }
  
  if (patientId) {
    sessionStorage.setItem('epic_patient_id', patientId);
    console.log('✅ Stored patient ID:', patientId);
  }
  
  if (fhirBase) {
    sessionStorage.setItem('epic_fhir_base', fhirBase);
    console.log('✅ Stored FHIR base:', fhirBase);
  }
  
  // Check if we have the essentials
  if (!token && !patientId) {
    console.warn('⚠️ Launch context missing token and patient ID. Data received:', data);
    // Epic may send context in URL parameters instead
    const urlParams = new URLSearchParams(window.location.search);
    const urlToken = urlParams.get('access_token');
    const urlPatient = urlParams.get('patient');
    
    if (urlToken) {
      sessionStorage.setItem('epic_access_token', urlToken);
      console.log('✅ Got token from URL parameter');
    }
    if (urlPatient) {
      sessionStorage.setItem('epic_patient_id', urlPatient);
      console.log('✅ Got patient from URL parameter');
    }
  }
  
  // Trigger custom event for app to handle
  window.dispatchEvent(new CustomEvent('epicLaunchContext', { detail: data }));
};

/**
 * Handle patient context from Epic
 */
const handlePatientContext = (data) => {
  console.log('👤 Patient context received:', data);
  
  if (data.patientId) {
    sessionStorage.setItem('epic_patient_id', data.patientId);
  }
  
  // Trigger custom event
  window.dispatchEvent(new CustomEvent('epicPatientContext', { detail: data }));
};

/**
 * Handle user context from Epic
 */
const handleUserContext = (data) => {
  console.log('👨‍⚕️ User context received:', data);
  
  if (data.userId) {
    sessionStorage.setItem('epic_user_id', data.userId);
  }
  
  // Trigger custom event
  window.dispatchEvent(new CustomEvent('epicUserContext', { detail: data }));
};

/**
 * Handle close activity request from Epic
 */
const handleCloseActivity = () => {
  console.log('👋 Close activity requested by Epic');
  
  // Clean up before closing
  sessionStorage.removeItem('epic_access_token');
  sessionStorage.removeItem('epic_patient_id');
  
  // Trigger custom event for app cleanup
  window.dispatchEvent(new CustomEvent('epicCloseActivity'));
};

/**
 * Check if app is running in Epic embedded mode
 */
export const isEpicEmbedded = () => {
  return window.self !== window.top;
};

/**
 * Get embedded context data
 */
export const getEmbeddedContext = () => {
  return {
    accessToken: sessionStorage.getItem('epic_access_token'),
    patientId: sessionStorage.getItem('epic_patient_id'),
    userId: sessionStorage.getItem('epic_user_id'),
    fhirBaseUrl: sessionStorage.getItem('epic_fhir_base')
  };
};

/**
 * Request patient data from Epic
 */
export const requestPatientData = (patientId) => {
  sendMessageToEpic({
    type: 'RequestPatientData',
    patientId: patientId || sessionStorage.getItem('epic_patient_id')
  });
};

/**
 * Notify Epic of app status/errors
 */
export const notifyEpicStatus = (status, message) => {
  sendMessageToEpic({
    type: 'StatusUpdate',
    status,
    message,
    timestamp: new Date().toISOString()
  });
};

/**
 * Request Epic to close the activity
 */
export const requestClose = () => {
  sendMessageToEpic({
    type: 'RequestClose'
  });
};
