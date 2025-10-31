import { normalizeStatus, CriteriaStatus } from '../constants.js';
import { evaluateCriterion } from './criteriaEvaluator.js';

// Enhanced medication database with starting doses and criteria
const MEDICATION_DATABASE = {
  'Wegovy': {
    displayName: 'Wegovy (semaglutide)',
    category: 'GLP-1',
    startingDose: '0.25 mg',
    doses: ['0.25 mg', '0.5 mg', '1 mg', '1.7 mg', '2.4 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 27,
      requiresComorbidity: true,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5
    }
  },
  'Ozempic': {
    displayName: 'Ozempic (semaglutide)',
    category: 'GLP-1',
    startingDose: '0.25 mg',
    doses: ['0.25 mg', '0.5 mg', '1 mg', '2 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 27,
      requiresComorbidity: true,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5,
      diabetesIndication: true
    }
  },
  'Zepbound': {
    displayName: 'Zepbound (tirzepatide)',
    category: 'GLP-1/GIP',
    startingDose: '2.5 mg',
    doses: ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 30,
      requiresComorbidity: false,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5
    }
  },
  'Mounjaro': {
    displayName: 'Mounjaro (tirzepatide)',
    category: 'GLP-1/GIP',
    startingDose: '2.5 mg',
    doses: ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 27,
      requiresComorbidity: true,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5,
      diabetesIndication: true
    }
  },
  'Saxenda': {
    displayName: 'Saxenda (liraglutide)',
    category: 'GLP-1',
    startingDose: '0.6 mg',
    doses: ['0.6 mg', '1.2 mg', '1.8 mg', '2.4 mg', '3 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 30,
      requiresComorbidity: false,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 4
    }
  },
  'Contrave': {
    displayName: 'Contrave (bupropion/naltrexone)',
    category: 'Combination',
    startingDose: '1 tablet',
    doses: ['1 tablet daily', '1 tablet twice daily', '2 tablets twice daily'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 30,
      requiresComorbidity: false,
      requiresDoseProgression: false,
      requiresWeightLoss: true,
      minWeightLossPercent: 5,
      noOpioidUse: true
    }
  },
  'Qsymia': {
    displayName: 'Qsymia (phentermine/topiramate)',
    category: 'Combination',
    startingDose: '3.75 mg/23 mg',
    doses: ['3.75 mg/23 mg', '7.5 mg/46 mg', '11.25 mg/69 mg', '15 mg/92 mg'],
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 30,
      requiresComorbidity: false,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 3
    }
  }
};

// Define criteria requirements for each medication and dosage
export function getCriteriaForMedication(medication, _dose) {
  const drugProfile = MEDICATION_DATABASE[medication];
  if (!drugProfile) {
    // Default criteria for unknown medications
    return {
      age: { required: true, min: 18 },
      bmi: { required: true, min: 27 },
      doseProgression: { required: true },
      maintenance: { required: false },
      weightLoss: { required: true, threshold: 5 },
      documentation: { required: true }
    };
  }

  const criteria = {
    age: { required: true, min: 18 },
    bmi: { 
      required: drugProfile.criteriaProfile.requiresBMI, 
      min: drugProfile.criteriaProfile.minBMI 
    },
    doseProgression: { 
      required: drugProfile.criteriaProfile.requiresDoseProgression 
    },
    maintenance: { required: false },
    weightLoss: { 
      required: drugProfile.criteriaProfile.requiresWeightLoss,
      threshold: drugProfile.criteriaProfile.minWeightLossPercent 
    },
    documentation: { required: true }
  };

  // Add comorbidity requirement if applicable
  if (drugProfile.criteriaProfile.requiresComorbidity) {
    criteria.comorbidity = { required: true };
  }

  // Add special requirements
  if (drugProfile.criteriaProfile.noOpioidUse) {
    criteria.noOpioidUse = { required: true };
  }

  if (drugProfile.criteriaProfile.diabetesIndication) {
    criteria.diabetesPreferred = { required: false, preferred: true };
  }

  return criteria;
}

// Calculate approval likelihood for a specific medication
export function calculateApprovalLikelihood(evaluationResults, medication) {
  if (!evaluationResults || typeof evaluationResults !== 'object') {
    return 0;
  }

  const criteria = Object.values(evaluationResults);
  const totalCriteria = criteria.length;
  
  if (totalCriteria === 0) {
    return 0;
  }

  let metCriteria = 0;
  let partialCriteria = 0;
  let criticalFailures = 0;

  criteria.forEach(criterion => {
    const status = normalizeStatus(criterion.status);
    const isRequired = criterion.required !== false;

    switch (status) {
      case CriteriaStatus.MET:
        metCriteria++;
        break;
      case CriteriaStatus.PARTIAL:
        partialCriteria++;
        break;
      case CriteriaStatus.NOT_MET:
        if (isRequired) {
          criticalFailures++;
        }
        break;
      case CriteriaStatus.NOT_APPLICABLE:
        // Don't count N/A criteria against the likelihood
        break;
    }
  });

  // If there are critical failures in required criteria, significantly reduce likelihood
  if (criticalFailures > 0) {
    return Math.max(0, 30 - (criticalFailures * 15));
  }

  // Calculate base likelihood
  const metPercentage = (metCriteria / totalCriteria) * 100;
  const partialBonus = (partialCriteria / totalCriteria) * 30;

  let likelihood = metPercentage + partialBonus;

  // Apply medication-specific adjustments
  const drugProfile = MEDICATION_DATABASE[medication];
  if (drugProfile?.criteriaProfile.diabetesIndication && evaluationResults.diabetesPreferred?.status === CriteriaStatus.MET) {
    likelihood += 10; // Bonus for diabetes indication
  }

  return Math.min(100, Math.max(0, Math.round(likelihood)));
}

