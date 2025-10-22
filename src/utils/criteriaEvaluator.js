// Comprehensive criteria evaluation system
// Returns structured results with status, value, and context

export const evaluateCriterion = (patient, criterion, drug, dose, drugName) => {
  const doseInfo = getDoseInfo(drug, dose);
  
  // If criterion doesn't apply to this dose phase, mark as N/A
  if (criterion.appliesTo && !criterion.appliesTo.includes(doseInfo.doseType)) {
    return { 
      status: 'not_applicable', 
      reason: 'Not required for this dose phase',
      displayValue: 'N/A'
    };
  }
  
  switch (criterion.type) {
    case 'age':
      return evaluateAge(patient, criterion);
      
    case 'bmi':
      return evaluateBMI(patient, criterion);
      
    case 'doseProgression':
      return evaluateDoseProgression(patient, drug, dose, drugName, doseInfo);
      
    case 'maintenance':
      return evaluateMaintenance(patient, doseInfo);
      
    case 'weightLoss':
      return evaluateWeightLoss(patient, criterion, doseInfo);
      
    case 'weightMaintained':
      return evaluateWeightMaintained(patient, criterion, doseInfo);
      
    case 'weightProgram':
      return evaluateWeightProgram(patient);
      
    case 'documentation':
      return evaluateDocumentation(patient);
      
    default:
      return { 
        status: 'unknown', 
        reason: `Unknown criterion type: ${criterion.type}`,
        displayValue: '?'
      };
  }
};

// Individual criterion evaluators

function evaluateAge(patient, criterion) {
  const age = patient.age;
  const minAge = criterion.minAge || 18;
  const met = age >= minAge;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'age',
    value: age,
    displayValue: `${age} years`,
    requirement: `≥${minAge} years`,
    reason: met ? `Patient is ${age} years old` : `Patient is ${age} years old (requires ≥${minAge})`
  };
}

function evaluateBMI(patient, criterion) {
  const bmi = patient.vitals?.bmi || 0;
  const cardioComorbidities = ["Type 2 Diabetes", "Hypertension", "Dyslipidemia"];
  const hasComorbidity = cardioComorbidities.some(cond => patient.diagnosis.includes(cond));
  
  let met = false;
  let reason = '';
  
  if (bmi >= 30) {
    met = true;
    reason = `BMI ${bmi} ≥ 30`;
  } else if (bmi >= 27 && hasComorbidity) {
    met = true;
    const comorbidityList = cardioComorbidities.filter(c => patient.diagnosis.includes(c)).join(', ');
    reason = `BMI ${bmi} ≥ 27 with comorbidity (${comorbidityList})`;
  } else {
    reason = `BMI ${bmi} does not meet criteria (requires ≥30, or ≥27 with comorbidity)`;
  }
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'bmi',
    value: bmi,
    displayValue: `${bmi}`,
    requirement: '≥30, or ≥27 with comorbidity',
    reason,
    hasComorbidity
  };
}

function evaluateDoseProgression(patient, drug, requestedDose, drugName, doseInfo) {
  const drugHistory = patient.therapyHistory?.find(h => h.drug === drugName);
  
  // Starting dose logic
  if (doseInfo.isStartingDose) {
    if (drugHistory && drugHistory.status === "active") {
      return {
        status: 'not_met',
        criterionType: 'doseProgression',
        reason: `Patient is already on ${drugName}. Cannot restart at starting dose.`,
        displayValue: 'Cannot restart',
        currentDose: drugHistory.currentDose
      };
    }
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: 'Patient is naive to this medication',
      displayValue: 'Drug naive'
    };
  }
  
  // Non-starting dose logic
  if (!drugHistory) {
    return {
      status: 'not_met',
      criterionType: 'doseProgression',
      reason: `Patient has no history with ${drugName}. Must start at starting dose.`,
      displayValue: 'No prior therapy'
    };
  }
  
  const doseSchedule = drug.doseSchedule;
  if (!doseSchedule) {
    return { status: 'met', criterionType: 'doseProgression', reason: 'No dose schedule defined', displayValue: 'N/A' };
  }
  
  const requestedDoseIndex = doseSchedule.findIndex(d => d.value === requestedDose);
  const currentDoseIndex = doseSchedule.findIndex(d => d.value === drugHistory.currentDose);
  
  // Continuation of current dose
  if (requestedDose === drugHistory.currentDose) {
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: `Continuing current dose: ${requestedDose}`,
      displayValue: 'Continuation',
      currentDose: drugHistory.currentDose
    };
  }
  
  // Progression to next dose
  if (requestedDoseIndex === currentDoseIndex + 1) {
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: `Progressing from ${drugHistory.currentDose} to ${requestedDose}`,
      displayValue: 'Next dose',
      previousDose: drugHistory.currentDose,
      newDose: requestedDose
    };
  }
  
  // Invalid progression
  if (requestedDoseIndex < currentDoseIndex) {
    return {
      status: 'not_met',
      criterionType: 'doseProgression',
      reason: `Cannot reduce dose from ${drugHistory.currentDose} to ${requestedDose}`,
      displayValue: 'Going backwards',
      currentDose: drugHistory.currentDose
    };
  }
  
  return {
    status: 'not_met',
    criterionType: 'doseProgression',
    reason: `Cannot skip from ${drugHistory.currentDose} to ${requestedDose}. Must progress sequentially.`,
    displayValue: 'Skipping doses',
    currentDose: drugHistory.currentDose
  };
}

