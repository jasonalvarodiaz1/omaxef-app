// Enhanced criteria evaluation system for real-world PA requirements
import { CriteriaStatus, normalizeStatus } from '../constants';

export const evaluateCriterion = (patient, criterion, drug, dose, drugName) => {
  const doseInfo = getDoseInfo(drug, dose);
  
  // If criterion doesn't apply to this dose phase, mark as N/A
    if (criterion.appliesTo && !criterion.appliesTo.includes(doseInfo.doseType)) {
      return { 
        status: CriteriaStatus.NOT_APPLICABLE, 
        reason: 'Not required for this dose phase',
        displayValue: 'N/A',
        criterionType: criterion.type
      };
    }
    switch (criterion.type) {
      case 'age':
        return evaluateAge(patient, criterion);

      case 'bmi':
        return evaluateBMI(patient, criterion);

      case 'diagnosis':
        return evaluateDiagnosis(patient, criterion);

      case 'labValue':
        return evaluateLabValue(patient, criterion);

      case 'lifestyleModification':
        return evaluateLifestyleModification(patient, criterion);

      case 'priorTherapies':
        return evaluatePriorTherapies(patient, criterion);

      case 'stepTherapy':
        return evaluateStepTherapy(patient, criterion);

      case 'prescriberQualification':
        return evaluatePrescriberQualification(patient, criterion);

      case 'contraindications':
        return evaluateContraindications(patient, criterion);

      case 'doseProgression':
        return evaluateDoseProgression(patient, drug, dose, drugName, doseInfo);

      case 'weightLoss':
        return evaluateWeightLoss(patient, criterion, doseInfo);

      case 'weightMaintained':
        return evaluateWeightMaintained(patient, criterion, doseInfo);

      case 'efficacy':
        return evaluateEfficacy(patient, criterion, doseInfo);

      case 'cvdRisk':
        return evaluateCVDRisk(patient, criterion);

      case 'documentation':
        return evaluateDocumentation(patient, criterion);

      default:
        return { 
          status: 'unknown', 
          reason: `Unknown criterion type: ${criterion.type}`,
          displayValue: '?',
          criterionType: criterion.type
        };
    }
  };

  // Individual criterion evaluators

  function evaluateAge(patient, criterion) {
    const age = patient.age;
    const minAge = criterion.minAge || 18;
    const met = age >= minAge;
  
    return {
      status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'age',
      value: age,
      displayValue: `${age} years`,
      requirement: `≥${minAge} years`,
      reason: met ? `Patient is ${age} years old` : `Patient is ${age} years old (requires ≥${minAge})`,
      critical: criterion.critical || false
    };
  }

  function evaluateBMI(patient, criterion) {
    const bmi = patient.vitals?.bmi || 0;
    const cardioComorbidities = ["Type 2 Diabetes", "Hypertension", "Dyslipidemia", "Obstructive Sleep Apnea", "Cardiovascular Disease"];
    const hasComorbidity = cardioComorbidities.some(cond => 
      patient.diagnosis?.includes(cond) || patient.diagnosis?.some(d => d.includes(cond))
    );
  
    let met = false;
    let reason = '';
  
    if (bmi >= 30) {
      met = true;
      reason = `BMI ${bmi.toFixed(1)} ≥ 30 kg/m²`;
    } else if (bmi >= 27 && hasComorbidity) {
      met = true;
      const comorbidityList = cardioComorbidities.filter(c => 
        patient.diagnosis?.includes(c) || patient.diagnosis?.some(d => d.includes(c))
      ).join(', ');
      reason = `BMI ${bmi.toFixed(1)} ≥ 27 kg/m² with comorbidity (${comorbidityList})`;
    } else if (bmi >= 27 && !hasComorbidity) {
      reason = `BMI ${bmi.toFixed(1)} ≥ 27 kg/m² but missing required weight-related comorbidity`;
    } else {
      reason = `BMI ${bmi.toFixed(1)} does not meet criteria (requires ≥30, or ≥27 with comorbidity)`;
    }
  
    return {
      status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'bmi',
      value: bmi,
      displayValue: `${bmi.toFixed(1)}`,
      requirement: '≥30, or ≥27 with comorbidity',
      reason,
      hasComorbidity,
      critical: criterion.critical || false
    };
  }

  function evaluateDiagnosis(patient, criterion) {
    const requiredDiagnosis = criterion.requiredDiagnosis;
    const hasDiagnosis = patient.diagnosis?.some(d => 
      d.includes(requiredDiagnosis) || d.toLowerCase().includes(requiredDiagnosis.toLowerCase())
    );
  
    return {
      status: hasDiagnosis ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'diagnosis',
      value: hasDiagnosis,
      displayValue: hasDiagnosis ? 'Yes' : 'No',
      requirement: `${requiredDiagnosis} diagnosis`,
      reason: hasDiagnosis 
        ? `Patient has documented ${requiredDiagnosis} diagnosis`
        : `Missing required ${requiredDiagnosis} diagnosis`,
      critical: criterion.critical || false
    };
  }

  function evaluateLabValue(patient, criterion) {
    const labName = criterion.labName;
    const minValue = criterion.minValue;
  
    // Try to find lab value
    let labValue = null;
    if (patient.labs?.[labName.toLowerCase()]) {
      labValue = patient.labs[labName.toLowerCase()].value;
    } else if (patient.labs?.[labName]) {
      labValue = patient.labs[labName].value;
    }
  
    if (labValue === null) {
      return {
        status: CriteriaStatus.NOT_MET,
        criterionType: 'labValue',
        value: null,
        displayValue: 'Not documented',
        requirement: `${labName} ≥${minValue}`,
        reason: `${labName} value not documented in chart`,
        critical: criterion.critical || false
      };
    }
  
    const met = labValue >= minValue;
  
    return {
      status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'labValue',
      value: labValue,
      displayValue: `${labValue}`,
      requirement: `${labName} ≥${minValue}`,
      reason: met 
        ? `${labName} is ${labValue} (meets requirement of ≥${minValue})`
        : `${labName} is ${labValue} (requires ≥${minValue})`,
      critical: criterion.critical || false
    };
  }

  function evaluateLifestyleModification(patient, criterion) {
    const hasProgram = patient.clinicalNotes?.hasWeightProgram || false;
    const requiredDuration = criterion.requiredDuration || 6;
    const maxWeightLoss = criterion.maxWeightLoss || 5;
  
    // Check if patient has documented weight loss
    const weightLoss = patient.clinicalNotes?.weightLossPercentage || 0;
    const failedProgram = hasProgram && weightLoss < maxWeightLoss;
  
    if (!hasProgram) {
      return {
        status: CriteriaStatus.NOT_MET,
        criterionType: 'lifestyleModification',
        value: false,
        displayValue: 'Not documented',
        requirement: `${requiredDuration} month program`,
        reason: `No documented participation in lifestyle modification program for ${requiredDuration} months`,
        critical: criterion.critical || false
      };
    }
  
    return {
      status: failedProgram ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'lifestyleModification',
      value: hasProgram,
      displayValue: hasProgram ? 'Yes' : 'No',
      requirement: `${requiredDuration} month program with <${maxWeightLoss}% weight loss`,
      reason: failedProgram
        ? `Documented ${requiredDuration}+ month lifestyle program with <${maxWeightLoss}% weight loss (${weightLoss.toFixed(1)}%)`
        : hasProgram 
          ? `Lifestyle program documented but weight loss ≥${maxWeightLoss}% (${weightLoss.toFixed(1)}%) - may not qualify`
          : `No lifestyle program documented`,
      critical: criterion.critical || false
    };
  }

  function evaluatePriorTherapies(patient, criterion) {
  const minTrials = criterion.minTrials || 2;
  const therapyHistory = patient.therapyHistory || [];
  const currentMedications = patient.medications || [];
  
  // Count documented trials (can come from therapy history or current meds)
  const trialCount = therapyHistory.length + currentMedications.length;
  const met = trialCount >= minTrials;
  
  return {
    status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
    criterionType: 'priorTherapies',
    value: trialCount,
    displayValue: `${trialCount} trials`,
    requirement: `≥${minTrials} medication trials`,
    reason: met
      ? `Patient has documented ${trialCount} prior medication trial(s)`
      : `Only ${trialCount} prior medication trial(s) documented (requires ${minTrials})`,
    critical: criterion.critical || false
  };
}