// Find alternative medications with better approval likelihood
export function findAlternativeMedications(patientData, currentMedication, currentDose, currentLikelihood) {
  const alternatives = [];
  
  // Don't suggest alternatives if current likelihood is already high
  if (currentLikelihood >= 80) {
    return alternatives;
  }

  for (const [medName, medProfile] of Object.entries(MEDICATION_DATABASE)) {
    // Skip the current medication
    if (medName === currentMedication) {
      continue;
    }

    // Evaluate the alternative at starting dose
    const startingDose = medProfile.startingDose;
    const criteria = getCriteriaForMedication(medName, startingDose);
    const evaluationResults = {};

    // Evaluate each criterion for this medication
    for (const [criterionName, criterionConfig] of Object.entries(criteria)) {
      if (criterionName === 'doseProgression') {
        // For alternatives, assume starting dose so progression is typically met
        evaluationResults[criterionName] = {
          status: CriteriaStatus.MET,
          reason: 'Starting dose - progression requirements typically met',
          required: criterionConfig.required
        };
      } else {
        // Use the actual evaluator for other criteria
        const result = evaluateCriterion(patientData, criterionConfig, medName, startingDose, medName);
        evaluationResults[criterionName] = {
          ...result,
          required: criterionConfig.required
        };
      }
    }

    const alternativeLikelihood = calculateApprovalLikelihood(evaluationResults, medName);

    // Only suggest if likelihood is better than current
    if (alternativeLikelihood > currentLikelihood) {
      alternatives.push({
        medication: medName,
        displayName: medProfile.displayName,
        category: medProfile.category,
        suggestedDose: startingDose,
        approvalLikelihood: alternativeLikelihood,
        improvement: alternativeLikelihood - currentLikelihood,
        evaluationResults,
        reasons: generateAlternativeReasons(evaluationResults, medProfile)
      });
    }
  }

  // Sort by approval likelihood (highest first)
  alternatives.sort((a, b) => b.approvalLikelihood - a.approvalLikelihood);

  // Return top 3 alternatives
  return alternatives.slice(0, 3);
}

// Generate reasons why an alternative might be better
function generateAlternativeReasons(evaluationResults, medProfile) {
  const reasons = [];

  if (medProfile.criteriaProfile.minBMI < 30) {
    reasons.push('Lower BMI requirement');
  }

  if (!medProfile.criteriaProfile.requiresComorbidity) {
    reasons.push('No comorbidity requirement');
  }

  if (medProfile.criteriaProfile.diabetesIndication && evaluationResults.diabetesPreferred?.status === CriteriaStatus.MET) {
    reasons.push('Has diabetes indication');
  }

  if (medProfile.criteriaProfile.minWeightLossPercent < 5) {
    reasons.push('Lower weight loss threshold');
  }

  // Count met criteria
  const metCount = Object.values(evaluationResults).filter(r => 
    normalizeStatus(r.status) === CriteriaStatus.MET
  ).length;
  
  if (metCount > 0) {
    reasons.push(`Meets ${metCount} criteria`);
  }

  return reasons;
}

// Generate recommendations based on evaluation results
export function generateRecommendations(evaluationResults, _medication, _dose) {
  const priorityMap = {
    HIGH: [],
    MEDIUM: [],
    LOW: []
  };

  for (const [criterion, result] of Object.entries(evaluationResults)) {
    const status = normalizeStatus(result.status);
    const isRequired = result.required !== false;

    if (status === CriteriaStatus.NOT_MET) {
      const rec = generateRecommendationForCriterion(criterion, result, isRequired);
      if (rec) {
        priorityMap[rec.priority].push(rec);
      }
    } else if (status === CriteriaStatus.PARTIAL) {
      const rec = generateRecommendationForCriterion(criterion, result, false);
      if (rec) {
        priorityMap.MEDIUM.push(rec);
      }
    }
  }

  // Combine in priority order
  return [
    ...priorityMap.HIGH,
    ...priorityMap.MEDIUM,
    ...priorityMap.LOW
  ];
}

function generateRecommendationForCriterion(criterion, result, isRequired) {
  const baseRec = {
    criterion,
    status: result.status,
    priority: isRequired ? 'HIGH' : 'MEDIUM'
  };

  switch (criterion) {
    case 'age':
      return {
        ...baseRec,
        action: 'Verify patient age',
        details: 'Patient must be 18 years or older for this medication'
      };

    case 'bmi':
      return {
        ...baseRec,
        action: 'Document current BMI',
        details: result.reason || 'Update height and weight measurements'
      };

    case 'doseProgression':
      return {
        ...baseRec,
        action: 'Review dosing history',
        details: 'Ensure proper dose escalation protocol has been followed'
      };

    case 'weightLoss':
      return {
        ...baseRec,
        action: 'Document weight loss progress',
        details: result.reason || 'Record weight measurements over treatment period'
      };

    case 'documentation':
      return {
        ...baseRec,
        action: 'Complete clinical documentation',
        details: 'Ensure all required clinical notes and assessments are documented'
      };

    case 'comorbidity':
      return {
        ...baseRec,
        action: 'Document comorbidities',
        details: 'Record qualifying conditions (diabetes, hypertension, dyslipidemia, etc.)'
      };

    case 'noOpioidUse':
      return {
        ...baseRec,
        action: 'Review medication history',
        details: 'Confirm no concurrent opioid use (contraindicated with naltrexone)'
      };

    default:
      return null;
  }
}

// Export additional utilities
export { MEDICATION_DATABASE };