// coverageEvaluator.js - Real-time PA evaluation for weight-loss medications
import { evaluatePatientCriteria } from './criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';

/**
 * Weight-loss drugs database with coverage requirements
 */
const WEIGHT_LOSS_DRUGS = {
  semaglutide_wegovy: {
    name: 'Wegovy (Semaglutide)',
    brandName: 'Wegovy',
    genericName: 'Semaglutide',
    dosages: ['0.25mg', '0.5mg', '1mg', '1.7mg', '2.4mg'],
    maxDose: '2.4mg',
    requiresPA: true,
    baseRequirements: {
      minAge: 18,
      minBMI: 30,
      minBMIWithComorbidity: 27,
    },
  },
  semaglutide_ozempic: {
    name: 'Ozempic (Semaglutide)',
    brandName: 'Ozempic',
    genericName: 'Semaglutide',
    dosages: ['0.25mg', '0.5mg', '1mg', '2mg'],
    maxDose: '2mg',
    requiresPA: true,
    indication: 'Type 2 Diabetes (off-label for weight loss)',
    baseRequirements: {
      minAge: 18,
      requiresDiabetes: true,
    },
  },
  tirzepatide_zepbound: {
    name: 'Zepbound (Tirzepatide)',
    brandName: 'Zepbound',
    genericName: 'Tirzepatide',
    dosages: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'],
    maxDose: '15mg',
    requiresPA: true,
    baseRequirements: {
      minAge: 18,
      minBMI: 30,
      minBMIWithComorbidity: 27,
    },
  },
  tirzepatide_mounjaro: {
    name: 'Mounjaro (Tirzepatide)',
    brandName: 'Mounjaro',
    genericName: 'Tirzepatide',
    dosages: ['2.5mg', '5mg', '7.5mg', '10mg', '12.5mg', '15mg'],
    maxDose: '15mg',
    requiresPA: true,
    indication: 'Type 2 Diabetes (off-label for weight loss)',
    baseRequirements: {
      minAge: 18,
      requiresDiabetes: true,
    },
  },
  liraglutide_saxenda: {
    name: 'Saxenda (Liraglutide)',
    brandName: 'Saxenda',
    genericName: 'Liraglutide',
    dosages: ['0.6mg', '1.2mg', '1.8mg', '2.4mg', '3mg'],
    maxDose: '3mg',
    requiresPA: true,
    baseRequirements: {
      minAge: 18,
      minBMI: 30,
      minBMIWithComorbidity: 27,
    },
  },
};

/**
 * Evaluate coverage and PA requirements for a specific medication
 */
export const evaluateCoverage = (patientData, medication, selectedDose = null) => {
  const drug = WEIGHT_LOSS_DRUGS[medication];
  
  if (!drug) {
    return {
      status: 'error',
      message: 'Unknown medication',
    };
  }

  // Run criteria evaluation
  const criteriaResults = evaluatePatientCriteria(patientData, {
    drugName: drug.name,
    selectedDose: selectedDose,
    maxDose: drug.maxDose,
  });

  // Determine overall coverage status
  const coverageStatus = determineCoverageStatus(criteriaResults, drug);

  return {
    drug: drug,
    selectedDose: selectedDose,
    requiresPA: drug.requiresPA,
    coverageStatus: coverageStatus,
    criteriaResults: criteriaResults,
    recommendations: generateRecommendations(criteriaResults, drug),
    likelihood: criteriaResults.overallLikelihood,
    summary: generateSummary(coverageStatus, criteriaResults),
  };
};

/**
 * Determine coverage status based on criteria evaluation
 */
const determineCoverageStatus = (criteriaResults, drug) => {
  const { overallStatus, criteriaList } = criteriaResults;

  // Check critical failures
  const criticalFailures = criteriaList.filter(
    c => c.status === 'fail' && c.critical
  );

  if (criticalFailures.length > 0) {
    return {
      level: 'denied',
      message: 'Does not meet critical requirements',
      color: '#dc3545',
      icon: '❌',
    };
  }

  // Check if all criteria met
  if (overallStatus === 'approved') {
    return {
      level: 'approved',
      message: 'Likely to be approved without PA',
      color: '#28a745',
      icon: '✅',
    };
  }

  // Check likelihood
  if (criteriaResults.overallLikelihood >= 70) {
    return {
      level: 'likely',
      message: 'PA required - High likelihood of approval',
      color: '#28a745',
      icon: '✓',
    };
  } else if (criteriaResults.overallLikelihood >= 40) {
    return {
      level: 'possible',
      message: 'PA required - Moderate likelihood of approval',
      color: '#ffc107',
      icon: '⚠️',
    };
  } else {
    return {
      level: 'unlikely',
      message: 'PA required - Low likelihood of approval',
      color: '#dc3545',
      icon: '⚠️',
    };
  }
};