function evaluateStepTherapy(patient, criterion) {
  const requiredMed = criterion.requiredMedication;
  const requiredMeds = criterion.requiredMedications;
  const preferredAlternatives = criterion.preferredAlternatives;
  const minDuration = criterion.minDuration || 3;
  
  const currentMeds = patient.medications?.map(m => m.name.toLowerCase()) || [];
  const therapyHistory = patient.therapyHistory?.map(h => h.drug?.toLowerCase()) || [];
  const allMeds = [...new Set([...currentMeds, ...therapyHistory])];
  
  // Check for single required medication
  if (requiredMed) {
    const hasMed = allMeds.some(m => m.includes(requiredMed.toLowerCase()));
    return {
      status: hasMed ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'stepTherapy',
      value: hasMed,
      displayValue: hasMed ? 'Completed' : 'Not documented',
      requirement: `Trial of ${requiredMed} for ${minDuration}+ months`,
      reason: hasMed
        ? `Patient has documented trial of ${requiredMed}`
        : `No documented trial of ${requiredMed} for ${minDuration}+ months`,
      critical: criterion.critical || false
    };
  }
  
  // Check for multiple required medications
  if (requiredMeds) {
    const metCount = requiredMeds.filter(req => 
      allMeds.some(m => m.includes(req.toLowerCase()))
    ).length;
    const met = metCount >= requiredMeds.length;
    
    return {
      status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'stepTherapy',
      value: metCount,
      displayValue: `${metCount}/${requiredMeds.length} completed`,
      requirement: `Trial of all: ${requiredMeds.join(', ')}`,
      reason: met
        ? `Patient has completed trials of all required medications`
        : `Only ${metCount} of ${requiredMeds.length} required medication trials documented`,
      critical: criterion.critical || false
    };
  }
  
  // Check for preferred alternatives (must try these first)
  if (preferredAlternatives) {
    const triedPreferred = preferredAlternatives.some(alt => 
      allMeds.some(m => m.includes(alt.toLowerCase()))
    );
    
    return {
      status: triedPreferred ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
      criterionType: 'stepTherapy',
      value: triedPreferred,
      displayValue: triedPreferred ? 'Completed' : 'Required',
      requirement: `Trial of preferred alternative: ${preferredAlternatives.join(' OR ')}`,
      reason: triedPreferred
        ? `Patient has tried preferred alternative medication`
        : `Must try ${preferredAlternatives.join(' OR ')} first (step therapy requirement)`,
      critical: criterion.critical || false
    };
  }
  
  return {
    status: CriteriaStatus.NOT_MET,
    criterionType: 'stepTherapy',
    value: false,
    displayValue: 'Not documented',
    requirement: 'Step therapy required',
    reason: 'Step therapy requirements not documented',
    critical: criterion.critical || false
  };
}

