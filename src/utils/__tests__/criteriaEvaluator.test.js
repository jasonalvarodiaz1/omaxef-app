import { normalizeStatus, CriteriaStatus } from '../constants';
import { 
  extractLatestObservation, 
  extractConditions, 
  extractMedicationHistory,
  calculateBMI,
  parseNumericValue,
  getPatientAge
} from './fhirHelpers';

// Main evaluation function
export function evaluateCriteria(criterionName, patientData, config = {}) {
  if (!patientData) {
    return {
      status: CriteriaStatus.ERROR,
      reason: 'No patient data available',
      displayValue: null
    };
  }

  try {
    switch (criterionName) {
      case 'age':
        return evaluateAge(patientData, config);
      
      case 'bmi':
        return evaluateBMI(patientData, config);
      
      case 'doseProgression':
        return evaluateDoseProgression(patientData, config);
      
      case 'maintenance':
        return evaluateMaintenance(patientData, config);
      
      case 'weightLoss':
        return evaluateWeightLoss(patientData, config);
      
      case 'documentation':
        return evaluateDocumentation(patientData, config);
      
      case 'comorbidity':
        return evaluateComorbidity(patientData, config);
      
      case 'noOpioidUse':
        return evaluateNoOpioidUse(patientData, config);
      
      case 'diabetesPreferred':
        return evaluateDiabetesPreference(patientData, config);
      
      default:
        return {
          status: CriteriaStatus.NOT_APPLICABLE,
          reason: `Unknown criterion: ${criterionName}`,
          displayValue: null
        };
    }
  } catch (error) {
    console.error(`Error evaluating ${criterionName}:`, error);
    return {
      status: CriteriaStatus.ERROR,
      reason: `Evaluation error: ${error.message}`,
      displayValue: null
    };
  }
}

// Age evaluation
function evaluateAge(patientData, config) {
  const minAge = config.min || 18;
  const age = getPatientAge(patientData);

  if (age === null) {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: 'Unable to determine patient age',
      displayValue: 'Unknown'
    };
  }

  if (age >= minAge) {
    return {
      status: CriteriaStatus.MET,
      reason: `Patient is ${age} years old (≥${minAge} required)`,
      displayValue: `${age} years`
    };
  }

  return {
    status: CriteriaStatus.NOT_MET,
    reason: `Patient is ${age} years old (<${minAge} required)`,
    displayValue: `${age} years`
  };
}

// BMI evaluation
function evaluateBMI(patientData, config) {
  const minBMI = config.min || 27;
  const requireComorbidity = config.requireComorbidity || false;
  
  const bmi = calculateBMI(patientData);

  if (bmi === null) {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: 'BMI cannot be calculated - missing height or weight data',
      displayValue: 'Not available'
    };
  }

  const bmiValue = Math.round(bmi * 10) / 10;

  // Check if BMI meets base requirement
  if (bmi >= minBMI) {
    // If comorbidity is required with lower BMI threshold
    if (requireComorbidity && bmi < 30) {
      const comorbidities = extractConditions(patientData);
      const hasQualifyingComorbidity = checkForQualifyingComorbidities(comorbidities);
      
      if (hasQualifyingComorbidity) {
        return {
          status: CriteriaStatus.MET,
          reason: `BMI ${bmiValue} with qualifying comorbidity`,
          displayValue: `${bmiValue} kg/m²`
        };
      } else {
        return {
          status: CriteriaStatus.PARTIAL,
          reason: `BMI ${bmiValue} requires comorbidity documentation`,
          displayValue: `${bmiValue} kg/m²`
        };
      }
    }
    
    return {
      status: CriteriaStatus.MET,
      reason: `BMI ${bmiValue} meets requirement (≥${minBMI})`,
      displayValue: `${bmiValue} kg/m²`
    };
  }

  return {
    status: CriteriaStatus.NOT_MET,
    reason: `BMI ${bmiValue} below requirement (<${minBMI})`,
    displayValue: `${bmiValue} kg/m²`
  };
}

// Dose progression evaluation
function evaluateDoseProgression(patientData, config) {
  const medication = config.medication;
  const currentDose = config.dose;
  
  if (!medication || !currentDose) {
    return {
      status: CriteriaStatus.NOT_APPLICABLE,
      reason: 'Medication or dose not specified',
      displayValue: null
    };
  }

  const medicationHistory = extractMedicationHistory(patientData, medication);
  
  if (!medicationHistory || medicationHistory.length === 0) {
    // First time on this medication
    if (isStartingDose(medication, currentDose)) {
      return {
        status: CriteriaStatus.MET,
        reason: 'Starting dose - appropriate initiation',
        displayValue: currentDose
      };
    } else {
      return {
        status: CriteriaStatus.NOT_MET,
        reason: 'Initial dose higher than recommended starting dose',
        displayValue: currentDose
      };
    }
  }

  // Check dose escalation pattern
  const escalationValid = checkDoseEscalation(medicationHistory, currentDose, medication);
  
  if (escalationValid.isValid) {
    return {
      status: CriteriaStatus.MET,
      reason: escalationValid.reason,
      displayValue: `${escalationValid.duration} on therapy`
    };
  } else {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: escalationValid.reason,
      displayValue: currentDose
    };
  }
}