function evaluateMaintenance(patient, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: 'not_applicable',
      reason: 'Not required for starting dose',
      displayValue: 'N/A'
    };
  }
  
  const months = patient.clinicalNotes?.monthsOnMaintenanceDose || 0;
  const required = 3;
  const met = months >= required;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'maintenance',
    value: months,
    displayValue: `${months} months`,
    requirement: `≥${required} months`,
    reason: met 
      ? `Patient has been on maintenance dose for ${months} months`
      : `Patient has only been on maintenance dose for ${months} months (requires ${required})`
  };
}

function evaluateWeightLoss(patient, criterion, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: 'not_applicable',
      reason: 'Not required for starting dose',
      displayValue: 'N/A'
    };
  }
  
  // Initial weight loss achievement (peak weight loss)
  const percentage = patient.clinicalNotes?.initialWeightLossPercentage || 
                     patient.clinicalNotes?.weightLossPercentage || 0;
  const required = criterion.minPercentage || 5;
  const met = percentage >= required;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'weightLoss',
    value: percentage,
    displayValue: `${percentage}%`,
    requirement: `≥${required}%`,
    reason: met
      ? `Patient achieved ${percentage}% weight loss from baseline`
      : `Patient only achieved ${percentage}% weight loss (requires ${required}%)`
  };
}

function evaluateWeightMaintained(patient, criterion, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: 'not_applicable',
      reason: 'Not required for starting dose',
      displayValue: 'N/A'
    };
  }
  
  // Current sustained weight loss (must maintain over time)
  const currentPercentage = patient.clinicalNotes?.currentWeightLossPercentage || 
                           patient.clinicalNotes?.weightLossPercentage || 0;
  const required = criterion.minPercentage || 5;
  const maintenanceDuration = patient.clinicalNotes?.weightMaintenanceMonths || 0;
  const requiredDuration = criterion.minMonths || 3;
  
  const met = currentPercentage >= required && maintenanceDuration >= requiredDuration;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'weightMaintained',
    value: currentPercentage,
    displayValue: `${currentPercentage}%`,
    requirement: `≥${required}% maintained for ${requiredDuration}+ months`,
    reason: met
      ? `Patient has maintained ${currentPercentage}% weight loss for ${maintenanceDuration} months`
      : maintenanceDuration < requiredDuration
        ? `Patient has only maintained weight loss for ${maintenanceDuration} months (requires ${requiredDuration})`
        : `Patient currently at ${currentPercentage}% weight loss (requires ${required}% maintained)`
  };
}

function evaluateWeightProgram(patient) {
  const enrolled = patient.clinicalNotes?.hasWeightProgram || false;
  
  return {
    status: enrolled ? 'met' : 'not_met',
    criterionType: 'weightProgram',
    value: enrolled,
    displayValue: enrolled ? 'Yes' : 'No',
    requirement: 'Required',
    reason: enrolled
      ? 'Patient is enrolled in weight management program'
      : 'Patient is not enrolled in weight management program'
  };
}

function evaluateDocumentation(patient) {
  // Check for clinical documentation
  const hasChartNotes = patient.clinicalNotes && Object.keys(patient.clinicalNotes).length > 0;
  const hasAttachments = patient.attachments && patient.attachments.length > 0;
  const hasTherapyHistory = patient.therapyHistory && patient.therapyHistory.length > 0;
  
  // Documentation is met if any of these exist
  const met = hasChartNotes || hasAttachments || hasTherapyHistory;
  
  // Build detailed reason
  let reason = '';
  if (met) {
    const available = [];
    if (hasChartNotes) available.push('clinical notes');
    if (hasAttachments) available.push(`${patient.attachments.length} attachment(s)`);
    if (hasTherapyHistory) available.push('therapy history');
    reason = `Documentation available: ${available.join(', ')}`;
  } else {
    reason = 'Missing required clinical documentation and chart notes';
  }
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'documentation',
    value: met,
    displayValue: met ? 'Available' : 'Missing',
    requirement: 'Required',
    reason
  };
}