function evaluatePrescriberQualification(patient, criterion) {
  // In real system, would check prescriber credentials
  // For now, assume qualified (would need to integrate with provider database)
  
  return {
    status: CriteriaStatus.MET,
    criterionType: 'prescriberQualification',
    value: true,
    displayValue: 'Assumed qualified',
    requirement: 'Board certified specialist',
    reason: 'Prescriber qualification assumed (verify board certification)',
    critical: criterion.critical || false
  };
}

function evaluateContraindications(patient, criterion) {
  // Check for common contraindications in diagnosis list
  const contraindications = ['medullary thyroid', 'MTC', 'MEN 2', 'pancreatitis', 'pregnancy'];
  const hasContraindication = contraindications.some(contra => 
    patient.diagnosis?.some(d => d.toLowerCase().includes(contra.toLowerCase()))
  );
  
  return {
    status: hasContraindication ? CriteriaStatus.NOT_MET : CriteriaStatus.MET,
    criterionType: 'contraindications',
    value: !hasContraindication,
    displayValue: hasContraindication ? 'Present' : 'None documented',
    requirement: 'No contraindications',
    reason: hasContraindication
      ? 'Patient has documented contraindication - medication NOT appropriate'
      : 'No documented contraindications',
    critical: true
  };
}

function evaluateDoseProgression(patient, drug, requestedDose, drugName, doseInfo) {
  const drugHistory = patient.therapyHistory?.find(h => String(h.drug).toLowerCase() === String(drugName).toLowerCase());

  // Normalize requestedDose and currentDose comparisons to strings for safety
  const normalizeValue = v => (v === null || v === undefined) ? null : String(v);

  const requestedDoseNorm = normalizeValue(requestedDose);
  const currentDoseNorm = normalizeValue(drugHistory?.currentDose);

  if (doseInfo?.isStartingDose) {
    if (drugHistory && (drugHistory.status === "active" || drugHistory.status === "ongoing")) {
      return {
        status: CriteriaStatus.NOT_MET,
        criterionType: 'doseProgression',
        reason: `Patient is already on ${drugName}. Cannot restart at starting dose.`,
        displayValue: 'Cannot restart',
        currentDose: drugHistory.currentDose
      };
    }
    return {
      status: CriteriaStatus.MET,
      criterionType: 'doseProgression',
      reason: 'Patient is naive to this medication',
      displayValue: 'Drug naive'
    };
  }

  if (!drugHistory) {
    return {
      status: CriteriaStatus.NOT_MET,
      criterionType: 'doseProgression',
      reason: `Patient has no history with ${drugName}. Must start at starting dose.`,
      displayValue: 'No prior therapy'
    };
  }

  const doseSchedule = drug?.doseSchedule || [];
  if (!Array.isArray(doseSchedule) || doseSchedule.length === 0) {
    return { status: CriteriaStatus.MET, criterionType: 'doseProgression', reason: 'No dose schedule defined', displayValue: 'N/A' };
  }

  // Map schedule values to strings for robust comparison
  const scheduleValues = doseSchedule.map(d => String(d.value));
  const requestedDoseIndex = scheduleValues.indexOf(requestedDoseNorm);
  const currentDoseIndex = scheduleValues.indexOf(currentDoseNorm);

  // If either dose isn't recognized in the schedule, mark NOT_MET (defensive)
  if (requestedDoseIndex === -1 || currentDoseIndex === -1) {
    return {
      status: CriteriaStatus.NOT_MET,
      criterionType: 'doseProgression',
      reason: `Dose not recognized in schedule (requested: ${requestedDoseNorm}, current: ${currentDoseNorm}).`,
      displayValue: 'Unrecognized dose',
      currentDose: drugHistory?.currentDose
    };
  }

  if (requestedDoseNorm === currentDoseNorm) {
    return {
      status: CriteriaStatus.MET,
      criterionType: 'doseProgression',
      reason: `Continuing current dose: ${requestedDoseNorm}`,
      displayValue: 'Continuation',
      currentDose: drugHistory.currentDose
    };
  }

  if (requestedDoseIndex === currentDoseIndex + 1) {
    return {
      status: CriteriaStatus.MET,
      criterionType: 'doseProgression',
      reason: `Progressing from ${drugHistory.currentDose} to ${requestedDoseNorm}`,
      displayValue: 'Next dose',
      previousDose: drugHistory.currentDose,
      newDose: requestedDoseNorm
    };
  }

  if (requestedDoseIndex < currentDoseIndex) {
    return {
      status: CriteriaStatus.NOT_MET,
      criterionType: 'doseProgression',
      reason: `Cannot reduce dose from ${drugHistory.currentDose} to ${requestedDoseNorm}`,
      displayValue: 'Going backwards',
      currentDose: drugHistory.currentDose
    };
  }

  // Skipping forward too many steps
  return {
    status: CriteriaStatus.NOT_MET,
    criterionType: 'doseProgression',
    reason: `Cannot skip from ${drugHistory.currentDose} to ${requestedDoseNorm}. Must progress sequentially.`,
    displayValue: 'Skipping doses',
    currentDose: drugHistory.currentDose
  };
}