/**
 * Generate actionable recommendations
 */
const generateRecommendations = (criteriaResults, drug) => {
  const recommendations = [];
  const { criteriaList } = criteriaResults;

  // Check each criterion and provide specific guidance
  criteriaList.forEach(criterion => {
    const normalized = normalizeStatus(criterion.status);
    if (normalized === CriteriaStatus.NOT_MET || normalized === CriteriaStatus.WARNING) {
      // Use criterionType if available, otherwise fall back to criterion
      const criterionType = criterion.criterionType || criterion.type || criterion.criterion;
      
      switch (criterionType) {
        case 'age':
          if (normalized === CriteriaStatus.NOT_MET) {
            recommendations.push({
              priority: 'high',
              category: 'Eligibility',
              message: 'Patient does not meet minimum age requirement (18 years)',
              action: 'Consider alternative treatments or wait until patient meets age requirement',
            });
          }
          break;

        case 'bmi':
          if (normalized === CriteriaStatus.NOT_MET) {
            const hasComorbidity = criteriaResults.criteriaList.find(
              c => (c.criterionType || c.criterion) === 'comorbidities'
            )?.status === CriteriaStatus.MET;
            
            if (hasComorbidity) {
              recommendations.push({
                priority: 'medium',
                category: 'BMI',
                message: `BMI is ${criterion.value?.toFixed(1)} (requires ≥27 with comorbidities)`,
                action: 'Document weight-related comorbidities (diabetes, hypertension, dyslipidemia)',
              });
            } else {
              recommendations.push({
                priority: 'high',
                category: 'BMI',
                message: `BMI is ${criterion.value?.toFixed(1)} (requires ≥30)`,
                action: 'Patient does not meet BMI criteria. Consider lifestyle modifications first.',
              });
            }
          }
          break;

        case 'dose_progression':
        case 'doseProgression':
          recommendations.push({
            priority: 'medium',
            category: 'Treatment History',
            message: criterion.reason,
            action: 'Ensure patient has tried lower doses before requesting maximum dose',
          });
          break;

        case 'weight_loss':
        case 'weightLoss':
          recommendations.push({
            priority: 'medium',
            category: 'Effectiveness',
            message: criterion.reason,
            action: 'Document weight loss progress. May need to switch medications if inadequate response.',
          });
          break;

        case 'maintenance':
        case 'weightMaintained':
          recommendations.push({
            priority: 'low',
            category: 'Maintenance',
            message: criterion.reason,
            action: 'Document weight maintenance for continued approval',
          });
          break;

        case 'documentation':
          recommendations.push({
            priority: 'high',
            category: 'Documentation',
            message: 'Missing required documentation',
            action: 'Ensure complete medical records including: diagnosis codes, BMI documentation, treatment history, lifestyle modification attempts',
          });
          break;

        case 'lifestyle_modifications':
        case 'lifestyleModification':
          recommendations.push({
            priority: 'high',
            category: 'Prior Authorization',
            message: 'Missing documentation of lifestyle modification attempts',
            action: 'Document 3-6 months of diet and exercise attempts before medication therapy',
          });
          break;

        default:
          console.warn('Unhandled criterion:', criterionType);
          break;
      }
    }
  });

  // Add general recommendations
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'low',
      category: 'General',
      message: 'All criteria met',
      action: 'Submit prescription. Prior authorization should be approved quickly.',
    });
  } else {
    recommendations.push({
      priority: 'medium',
      category: 'Next Steps',
      message: 'Address the above items to improve PA approval likelihood',
      action: 'Consider calling insurance plan to verify specific requirements',
    });
  }

  return recommendations.sort((a, b) => {
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });
};

/**
 * Generate summary text
 */
