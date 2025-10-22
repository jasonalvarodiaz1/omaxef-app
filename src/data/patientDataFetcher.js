const EPIC_FHIR_BASE = 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4';

/**
 * Make authenticated FHIR request
 */
const fetchFHIR = async (endpoint) => {
  const accessToken = sessionStorage.getItem('epic_access_token');
  
  if (!accessToken) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${EPIC_FHIR_BASE}${endpoint}`, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Accept': 'application/fhir+json',
    },
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`FHIR request failed: ${response.status} - ${errorText}`);
  }

  return await response.json();
};

/**
 * Fetch patient demographics
 */
export const fetchPatientDemographics = async (patientId) => {
  try {
    const patient = await fetchFHIR(`/Patient/${patientId}`);
    
    return {
      id: patient.id,
      name: formatName(patient.name),
      birthDate: patient.birthDate,
      age: calculateAge(patient.birthDate),
      gender: patient.gender,
      address: formatAddress(patient.address),
      phone: formatTelecom(patient.telecom, 'phone'),
      email: formatTelecom(patient.telecom, 'email'),
      mrn: formatIdentifier(patient.identifier, 'MR'),
      raw: patient,
    };
  } catch (error) {
    console.error('Error fetching patient demographics:', error);
    throw error;
  }
};

/**
 * Fetch patient conditions (diagnoses)
 */
export const fetchPatientConditions = async (patientId) => {
  try {
    const response = await fetchFHIR(`/Condition?patient=${patientId}&clinical-status=active`);
    
    if (!response.entry) {
      return [];
    }

    return response.entry.map(entry => {
      const condition = entry.resource;
      return {
        id: condition.id,
        code: condition.code?.coding?.[0]?.code,
        display: condition.code?.coding?.[0]?.display || condition.code?.text,
        system: condition.code?.coding?.[0]?.system,
        clinicalStatus: condition.clinicalStatus?.coding?.[0]?.code,
        onsetDateTime: condition.onsetDateTime,
        recordedDate: condition.recordedDate,
        category: condition.category?.[0]?.coding?.[0]?.display,
        raw: condition,
      };
    });
  } catch (error) {
    console.error('Error fetching patient conditions:', error);
    return [];
  }
};

/**
 * Fetch patient observations (labs, vitals)
 */
export const fetchPatientObservations = async (patientId, codes = []) => {
  try {
    let endpoint = `/Observation?patient=${patientId}&_sort=-date&_count=100`;
    
    // Add specific LOINC codes if provided
    if (codes.length > 0) {
      endpoint += `&code=${codes.join(',')}`;
    }

    const response = await fetchFHIR(endpoint);
    
    if (!response.entry) {
      return [];
    }

    return response.entry.map(entry => {
      const obs = entry.resource;
      return {
        id: obs.id,
        code: obs.code?.coding?.[0]?.code,
        display: obs.code?.coding?.[0]?.display || obs.code?.text,
        system: obs.code?.coding?.[0]?.system,
        value: formatObservationValue(obs),
        unit: obs.valueQuantity?.unit,
        effectiveDateTime: obs.effectiveDateTime,
        issued: obs.issued,
        status: obs.status,
        category: obs.category?.[0]?.coding?.[0]?.display,
        raw: obs,
      };
    });
  } catch (error) {
    console.error('Error fetching patient observations:', error);
    return [];
  }
};

/**
 * Fetch specific labs for weight-loss criteria
 */
export const fetchWeightLossLabs = async (patientId) => {
  const labCodes = [
    '39156-5',  // BMI
    '29463-7',  // Body Weight
    '8302-2',   // Body Height
    '2093-3',   // Cholesterol Total
    '2571-8',   // Triglycerides
    '4548-4',   // HbA1c
    '2345-7',   // Glucose
    '17856-6',  // Hemoglobin A1c/Hemoglobin.total
  ];

  return await fetchPatientObservations(patientId, labCodes);
};

/**
 * Fetch patient medications
 */
export const fetchPatientMedications = async (patientId) => {
  try {
    const response = await fetchFHIR(`/MedicationRequest?patient=${patientId}&status=active&_include=MedicationRequest:medication`);
    
    if (!response.entry) {
      return [];
    }

    return response.entry
      .filter(entry => entry.resource.resourceType === 'MedicationRequest')
      .map(entry => {
        const medReq = entry.resource;
        return {
          id: medReq.id,
          status: medReq.status,
          intent: medReq.intent,
          medication: formatMedication(medReq),
          dosage: formatDosage(medReq.dosageInstruction),
          authoredOn: medReq.authoredOn,
          requester: medReq.requester?.display,
          raw: medReq,
        };
      });
  } catch (error) {
    console.error('Error fetching patient medications:', error);
    return [];
  }
};

/**
 * Fetch patient coverage/insurance
 */
export const fetchPatientCoverage = async (patientId) => {
  try {
    const response = await fetchFHIR(`/Coverage?patient=${patientId}&status=active`);
    
    if (!response.entry) {
      return [];
    }

    return response.entry.map(entry => {
      const coverage = entry.resource;
      return {
        id: coverage.id,
        status: coverage.status,
        type: coverage.type?.coding?.[0]?.display || coverage.type?.text,
        subscriberId: coverage.subscriberId,
        payor: coverage.payor?.[0]?.display,
        period: coverage.period,
        relationship: coverage.relationship?.coding?.[0]?.display,
        raw: coverage,
      };
    });
  } catch (error) {
    console.error('Error fetching patient coverage:', error);
    return [];
  }
};

/**
 * Fetch all patient data at once
 */
export const fetchCompletePatientData = async (patientId) => {
  try {
    console.log('Fetching complete patient data for:', patientId);

    const [
      demographics,
      conditions,
      labs,
      medications,
      coverage,
    ] = await Promise.all([
      fetchPatientDemographics(patientId),
      fetchPatientConditions(patientId),
      fetchWeightLossLabs(patientId),
      fetchPatientMedications(patientId),
      fetchPatientCoverage(patientId),
    ]);

    // Calculate current BMI from most recent observations
    const bmi = calculateCurrentBMI(labs);
    const weight = getLatestWeight(labs);

    return {
      demographics,
      conditions,
      labs,
      medications,
      coverage,
      calculatedValues: {
        bmi,
        weight,
        hasObesityDiagnosis: checkObesityDiagnosis(conditions),
        hasDiabetes: checkDiabetes(conditions),
        hasHypertension: checkHypertension(conditions),
      },
      fetchedAt: new Date().toISOString(),
    };
  } catch (error) {
    console.error('Error fetching complete patient data:', error);
    throw error;
  }
};

// Helper functions

function formatName(names) {
  if (!names || names.length === 0) return 'Unknown';
  const name = names[0];
  const given = name.given?.join(' ') || '';
  const family = name.family || '';
  return `${given} ${family}`.trim();
}

function formatAddress(addresses) {
  if (!addresses || addresses.length === 0) return null;
  const addr = addresses[0];
  return {
    line: addr.line?.join(', '),
    city: addr.city,
    state: addr.state,
    postalCode: addr.postalCode,
    country: addr.country,
  };
}

function formatTelecom(telecoms, system) {
  if (!telecoms) return null;
  const contact = telecoms.find(t => t.system === system);
  return contact?.value || null;
}

function formatIdentifier(identifiers, type) {
  if (!identifiers) return null;
  const identifier = identifiers.find(i => i.type?.coding?.[0]?.code === type);
  return identifier?.value || null;
}

function calculateAge(birthDate) {
  if (!birthDate) return null;
  const today = new Date();
  const birth = new Date(birthDate);
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  return age;
}

function formatObservationValue(obs) {
  if (obs.valueQuantity) {
    return obs.valueQuantity.value;
  } else if (obs.valueString) {
    return obs.valueString;
  } else if (obs.valueCodeableConcept) {
    return obs.valueCodeableConcept.coding?.[0]?.display || obs.valueCodeableConcept.text;
  }
  return null;
}

function formatMedication(medReq) {
  if (medReq.medicationCodeableConcept) {
    return medReq.medicationCodeableConcept.coding?.[0]?.display || medReq.medicationCodeableConcept.text;
  } else if (medReq.medicationReference) {
    return medReq.medicationReference.display;
  }
  return 'Unknown medication';
}

function formatDosage(dosageInstructions) {
  if (!dosageInstructions || dosageInstructions.length === 0) return null;
  return dosageInstructions[0].text || dosageInstructions[0].doseAndRate?.[0]?.doseQuantity?.value;
}

function calculateCurrentBMI(labs) {
  const bmiObs = labs.find(lab => lab.code === '39156-5');
  return bmiObs ? parseFloat(bmiObs.value) : null;
}

function getLatestWeight(labs) {
  const weightObs = labs.find(lab => lab.code === '29463-7');
  return weightObs ? { value: parseFloat(weightObs.value), unit: weightObs.unit } : null;
}

function checkObesityDiagnosis(conditions) {
  const obesityCodes = ['E66', 'E66.0', 'E66.1', 'E66.2', 'E66.8', 'E66.9'];
  return conditions.some(cond => 
    obesityCodes.some(code => cond.code?.startsWith(code))
  );
}

function checkDiabetes(conditions) {
  const diabetesCodes = ['E11', 'E10'];
  return conditions.some(cond => 
    diabetesCodes.some(code => cond.code?.startsWith(code))
  );
}

function checkHypertension(conditions) {
  const hypertensionCodes = ['I10', 'I11', 'I12', 'I13', 'I15'];
  return conditions.some(cond => 
    hypertensionCodes.some(code => cond.code?.startsWith(code))
  );
}

export default {
  fetchPatientDemographics,
  fetchPatientConditions,
  fetchPatientObservations,
  fetchWeightLossLabs,
  fetchPatientMedications,
  fetchPatientCoverage,
  fetchCompletePatientData,
};