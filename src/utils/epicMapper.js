// Epic FHIR to App Data Mapper
// Transforms FHIR resources into application-friendly format

/**
 * Map FHIR Patient resource to app format
 */
export const mapPatient = (fhirPatient) => {
  if (!fhirPatient) return null;
  
  const name = fhirPatient.name?.[0];
  const firstName = name?.given?.[0] || '';
  const lastName = name?.family || '';
  
  return {
    id: fhirPatient.id,
    name: `${firstName} ${lastName}`.trim(),
    firstName,
    lastName,
    birthDate: fhirPatient.birthDate,
    age: calculateAge(fhirPatient.birthDate),
    gender: fhirPatient.gender,
    mrn: fhirPatient.identifier?.find(id => id.type?.text === 'MRN')?.value || fhirPatient.id
  };
};

/**
 * Map FHIR Condition resources to app format
 */
export const mapConditions = (fhirBundle) => {
  if (!fhirBundle?.entry) return [];
  
  return fhirBundle.entry.map(entry => {
    const condition = entry.resource;
    return {
      id: condition.id,
      code: condition.code?.coding?.[0]?.code,
      display: condition.code?.coding?.[0]?.display || condition.code?.text,
      clinicalStatus: condition.clinicalStatus?.coding?.[0]?.code,
      onsetDate: condition.onsetDateTime || condition.recordedDate,
      category: condition.category?.[0]?.coding?.[0]?.display
    };
  });
};

/**
 * Map FHIR MedicationRequest resources to app format
 */
export const mapMedications = (fhirBundle) => {
  if (!fhirBundle?.entry) return [];
  
  return fhirBundle.entry.map(entry => {
    const med = entry.resource;
    return {
      id: med.id,
      name: med.medicationCodeableConcept?.text || 
            med.medicationCodeableConcept?.coding?.[0]?.display ||
            'Unknown Medication',
      code: med.medicationCodeableConcept?.coding?.[0]?.code,
      status: med.status,
      dosage: med.dosageInstruction?.[0]?.text,
      authoredOn: med.authoredOn,
      prescriber: med.requester?.display
    };
  });
};

/**
 * Map FHIR Observation resources to app format
 */
export const mapObservations = (fhirBundle) => {
  if (!fhirBundle?.entry) return [];
  
  return fhirBundle.entry.map(entry => {
    const obs = entry.resource;
    return {
      id: obs.id,
      code: obs.code?.coding?.[0]?.code,
      display: obs.code?.coding?.[0]?.display || obs.code?.text,
      value: getObservationValue(obs),
      unit: obs.valueQuantity?.unit,
      date: obs.effectiveDateTime || obs.issued,
      status: obs.status,
      category: obs.category?.[0]?.coding?.[0]?.display
    };
  });
};

/**
 * Map FHIR Coverage resources to app format
 */
export const mapCoverage = (fhirBundle) => {
  if (!fhirBundle?.entry) return [];
  
  return fhirBundle.entry.map(entry => {
    const coverage = entry.resource;
    return {
      id: coverage.id,
      status: coverage.status,
      type: coverage.type?.text || coverage.type?.coding?.[0]?.display,
      subscriberId: coverage.subscriberId,
      payor: coverage.payor?.[0]?.display,
      period: {
        start: coverage.period?.start,
        end: coverage.period?.end
      }
    };
  });
};

/**
 * Extract specific observation types for weight tracking
 */
