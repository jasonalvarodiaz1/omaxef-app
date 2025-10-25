// Enhanced criteria evaluation system for real-world PA requirements

export const evaluateCriterion = (patient, criterion, drug, dose, drugName) => {
  const doseInfo = getDoseInfo(drug, dose);
  
  // If criterion doesn't apply to this dose phase, mark as N/A
  if (criterion.appliesTo && !criterion.appliesTo.includes(doseInfo.doseType)) {
    return { 
      status: 'not_applicable', 
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
    status: met ? 'met' : 'not_met',
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
    status: met ? 'met' : 'not_met',
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
    status: hasDiagnosis ? 'met' : 'not_met',
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
      status: 'not_met',
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
    status: met ? 'met' : 'not_met',
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
      status: 'not_met',
      criterionType: 'lifestyleModification',
      value: false,
      displayValue: 'Not documented',
      requirement: `${requiredDuration} month program`,
      reason: `No documented participation in lifestyle modification program for ${requiredDuration} months`,
      critical: criterion.critical || false
    };
  }
  
  return {
    status: failedProgram ? 'met' : 'not_met',
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
    status: met ? 'met' : 'not_met',
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
      status: hasMed ? 'met' : 'not_met',
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
      status: met ? 'met' : 'not_met',
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
      status: triedPreferred ? 'met' : 'not_met',
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
    status: 'not_met',
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
    status: 'met',
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
    status: hasContraindication ? 'not_met' : 'met',
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
  const drugHistory = patient.therapyHistory?.find(h => h.drug === drugName);
  const doseSchedule = drug.doseSchedule;
  
  if (!doseSchedule) {
    return { 
      status: 'met', 
      criterionType: 'doseProgression', 
      reason: 'No dose schedule defined', 
      displayValue: 'N/A',
      critical: false
    };
  }
  
  // Find requested dose in schedule
  const requestedDoseIndex = doseSchedule.findIndex(d => d.value === requestedDose);
  
  if (requestedDoseIndex === -1) {
    return {
      status: 'not_met',
      criterionType: 'doseProgression',
      reason: `${requestedDose} is not a valid dose for ${drugName}`,
      displayValue: '❌ Invalid dose',
      critical: true
    };
  }
  
  const requestedDoseInfo = doseSchedule[requestedDoseIndex];
  
  // CASE 1: Patient has NEVER been on this medication (drug naive)
  if (!drugHistory || drugHistory.status !== "active") {
    // Must start with starting dose (first dose in schedule)
    const startingDose = doseSchedule.find(d => d.phase === "starting");
    
    if (!startingDose) {
      // Fallback if no explicit starting phase
      const firstDose = doseSchedule[0];
      if (requestedDose === firstDose.value) {
        return {
          status: 'met',
          criterionType: 'doseProgression',
          reason: `Patient is drug-naive. Starting with ${requestedDose} (first dose in schedule) is appropriate.`,
          displayValue: '✅ Starting dose',
          critical: false
        };
      } else {
        return {
          status: 'not_met',
          criterionType: 'doseProgression',
          reason: `Patient has never been on ${drugName}. Must start with ${firstDose.value} (starting dose), not ${requestedDose}.`,
          displayValue: '❌ Must start at beginning',
          requiredDose: firstDose.value,
          critical: true
        };
      }
    }
    
    if (requestedDose === startingDose.value) {
      return {
        status: 'met',
        criterionType: 'doseProgression',
        reason: `Patient is drug-naive (never been on ${drugName}). Starting with ${requestedDose} (starting dose) is appropriate.`,
        displayValue: '✅ Starting dose - Drug naive',
        critical: false
      };
    } else {
      return {
        status: 'not_met',
        criterionType: 'doseProgression',
        reason: `Patient has NEVER been on ${drugName}. Cannot start at ${requestedDose}. Must begin with ${startingDose.value} (starting dose) per titration protocol.`,
        displayValue: '❌ Cannot skip starting dose',
        requiredDose: startingDose.value,
        critical: true
      };
    }
  }
  
  // CASE 2: Patient is CURRENTLY on this medication
  const currentDose = drugHistory.currentDose;
  const currentDoseIndex = doseSchedule.findIndex(d => d.value === currentDose);
  
  // Check if patient is on max dose
  const maxDose = doseSchedule[doseSchedule.length - 1];
  const isOnMaxDose = currentDose === maxDose.value;
  
  // CASE 2A: Continuation - requesting SAME dose (refill)
  if (requestedDose === currentDose) {
    // Check if PA expired and needs reauthorization
    const paExpired = drugHistory.paExpirationDate && new Date(drugHistory.paExpirationDate) < new Date();
    
    const currentDoseStartDate = drugHistory.doses?.find(d => d.value === currentDose)?.startDate;
    const dosePhase = doseSchedule[currentDoseIndex]?.phase || 'unknown';
    
    if (paExpired) {
      return {
        status: 'met',
        criterionType: 'doseProgression',
        reason: `Continuation of current ${dosePhase} dose ${requestedDose}. PA expired on ${drugHistory.paExpirationDate} - REAUTHORIZATION REQUIRED.`,
        displayValue: '⚠️ PA Reauth Required',
        needsReauthorization: true,
        expirationDate: drugHistory.paExpirationDate,
        currentDose: currentDose,
        isMaxDose: isOnMaxDose,
        critical: false
      };
    }
    
    let displayText = '✅ Continuation';
    if (isOnMaxDose) {
      displayText = '✅ Max dose - Continuation';
    }
    
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: `Continuation of current ${dosePhase} dose ${requestedDose}.${isOnMaxDose ? ' Patient is on maximum dose.' : ''} Patient has been on this dose since ${currentDoseStartDate || 'N/A'}.`,
      displayValue: displayText,
      currentDose: currentDose,
      isMaxDose: isOnMaxDose,
      critical: false
    };
  }
  
  // CASE 2B: Titration UP - requesting NEXT dose in schedule
  if (requestedDoseIndex === currentDoseIndex + 1) {
    // Check if already on max dose - cannot escalate further
    if (isOnMaxDose) {
      return {
        status: 'not_met',
        criterionType: 'doseProgression',
        reason: `Patient is already on maximum dose (${currentDose}). Cannot escalate to ${requestedDose} - there is no higher dose available.`,
        displayValue: '❌ Already at max dose',
        currentDose: currentDose,
        isMaxDose: true,
        critical: true
      };
    }
    
    // Check if patient has been on current dose long enough
    const currentDoseStartDate = drugHistory.doses?.find(d => d.value === currentDose)?.startDate;
    const daysSinceDoseStart = currentDoseStartDate 
      ? Math.floor((new Date() - new Date(currentDoseStartDate)) / (1000 * 60 * 60 * 24))
      : 999; // If no date, assume enough time has passed
    
    const minDaysOnDose = 28; // Typically 4 weeks minimum per dose
    
    if (daysSinceDoseStart < minDaysOnDose) {
      return {
        status: 'not_met',
        criterionType: 'doseProgression',
        reason: `Patient has only been on ${currentDose} for ${daysSinceDoseStart} days. Must remain on each dose for at least ${minDaysOnDose} days (4 weeks) before titrating to avoid side effects and ensure safety.`,
        displayValue: `❌ Too soon (${daysSinceDoseStart}d)`,
        currentDose: currentDose,
        daysOnCurrentDose: daysSinceDoseStart,
        requiredDays: minDaysOnDose,
        critical: true
      };
    }
    
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: `Appropriate dose escalation from ${currentDose} to ${requestedDose} per titration schedule. Patient has been on ${currentDose} for ${daysSinceDoseStart} days (≥${minDaysOnDose} days required).`,
      displayValue: '✅ Next dose - Escalation',
      previousDose: currentDose,
      newDose: requestedDose,
      daysOnPreviousDose: daysSinceDoseStart,
      critical: false
    };
  }
  
  // CASE 2C: Dose REDUCTION (de-escalation)
  if (requestedDoseIndex < currentDoseIndex) {
    // Dose reduction may be appropriate for tolerability issues
    return {
      status: 'met',
      criterionType: 'doseProgression',
      reason: `Dose reduction from ${currentDose} to ${requestedDose}. May be appropriate for tolerability issues (nausea, vomiting, GI side effects). Document clinical reason for de-escalation in patient chart.`,
      displayValue: '⚠️ De-escalation',
      currentDose: currentDose,
      newDose: requestedDose,
      requiresJustification: true,
      critical: false
    };
  }
  
  // CASE 2D: Skipping doses (NOT ALLOWED)
  if (requestedDoseIndex > currentDoseIndex + 1) {
    const nextAppropriateDose = doseSchedule[currentDoseIndex + 1].value;
    return {
      status: 'not_met',
      criterionType: 'doseProgression',
      reason: `Cannot skip from ${currentDose} to ${requestedDose}. Must progress sequentially through titration schedule to ensure patient safety and tolerability. Next appropriate dose is ${nextAppropriateDose}.`,
      displayValue: '❌ Skipping doses',
      currentDose: currentDose,
      requestedDose: requestedDose,
      requiredNextDose: nextAppropriateDose,
      critical: true
    };
  }
  
  // CASE 3: Should never reach here, but handle edge case
  return {
    status: 'not_met',
    criterionType: 'doseProgression',
    reason: `Unable to evaluate dose progression. Current: ${currentDose}, Requested: ${requestedDose}`,
    displayValue: '? Unknown',
    critical: true
  };
}

function evaluateWeightLoss(patient, criterion, doseInfo) {
  if (doseInfo.isStartingDose) {
    return {
      status: 'not_applicable',
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
    status: met ? 'met' : 'not_met',
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
      status: 'not_applicable',
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
    status: met ? 'met' : 'not_met',
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
    status: 'met',
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
    status: highRisk ? 'met' : 'not_met',
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
    status: met ? 'met' : 'not_met',
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
  const criticalCriteria = applicable.filter(r => r.critical === true);
  const criticalFailures = criticalCriteria.filter(r => r.status === 'not_met');
  
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