// Maintenance evaluation
function evaluateMaintenance(patientData, config) {
  const medication = config.medication;
  const currentDose = config.dose;
  
  const medicationHistory = extractMedicationHistory(patientData, medication);
  
  if (!medicationHistory || medicationHistory.length === 0) {
    return {
      status: CriteriaStatus.NOT_APPLICABLE,
      reason: 'No medication history available',
      displayValue: null
    };
  }

  // Check if on max dose for sufficient duration
  const maxDoseDuration = getMaxDoseDuration(medicationHistory, medication);
  
  if (maxDoseDuration >= 12) { // 12 weeks on max dose
    return {
      status: CriteriaStatus.MET,
      reason: `On maximum dose for ${maxDoseDuration} weeks`,
      displayValue: `${maxDoseDuration} weeks`
    };
  } else if (maxDoseDuration > 0) {
    return {
      status: CriteriaStatus.PARTIAL,
      reason: `On maximum dose for only ${maxDoseDuration} weeks`,
      displayValue: `${maxDoseDuration} weeks`
    };
  }

  return {
    status: CriteriaStatus.NOT_MET,
    reason: 'Not yet on maintenance dose',
    displayValue: 'Not on max dose'
  };
}

// Weight loss evaluation
function evaluateWeightLoss(patientData, config) {
  const threshold = config.threshold || 5; // Default 5% weight loss
  const timeframe = config.timeframe || 12; // Default 12 weeks
  
  const weightHistory = extractWeightHistory(patientData);
  
  if (!weightHistory || weightHistory.length < 2) {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: 'Insufficient weight history for evaluation',
      displayValue: 'Insufficient data'
    };
  }

  const baselineWeight = getBaselineWeight(weightHistory, timeframe);
  const currentWeight = weightHistory[weightHistory.length - 1].value;
  
  if (!baselineWeight || !currentWeight) {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: 'Unable to determine baseline or current weight',
      displayValue: 'Missing data'
    };
  }

  const weightLossPercent = ((baselineWeight - currentWeight) / baselineWeight) * 100;
  const weightLossAmount = baselineWeight - currentWeight;
  const roundedPercent = Math.round(weightLossPercent * 10) / 10;

  if (weightLossPercent >= threshold) {
    return {
      status: CriteriaStatus.MET,
      reason: `${roundedPercent}% weight loss achieved (≥${threshold}% required)`,
      displayValue: `${roundedPercent}% (${Math.round(weightLossAmount)} lbs)`
    };
  } else if (weightLossPercent > 0) {
    return {
      status: CriteriaStatus.PARTIAL,
      reason: `${roundedPercent}% weight loss (<${threshold}% required)`,
      displayValue: `${roundedPercent}% (${Math.round(weightLossAmount)} lbs)`
    };
  } else {
    return {
      status: CriteriaStatus.NOT_MET,
      reason: 'No weight loss or weight gain observed',
      displayValue: `${roundedPercent}%`
    };
  }
}

// Documentation evaluation
function evaluateDocumentation(patientData, config) {
  const requiredDocs = config.requiredDocuments || [
    'lifestyle_modification',
    'diet_counseling',
    'exercise_counseling',
    'behavioral_therapy'
  ];

  const documentationStatus = checkDocumentation(patientData, requiredDocs);
  
  if (documentationStatus.complete) {
    return {
      status: CriteriaStatus.MET,
      reason: 'All required documentation present',
      displayValue: `${documentationStatus.found.length}/${requiredDocs.length} complete`
    };
  } else if (documentationStatus.found.length > 0) {
    return {
      status: CriteriaStatus.PARTIAL,
      reason: `Missing: ${documentationStatus.missing.join(', ')}`,
      displayValue: `${documentationStatus.found.length}/${requiredDocs.length} complete`
    };
  }

  return {
    status: CriteriaStatus.NOT_MET,
    reason: 'Required clinical documentation not found',
    displayValue: '0 documents'
  };
}

// Comorbidity evaluation
function evaluateComorbidity(patientData, config) {
  const conditions = extractConditions(patientData);
  const qualifyingConditions = [
    'diabetes',
    'hypertension',
    'dyslipidemia',
    'sleep apnea',
    'cardiovascular disease',
    'osteoarthritis',
    'NASH',
    'PCOS'
  ];

  const foundConditions = [];
  
  for (const condition of conditions) {
    const conditionText = (condition.display || '').toLowerCase();
    for (const qualifying of qualifyingConditions) {
      if (conditionText.includes(qualifying.toLowerCase())) {
        foundConditions.push(qualifying);
        break;
      }
    }
  }

  if (foundConditions.length > 0) {
    return {
      status: CriteriaStatus.MET,
      reason: `Qualifying conditions: ${foundConditions.join(', ')}`,
      displayValue: `${foundConditions.length} conditions`
    };
  }

  return {
    status: CriteriaStatus.NOT_MET,
    reason: 'No qualifying comorbidities documented',
    displayValue: 'None found'
  };
}