export const extractWeightData = (observations) => {
  return observations
    .filter(obs => obs.code === '29463-7' || obs.display?.toLowerCase().includes('weight'))
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
      unit: obs.unit || 'kg'
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Extract BMI observations
 */
export const extractBMIData = (observations) => {
  return observations
    .filter(obs => obs.code === '39156-5' || obs.display?.toLowerCase().includes('bmi'))
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
      unit: obs.unit || 'kg/m2'
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Extract A1C observations
 */
export const extractA1CData = (observations) => {
  return observations
    .filter(obs => obs.code === '4548-4' || obs.display?.toLowerCase().includes('hemoglobin a1c'))
    .map(obs => ({
      date: obs.date,
      value: parseFloat(obs.value),
      unit: obs.unit || '%'
    }))
    .sort((a, b) => new Date(b.date) - new Date(a.date));
};

/**
 * Check if patient has diabetes diagnosis
 */
export const hasDiabetesDiagnosis = (conditions) => {
  const diabetesCodes = ['E11', 'E10', 'E08', 'E09', '250']; // ICD-10 and ICD-9 codes
  return conditions.some(condition => 
    diabetesCodes.some(code => condition.code?.startsWith(code))
  );
};

/**
 * Check if patient has obesity diagnosis
 */
export const hasObesityDiagnosis = (conditions) => {
  const obesityCodes = ['E66', '278.0', '278.00', '278.01']; // ICD-10 and ICD-9 codes
  return conditions.some(condition => 
    obesityCodes.some(code => condition.code?.startsWith(code))
  );
};

/**
 * Find GLP-1 medications in medication list
 */
export const findGLP1Medications = (medications) => {
  const glp1Names = [
    'semaglutide', 'ozempic', 'wegovy', 'rybelsus',
    'tirzepatide', 'mounjaro', 'zepbound',
    'liraglutide', 'victoza', 'saxenda',
    'dulaglutide', 'trulicity',
    'exenatide', 'byetta', 'bydureon'
  ];
  
  return medications.filter(med => 
    glp1Names.some(name => 
      med.name?.toLowerCase().includes(name)
    )
  );
};

/**
 * Map all Epic data at once
 */
export const mapAllEpicData = (epicData) => {
  const patient = mapPatient(epicData.patient);
  const conditions = mapConditions(epicData.conditions);
  const medications = mapMedications(epicData.medications);
  const observations = mapObservations(epicData.observations);
  const coverage = mapCoverage(epicData.coverage);
  
  return {
    patient,
    conditions,
    medications,
    observations,
    coverage,
    // Derived data
    weightHistory: extractWeightData(observations),
    bmiHistory: extractBMIData(observations),
    a1cHistory: extractA1CData(observations),
    hasDiabetes: hasDiabetesDiagnosis(conditions),
    hasObesity: hasObesityDiagnosis(conditions),
    currentGLP1Meds: findGLP1Medications(medications)
  };
};

/**
 * Map Epic FHIR data to Omaxef patient format
 */
export const mapEpicPatientToOmaxef = (epicData) => {
  const patient = epicData.patient;
  const conditions = epicData.conditions.entry || [];
  const medications = epicData.medications.entry || [];
  const observations = epicData.observations.entry || [];
  const coverage = epicData.coverage.entry?.[0]?.resource;
  
  // Extract patient name
  const patientName = patient.name?.[0] 
    ? `${patient.name[0].given?.join(' ') || ''} ${patient.name[0].family || ''}`.trim()
    : 'Unknown';
  
  // Calculate age from birthDate
  const age = patient.birthDate ? calculateAge(patient.birthDate) : null;
  
  // Extract diagnoses
  const diagnoses = conditions.map(entry => {
    const condition = entry.resource;
    return condition.code?.text || 
           condition.code?.coding?.[0]?.display || 
           'Unknown Condition';
  });
  
  // Extract medications
  const meds = medications.map(entry => {
    const med = entry.resource;
    return {
      name: med.medicationCodeableConcept?.text || 
            med.medicationCodeableConcept?.coding?.[0]?.display || 
            'Unknown Medication',
      dose: med.dosageInstruction?.[0]?.doseAndRate?.[0]?.doseQuantity?.value || 'Unknown',
      sig: med.dosageInstruction?.[0]?.text || 'As directed'
    };
  });
  
  // Extract lab values
  const labs = {};
  observations.forEach(entry => {
    const obs = entry.resource;
    const code = obs.code?.coding?.[0]?.code;
    const display = obs.code?.text || obs.code?.coding?.[0]?.display;
    
    // Map common lab codes to our format
    let labKey = null;
    if (code === '4548-4' || display?.includes('A1c')) labKey = 'a1c';
    else if (code === '33914-3' || display?.includes('eGFR')) labKey = 'egfr';
    else if (code === '2160-0' || display?.includes('Creatinine')) labKey = 'scr';
    else if (code === '39156-5' || display?.includes('BMI')) labKey = 'bmi';
    
    if (labKey && obs.valueQuantity) {
      labs[labKey] = {
        value: obs.valueQuantity.value,
        units: obs.valueQuantity.unit || obs.valueQuantity.code,
        date: obs.effectiveDateTime
      };
    }
  });
  
  // Extract insurance
  const insurance = coverage?.payor?.[0]?.display || 
                   coverage?.type?.text || 
                   'Unknown Insurance';
  
  // Build Omaxef patient object
  return {
    id: `epic_${patient.id}`,
    name: patientName,
    age: age,
    birthDate: patient.birthDate,
    gender: patient.gender,
    insurance: insurance,
    diagnosis: diagnoses,
    medications: meds,
    labs: labs,
    vitals: {
      bmi: labs.bmi?.value || null
    },
    allergies: [], // TODO: Fetch AllergyIntolerance if needed
    clinicalNotes: {
      hasWeightProgram: false, // Would need to be documented separately
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: [], // Would need to be built from MedicationRequest history
    source: 'epic'
  };
};

// Helper functions

/**
 * Extract value from FHIR Observation
 */
function getObservationValue(observation) {
  if (observation.valueQuantity) {
    return observation.valueQuantity.value;
  }
  if (observation.valueString) {
    return observation.valueString;
  }
  if (observation.valueCodeableConcept) {
    return observation.valueCodeableConcept.text || 
           observation.valueCodeableConcept.coding?.[0]?.display;
  }
  return null;
}

/**
 * Calculate age from birth date
 */
function calculateAge(birthDate) {
  if (!birthDate) return null;
  
  const birth = new Date(birthDate);
  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();
  const monthDiff = today.getMonth() - birth.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--;
  }
  
  return age;
}

const epicMapper = {
  mapPatient,
  mapConditions,
  mapMedications,
  mapObservations,
  mapCoverage,
  extractWeightData,
  extractBMIData,
  extractA1CData,
  hasDiabetesDiagnosis,
  hasObesityDiagnosis,
  findGLP1Medications,
  mapAllEpicData,
};

export default epicMapper;