function evaluateWeightLoss(patient, criterion, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: CriteriaStatus.NOT_APPLICABLE,
      reason: 'Not required for starting dose',
      displayValue: 'N/A',
      criterionType: 'weightLoss'
    };
  }
  
  const percentage = patient.clinicalNotes?.initialWeightLossPercentage || 
                     patient.clinicalNotes?.weightLossPercentage || 0;
  const required = criterion.minPercentage || 5;
  const timeframe = criterion.timeframe || '12-16 weeks';
  const met = percentage >= required;
  
  return {
    status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
    criterionType: 'weightLoss',
    value: percentage,
    displayValue: `${percentage}%`,
    requirement: `≥${required}% within ${timeframe}`,
    reason: met
      ? `Patient achieved ${percentage}% weight loss from baseline`
      : `Patient only achieved ${percentage}% weight loss (requires ${required}% within ${timeframe})`,
    critical: false
  };
}

function evaluateWeightMaintained(patient, criterion, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: CriteriaStatus.NOT_APPLICABLE,
      reason: 'Not required for starting dose',
      displayValue: 'N/A',
      criterionType: 'weightMaintained'
    };
  }
  
  const currentPercentage = patient.clinicalNotes?.currentWeightLossPercentage || 
                           patient.clinicalNotes?.weightLossPercentage || 0;
  const required = criterion.minPercentage || 5;
  const maintenanceDuration = patient.clinicalNotes?.weightMaintenanceMonths || 0;
  const requiredDuration = criterion.minMonths || 3;
  
  const met = currentPercentage >= required && maintenanceDuration >= requiredDuration;
  
  return {
    status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
    criterionType: 'weightMaintained',
    value: currentPercentage,
    displayValue: `${currentPercentage}%`,
    requirement: `≥${required}% maintained for ${requiredDuration}+ months`,
    reason: met
      ? `Patient has maintained ${currentPercentage}% weight loss for ${maintenanceDuration} months`
      : maintenanceDuration < requiredDuration
        ? `Patient has only maintained weight loss for ${maintenanceDuration} months (requires ${requiredDuration})`
        : `Patient currently at ${currentPercentage}% weight loss (requires ${required}% maintained)`,
    critical: false
  };
}

