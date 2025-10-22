// Utility to fetch complete patient data from Epic
import { getEpicToken } from './epicAuth';

export const fetchCompletePatientData = async (patientId) => {
  const accessToken = getEpicToken();

  if (!accessToken) {
    throw new Error('Missing Epic access token');
  }

  const fhirBaseUrl = process.env.REACT_APP_EPIC_FHIR_BASE;

  try {
    // Fetch demographics
    const demographicsResponse = await fetch(`${fhirBaseUrl}/Patient/${patientId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    if (!demographicsResponse.ok) {
      throw new Error('Failed to fetch patient demographics');
    }

    const demographics = await demographicsResponse.json();

    // Fetch conditions
    const conditionsResponse = await fetch(`${fhirBaseUrl}/Condition?patient=${patientId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const conditions = conditionsResponse.ok ? await conditionsResponse.json() : { entry: [] };

    // Fetch medications
    const medicationsResponse = await fetch(`${fhirBaseUrl}/MedicationRequest?patient=${patientId}`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const medications = medicationsResponse.ok ? await medicationsResponse.json() : { entry: [] };

    // Fetch labs
    const labsResponse = await fetch(`${fhirBaseUrl}/Observation?patient=${patientId}&_count=100`, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Accept': 'application/fhir+json'
      }
    });

    const labs = labsResponse.ok ? await labsResponse.json() : { entry: [] };

    return {
      demographics,
      conditions: conditions.entry.map(entry => entry.resource),
      medications: medications.entry.map(entry => entry.resource),
      labs: labs.entry.map(entry => entry.resource),
      fetchedAt: new Date().toISOString()
    };
  } catch (error) {
    console.error('Error fetching complete patient data:', error);
    throw error;
  }
};