// Helper function to determine dose info
function getDoseInfo(drug, dose) {
  if (drug.doseSchedule) {
    const doseInfo = drug.doseSchedule.find(d => d.value === dose);
    if (doseInfo) {
      return {
        isStartingDose: doseInfo.phase === "starting",
        isTitrationDose: doseInfo.phase === "titration",
        isMaintenanceDose: doseInfo.phase === "maintenance",
        doseType: doseInfo.phase,
        duration: doseInfo.duration
      };
    }
  }
  
  if (drug.startingDoses) {
    const isStartingDose = drug.startingDoses.includes(dose);
    return {
      isStartingDose,
      isTitrationDose: false,
      isMaintenanceDose: !isStartingDose,
      doseType: isStartingDose ? "starting" : "maintenance",
      duration: null
    };
  }
  
  return {
    isStartingDose: false,
    isTitrationDose: false,
    isMaintenanceDose: true,
    doseType: "maintenance",
    duration: null
  };
}

// Convert status to simple yes/no/not_applicable for backward compatibility
export const getSimpleStatus = (result) => {
  switch (result.status) {
    case 'met':
      return 'yes';
    case 'not_met':
      return 'no';
    case 'not_applicable':
      return 'not_applicable';
    default:
      return null;
  }
};

// Calculate PA approval likelihood based on criteria evaluation results
export const calculateApprovalLikelihood = (criteriaResults) => {
  const applicable = criteriaResults.filter(r => r.status !== 'not_applicable');
  const met = applicable.filter(r => r.status === 'met').length;
  const total = applicable.length;
  
  if (total === 0) {
    return {
      likelihood: 0,
      confidence: 'unknown',
      reason: 'No applicable criteria to evaluate',
      color: 'gray',
      action: 'Unable to determine approval likelihood'
    };
  }
  
  // Critical failures (automatic denial)
  // Age, BMI, and dose progression are hard requirements
  const criticalCriteria = ['age', 'bmi', 'doseProgression'];
  const hasCriticalFailure = applicable.some(r => 
    r.status === 'not_met' && 
    r.criterionType && 
    criticalCriteria.includes(r.criterionType)
  );
  
  if (hasCriticalFailure) {
    const failedCriterion = applicable.find(r => 
      r.status === 'not_met' && 
      r.criterionType && 
      criticalCriteria.includes(r.criterionType)
    );
    return { 
      likelihood: 5, 
      confidence: 'high',
      reason: `Critical eligibility criteria not met: ${failedCriterion?.reason || 'eligibility requirement'}`,
      color: 'red',
      action: 'Will be denied - do not submit PA'
    };
  }
  
  // All criteria met
  if (met === total) {
    return { 
      likelihood: 95, 
      confidence: 'high',
      reason: 'All criteria met',
      color: 'green',
      action: 'Proceed with PA submission'
    };
  }
  
  // Calculate percentage
  const percentage = (met / total) * 100;
  
  // Close to approval (80%+)
  if (percentage >= 80) {
    return { 
      likelihood: 70, 
      confidence: 'medium',
      reason: `${met}/${total} criteria met - may be approved with additional documentation`,
      color: 'yellow',
      action: 'Consider submitting PA with detailed justification'
    };
  }
  
  // Some criteria met but not enough (50-79%)
  if (percentage >= 50) {
    return { 
      likelihood: 40, 
      confidence: 'low',
      reason: `Only ${met}/${total} criteria met`,
      color: 'orange',
      action: 'Work on meeting more criteria before submitting'
    };
  }
  
  // Most criteria not met
  return { 
    likelihood: 15, 
    confidence: 'low',
    reason: `Only ${met}/${total} criteria met - significant gaps`,
    color: 'red',
    action: 'Do not submit - patient does not meet eligibility requirements'
  };
};

// Placeholder implementation for evaluating patient criteria
// Replace with actual logic as needed
export const evaluatePatientCriteria = (patientData, drugDetails) => {
  return {
    overallStatus: 'approved',
    overallLikelihood: 85,
    criteriaList: [
      {
        criterion: 'age',
        status: 'pass',
        name: 'Age Requirement',
        reason: 'Patient meets minimum age requirement',
        value: patientData.demographics?.age,
        critical: true,
      },
      {
        criterion: 'bmi',
        status: 'pass',
        name: 'BMI Requirement',
        reason: 'Patient meets BMI criteria',
        value: patientData.calculatedValues?.bmi,
        critical: true,
      },
      {
        criterion: 'comorbidities',
        status: 'pass',
        name: 'Comorbidities',
        reason: 'Patient has documented weight-related comorbidities',
        value: true,
        critical: false,
      },
    ],
  };
};