function evaluateEfficacy(patient, criterion) {
  // Placeholder for efficacy evaluation (would check A1C improvement, weight loss, etc.)
  return {
    status: CriteriaStatus.MET,
    criterionType: 'efficacy',
    value: true,
    displayValue: 'Documented',
    requirement: 'Clinical improvement',
    reason: 'Clinical efficacy documented (assumed for continuation)',
    critical: false
  };
}

function evaluateCVDRisk(patient, criterion) {
  const cvdConditions = ['Cardiovascular Disease', 'Coronary Artery Disease', 'Myocardial Infarction', 'Stroke', 'Heart Failure'];
  const hasCVD = cvdConditions.some(cond => 
    patient.diagnosis?.some(d => d.includes(cond))
  );
  
  // High risk factors
  const riskFactors = ['Hypertension', 'Dyslipidemia', 'Type 2 Diabetes'];
  const riskFactorCount = riskFactors.filter(rf => 
    patient.diagnosis?.some(d => d.includes(rf))
  ).length;
  
  const highRisk = hasCVD || riskFactorCount >= 2;
  
  return {
    status: highRisk ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
    criterionType: 'cvdRisk',
    value: highRisk,
    displayValue: highRisk ? 'High risk' : 'Not documented',
    requirement: 'CVD or high CV risk',
    reason: hasCVD
      ? 'Patient has documented cardiovascular disease'
      : riskFactorCount >= 2
        ? `Patient has ${riskFactorCount} CV risk factors (high risk)`
        : `Patient has ${riskFactorCount} CV risk factor(s) - may not meet high-risk criteria`,
    critical: false
  };
}