// No opioid use evaluation (for Contrave)
function evaluateNoOpioidUse(patientData, config) {
  const medicationHistory = extractMedicationHistory(patientData);
  const opioidKeywords = ['opioid', 'morphine', 'oxycodone', 'hydrocodone', 'fentanyl', 'tramadol', 'codeine'];
  
  for (const med of medicationHistory) {
    const medName = (med.display || '').toLowerCase();
    for (const keyword of opioidKeywords) {
      if (medName.includes(keyword)) {
        return {
          status: CriteriaStatus.NOT_MET,
          reason: `Opioid use detected: ${med.display}`,
          displayValue: 'Contraindicated'
        };
      }
    }
  }

  return {
    status: CriteriaStatus.MET,
    reason: 'No opioid use detected',
    displayValue: 'Clear'
  };
}

// Diabetes preference evaluation
function evaluateDiabetesPreference(patientData, config) {
  const conditions = extractConditions(patientData);
  
  for (const condition of conditions) {
    const conditionText = (condition.display || '').toLowerCase();
    if (conditionText.includes('diabetes') || conditionText.includes('dm2') || conditionText.includes('t2dm')) {
      return {
        status: CriteriaStatus.MET,
        reason: 'Patient has diabetes - medication has dual indication',
        displayValue: 'Diabetes present'
      };
    }
  }

  return {
    status: CriteriaStatus.NOT_APPLICABLE,
    reason: 'No diabetes diagnosis',
    displayValue: 'N/A'
  };
}

// Helper functions
function isStartingDose(medication, dose) {
  const startingDoses = {
    'Wegovy': '0.25 mg',
    'Ozempic': '0.25 mg',
    'Zepbound': '2.5 mg',
    'Mounjaro': '2.5 mg',
    'Saxenda': '0.6 mg',
    'Contrave': '1 tablet',
    'Qsymia': '3.75 mg/23 mg'
  };
  
  return startingDoses[medication] === dose;
}

function checkDoseEscalation(history, currentDose, medication) {
  // Simplified dose escalation check
  // In production, this would check proper titration schedule
  const treatmentDuration = calculateTreatmentDuration(history);
  
  if (treatmentDuration < 4) {
    return {
      isValid: false,
      reason: 'Insufficient treatment duration for dose escalation',
      duration: `${treatmentDuration} weeks`
    };
  }

  return {
    isValid: true,
    reason: 'Appropriate dose escalation documented',
    duration: `${treatmentDuration} weeks`
  };
}

function getMaxDoseDuration(history, medication) {
  const maxDoses = {
    'Wegovy': '2.4 mg',
    'Ozempic': '2 mg',
    'Zepbound': '15 mg',
    'Mounjaro': '15 mg',
    'Saxenda': '3 mg'
  };

  const maxDose = maxDoses[medication];
  if (!maxDose) return 0;

  // Calculate weeks on max dose
  let weeksOnMax = 0;
  for (const entry of history) {
    if (entry.dose === maxDose) {
      weeksOnMax += entry.duration || 1;
    }
  }

  return weeksOnMax;
}

function extractWeightHistory(patientData) {
  if (!patientData.observations) return [];
  
  const weights = [];
  for (const obs of patientData.observations) {
    if (obs.code?.coding?.some(c => c.code === '29463-7' || c.display?.includes('weight'))) {
      weights.push({
        date: new Date(obs.effectiveDateTime),
        value: parseNumericValue(obs.valueQuantity)
      });
    }
  }

  return weights.sort((a, b) => a.date - b.date);
}

function getBaselineWeight(history, weeksAgo) {
  const targetDate = new Date();
  targetDate.setDate(targetDate.getDate() - (weeksAgo * 7));
  
  // Find weight closest to target date
  let closest = null;
  let minDiff = Infinity;
  
  for (const entry of history) {
    const diff = Math.abs(entry.date - targetDate);
    if (diff < minDiff) {
      minDiff = diff;
      closest = entry;
    }
  }

  return closest?.value;
}

function checkForQualifyingComorbidities(conditions) {
  const qualifying = ['diabetes', 'hypertension', 'dyslipidemia', 'sleep apnea'];
  
  for (const condition of conditions) {
    const conditionText = (condition.display || '').toLowerCase();
    if (qualifying.some(q => conditionText.includes(q))) {
      return true;
    }
  }
  
  return false;
}

function checkDocumentation(patientData, requiredDocs) {
  const found = [];
  const missing = [];
  
  // Check for documentation in notes/documents
  const notes = patientData.documentReference || [];
  const noteTexts = notes.map(n => (n.description || '').toLowerCase());
  
  for (const doc of requiredDocs) {
    const docFound = noteTexts.some(text => 
      text.includes(doc.replace('_', ' '))
    );
    
    if (docFound) {
      found.push(doc);
    } else {
      missing.push(doc);
    }
  }

  return {
    complete: missing.length === 0,
    found,