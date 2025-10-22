// Epic FHIR Data Fetching Utilities

import EPIC_CONFIG from './epicAuth';

// Fetch patient demographics
export const fetchEpicPatient = async (patientId, accessToken) => {
  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/Patient/${patientId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch patient: ${response.statusText}`);
  }
  
  return await response.json();
};

// Fetch patient conditions (diagnoses)
export const fetchEpicConditions = async (patientId, accessToken) => {
  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/Condition?patient=${patientId}&clinical-status=active`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch conditions: ${response.statusText}`);
  }
  
  return await response.json();
};

// Fetch patient medications
export const fetchEpicMedications = async (patientId, accessToken) => {
  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/MedicationRequest?patient=${patientId}&status=active`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch medications: ${response.statusText}`);
  }
  
  return await response.json();
};

// Fetch patient observations (labs)
export const fetchEpicObservations = async (patientId, accessToken) => {
  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/Observation?patient=${patientId}&category=laboratory&_sort=-date&_count=20`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );
  
  if (!response.ok) {
    throw new Error(`Failed to fetch observations: ${response.statusText}`);
  }
  
  return await response.json();
};

// Fetch patient coverage (insurance)
export const fetchEpicCoverage = async (patientId, accessToken) => {
  const response = await fetch(
    `${EPIC_CONFIG.fhirBaseUrl}/Coverage?patient=${patientId}`,
    {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    }
  );
  
  if (!response.ok) {
    // Coverage might not be available for test patients
    console.warn('Coverage data not available');
    return { entry: [] };
  }
  
  return await response.json();
};

// Fetch all patient data at once
export const fetchAllEpicPatientData = async (patientId, accessToken) => {
  try {
    const [patient, conditions, medications, observations, coverage] = await Promise.all([
      fetchEpicPatient(patientId, accessToken),
      fetchEpicConditions(patientId, accessToken),
      fetchEpicMedications(patientId, accessToken),
      fetchEpicObservations(patientId, accessToken),
      fetchEpicCoverage(patientId, accessToken)
    ]);
    
    return {
      patient,
      conditions,
      medications,
      observations,
      coverage
    };
  } catch (error) {
    console.error('Error fetching Epic patient data:', error);
    throw error;
  }
};