function evaluateDocumentation(patient, criterion) {
  // Check for clinical documentation
  const hasChartNotes = patient.clinicalNotes && Object.keys(patient.clinicalNotes).length > 0;
  const hasMedications = patient.medications && patient.medications.length > 0;
  const hasDiagnoses = patient.diagnosis && patient.diagnosis.length > 0;
  const hasLabs = patient.labs && Object.keys(patient.labs).length > 0;
  const hasTherapyHistory = patient.therapyHistory && patient.therapyHistory.length > 0;
  
  // Documentation is met if multiple components exist
  const documentationScore = [hasChartNotes, hasMedications, hasDiagnoses, hasLabs, hasTherapyHistory].filter(Boolean).length;
  const met = documentationScore >= 3; // Need at least 3 types of documentation
  
  // Build detailed reason
  let reason = '';
  if (met) {
    const available = [];
    if (hasChartNotes) available.push('clinical notes');
    if (hasMedications) available.push('medication list');
    if (hasDiagnoses) available.push('diagnosis codes');
    if (hasLabs) available.push('lab results');
    if (hasTherapyHistory) available.push('therapy history');
    reason = `Documentation available: ${available.join(', ')}`;
  } else {
    const missing = [];
    if (!hasChartNotes) missing.push('clinical notes');
    if (!hasMedications) missing.push('medication list');
    if (!hasDiagnoses) missing.push('diagnosis codes');
    if (!hasLabs) missing.push('lab results');
    if (!hasTherapyHistory) missing.push('therapy history');
    reason = `Incomplete documentation. Missing: ${missing.join(', ')}`;
  }
  
  return {
    status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
    criterionType: 'documentation',
    value: documentationScore,
    displayValue: met ? `${documentationScore}/5 components` : 'Incomplete',
    requirement: 'Complete medical documentation',
    reason,
    critical: criterion.critical || false
  };
}

// Helper function to determine dose info
function getDoseInfo(drug, dose) {
  // Normalize dose to string for consistent comparison
  const normalizedDose = String(dose);
  
  if (drug.doseSchedule) {
    const doseInfo = drug.doseSchedule.find(d => String(d.value) === normalizedDose);
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
    const isStartingDose = drug.startingDoses.some(d => String(d) === normalizedDose);
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
  const normalized = normalizeStatus(result.status);
  switch (normalized) {
    case CriteriaStatus.MET:
      return 'yes';
    case CriteriaStatus.NOT_MET:
      return 'no';
    case CriteriaStatus.NOT_APPLICABLE:
      return 'not_applicable';
    case CriteriaStatus.WARNING:
      return 'warning';
    default:
      return null;
  }
};

// Calculate PA approval likelihood based on criteria evaluation results
export const calculateApprovalLikelihood = (criteriaResults) => {
  const applicable = criteriaResults.filter(r => normalizeStatus(r.status) !== CriteriaStatus.NOT_APPLICABLE);
  const met = applicable.filter(r => normalizeStatus(r.status) === CriteriaStatus.MET).length;
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
  const criticalCriteria = applicable.filter(r => r.critical === true);
  const criticalFailures = criticalCriteria.filter(r => normalizeStatus(r.status) === CriteriaStatus.NOT_MET);
  
  if (criticalFailures.length > 0) {
    const failedCriterion = criticalFailures[0];
    return { 
      likelihood: 5, 
      confidence: 'high',
      reason: `Critical requirement not met: ${failedCriterion.reason}`,
      color: 'red',
      action: 'Will be denied - do not submit PA without addressing critical criteria'
    };
  }
  
  // All criteria met
  if (met === total) {
    return { 
      likelihood: 95, 
      confidence: 'high',
      reason: 'All criteria met - strong approval candidate',
      color: 'green',
      action: 'Proceed with PA submission'
    };
  }
  
  // Calculate percentage
  const percentage = (met / total) * 100;
  
  // Close to approval (80%+)
  if (percentage >= 80) {
    return { 
      likelihood: 75, 
      confidence: 'medium',
      reason: `${met}/${total} criteria met - likely approval with additional documentation`,
      color: 'yellow',
      action: 'Submit PA with detailed justification for missing criteria'
    };
  }
  
  // Some criteria met but not enough (50-79%)
  if (percentage >= 50) {
    return { 
      likelihood: 40, 
      confidence: 'low',
      reason: `Only ${met}/${total} criteria met - significant gaps`,
      color: 'orange',
      action: 'Address missing criteria before submitting - high denial risk'
    };
  }
  
  // Most criteria not met
  return { 
    likelihood: 15, 
    confidence: 'low',
    reason: `Only ${met}/${total} criteria met - multiple requirements not satisfied`,
    color: 'red',
    action: 'Do not submit - patient does not meet eligibility requirements'
  };
};

// Placeholder implementation for evaluating patient criteria
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
    ],
  };
};