const generateSummary = (coverageStatus, criteriaResults) => {
  // Ensure we have a normalized list of criteria results
  const list = (criteriaResults && criteriaResults.criteriaList) ? criteriaResults.criteriaList : [];

  const normalized = list.map(r => ({
    ...r,
    status: normalizeStatus(r.status),
  }));

  const passCount = normalized.filter(c => c.status === CriteriaStatus.MET).length;
  const totalCount = normalized.length;
  const warningCount = normalized.filter(c => c.status === CriteriaStatus.WARNING).length;
  const failCount = normalized.filter(c => c.status === CriteriaStatus.NOT_MET).length;

  let summary = `Patient meets ${passCount} of ${totalCount} criteria`;
  
  if (warningCount > 0) {
    summary += ` (${warningCount} with warnings)`;
  }
  
  if (failCount > 0) {
    summary += ` (${failCount} not met)`;
  }

  return summary;
};

/**
 * Get all available weight-loss medications
 */
export const getAvailableMedications = () => {
  return Object.entries(WEIGHT_LOSS_DRUGS).map(([key, drug]) => ({
    id: key,
    name: drug.name,
    brandName: drug.brandName,
    genericName: drug.genericName,
    dosages: drug.dosages,
    indication: drug.indication,
  }));
};

/**
 * Quick check if medication is likely to be covered
 */
export const quickCoverageCheck = (patientData, medicationId) => {
  const drug = WEIGHT_LOSS_DRUGS[medicationId];
  
  if (!drug) return { covered: false, reason: 'Unknown medication' };

  const age = patientData.demographics?.age;
  const bmi = patientData.calculatedValues?.bmi;
  const hasDiabetes = patientData.calculatedValues?.hasDiabetes;
  const hasComorbidity = hasDiabetes || patientData.calculatedValues?.hasHypertension;

  // Check age
  if (age < drug.baseRequirements.minAge) {
    return { covered: false, reason: `Patient under age ${drug.baseRequirements.minAge}` };
  }

  // Check diabetes requirement (for Ozempic/Mounjaro)
  if (drug.baseRequirements.requiresDiabetes && !hasDiabetes) {
    return { covered: false, reason: 'Requires Type 2 Diabetes diagnosis' };
  }

  // Check BMI
  if (drug.baseRequirements.minBMI) {
    const requiredBMI = hasComorbidity 
      ? drug.baseRequirements.minBMIWithComorbidity 
      : drug.baseRequirements.minBMI;
    
    if (!bmi || bmi < requiredBMI) {
      return { 
        covered: false, 
        reason: `BMI ${bmi?.toFixed(1) || 'unknown'} is below required ${requiredBMI}` 
      };
    }
  }

  return { covered: true, reason: 'Meets basic criteria' };
};

/**
 * Get coverage details for a specific drug
 */
export const getCoverageForDrug = (drugCoverage, insurance, drugName) => {
  return drugCoverage.find(
    (coverage) => coverage.payor === insurance && coverage.drugName === drugName
  );
};

/**
 * Get applicable criteria for a specific dose
 */
export const getApplicableCriteria = (coverage, selectedDose, patient, drugName) => {
  if (!coverage || !coverage.paCriteria) return [];

  return coverage.paCriteria.filter((criterion) => {
    // Add logic to filter criteria based on dose, patient, and drugName
    return criterion.dose === selectedDose || !criterion.dose;
  });
};

/**
 * Evaluate a specific PA criterion
 */
export const evaluatePACriteria = (patient, coverage, selectedDose, criterion, drugName) => {
  // Add logic to evaluate the criterion based on patient data
  if (criterion.rule === 'age') {
    return patient.demographics.age >= criterion.value ? 'pass' : 'fail';
  }
  if (criterion.rule === 'bmi') {
    return patient.calculatedValues.bmi >= criterion.value ? 'pass' : 'fail';
  }
  // Add more rules as needed
  return 'unknown';
};

/**
 * Get status icon for a criterion evaluation
 */
export const statusIcon = (status, rule) => {
  switch (status) {
    case 'pass':
      return '✓';
    case 'fail':
      return '✗';
    case 'warning':
      return '⚠';
    default:
      return '?';
  }
};

const coverageEvaluator = {
  evaluateCoverage,
  getAvailableMedications,
  quickCoverageCheck,
  WEIGHT_LOSS_DRUGS,
};

export default coverageEvaluator;