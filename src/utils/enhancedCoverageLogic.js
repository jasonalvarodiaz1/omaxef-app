import { normalizeStatus, CriteriaStatus } from '../constants.js';
import { evaluateCriteria } from './criteriaEvaluator.js';
import { 
  normalizeDrugAndDose, 
  getFDAApprovalInfo,
  getDrugClasses,
  getAvailableFormulations 
} from './rxnormAPI.js';

/**
 * Enhanced medication database with RxNorm integration
 * This provides fallback data when RxNorm API is unavailable
 */
const LOCAL_MEDICATION_DATABASE = {
  'Wegovy': {
    rxcui: '2534258',
    genericName: 'semaglutide',
    displayName: 'Wegovy (semaglutide)',
    category: 'GLP-1 receptor agonist',
    startingDose: '0.25 mg',
    titrationSchedule: {
      week1_4: '0.25 mg',
      week5_8: '0.5 mg',
      week9_12: '1 mg',
      week13_16: '1.7 mg',
      week17_plus: '2.4 mg'
    },
    maxDose: '2.4 mg',
    indication: 'weight management',
    fdaApproved: true,
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 27,
      requiresComorbidity: true,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5,
      documentationRequired: ['lifestyle modification', 'diet counseling']
    }
  },
  'Ozempic': {
    rxcui: '1991317',
    genericName: 'semaglutide',
    displayName: 'Ozempic (semaglutide)',
    category: 'GLP-1 receptor agonist',
    startingDose: '0.25 mg',
    titrationSchedule: {
      week1_4: '0.25 mg',
      week5_plus: '0.5 mg',
      optional: ['1 mg', '2 mg']
    },
    maxDose: '2 mg',
    indication: 'type 2 diabetes',
    fdaApproved: true,
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 27,
      requiresComorbidity: true,
      requiresDoseProgression: true,
      requiresWeightLoss: false,
      diabetesIndication: true,
      documentationRequired: ['diabetes diagnosis', 'A1C levels']
    }
  },
  'Zepbound': {
    rxcui: '2650259',
    genericName: 'tirzepatide',
    displayName: 'Zepbound (tirzepatide)',
    category: 'GLP-1/GIP receptor agonist',
    startingDose: '2.5 mg',
    titrationSchedule: {
      week1_4: '2.5 mg',
      week5_8: '5 mg',
      week9_12: '7.5 mg',
      week13_16: '10 mg',
      week17_20: '12.5 mg',
      week21_plus: '15 mg'
    },
    maxDose: '15 mg',
    indication: 'weight management',
    fdaApproved: true,
    criteriaProfile: {
      requiresBMI: true,
      minBMI: 30,
      requiresComorbidity: false,
      requiresDoseProgression: true,
      requiresWeightLoss: true,
      minWeightLossPercent: 5,
      documentationRequired: ['lifestyle modification']
    }
  }
  // Additional medications would follow the same pattern
};

/**
 * Get enhanced criteria for medication using RxNorm data
 * @param {string} medication - Medication name
 * @param {string} dose - Current dose
 * @returns {Promise<Object>} Criteria configuration with RxNorm enhancements
 */
export async function getEnhancedCriteriaForMedication(medication, dose) {
  try {
    // Try to get RxNorm data first
    const rxnormData = await normalizeDrugAndDose(medication, dose);
    
    if (rxnormData.normalized) {
      // Get FDA approval information
      const fdaInfo = await getFDAApprovalInfo(medication, 'weight management');
      
      // Build criteria based on RxNorm and FDA data
      const criteria = {
        age: { 
          required: true, 
          min: 18,
          source: 'FDA labeling'
        },
        bmi: { 
          required: true, 
          min: determineMinBMI(rxnormData, fdaInfo),
          requireComorbidity: requiresComorbidityForBMI(rxnormData),
          source: 'FDA approved indication'
        },
        doseProgression: { 
          required: true,
          validDoses: await getValidDosesFromRxNorm(rxnormData.genericName),
          currentDoseValid: await validateDoseAgainstRxNorm(dose, rxnormData),
          source: 'RxNorm dosing data'
        },
        maintenance: { 
          required: false,
          maxDose: fdaInfo.maxDose,
          source: 'FDA labeling'
        },
        weightLoss: { 
          required: true, 
          threshold: getWeightLossThreshold(rxnormData),
          timeframe: 12, // weeks
          source: 'Clinical guidelines'
        },
        documentation: { 
          required: true,
          requiredDocuments: getRequiredDocumentation(rxnormData),
          source: 'Payer policy'
        }
      };
      
      // Add drug-specific criteria
      if (rxnormData.isGLP1 || rxnormData.isGIP) {
        criteria.comorbidity = { 
          required: criteria.bmi.min < 30,
          qualifyingConditions: [
            'type 2 diabetes',
            'hypertension',
            'dyslipidemia',
            'obstructive sleep apnea',
            'cardiovascular disease'
          ],
          source: 'Coverage policy'
        };
      }
      
      // Store RxNorm metadata for reference
      criteria._rxnormMetadata = {
        rxcui: rxnormData.rxcui,
        genericName: rxnormData.genericName,
        therapeuticClasses: rxnormData.therapeuticClasses,
        normalized: true,
        timestamp: new Date().toISOString()
      };
      
      return criteria;
      
    } else {
      // Fallback to local database if RxNorm unavailable
      console.warn('RxNorm data not available, using local database');
      return getFallbackCriteria(medication, dose);
    }
    
  } catch (error) {
    console.error('Error getting enhanced criteria:', error);
    return getFallbackCriteria(medication, dose);
  }
}

/**
 * Determine minimum BMI based on drug data
 */
function determineMinBMI(rxnormData, fdaInfo) {
  // Weight management drugs typically require BMI ≥30 or ≥27 with comorbidity
  if (fdaInfo.approved && fdaInfo.indication === 'weight management') {
    // Check if drug class suggests lower BMI threshold
    const isDualIndication = rxnormData.therapeuticClasses?.some(c => 
      c.className?.includes('antidiabetic')
    );
    
    return isDualIndication ? 27 : 30;
  }
  
  return 27; // Default conservative threshold
}

/**
 * Check if comorbidity is required for BMI 27-30
 */
function requiresComorbidityForBMI(rxnormData) {
  // GLP-1 and GIP agonists typically allow BMI 27+ with comorbidity
  return rxnormData.isGLP1 || rxnormData.isGIP;
}

/**
 * Get weight loss threshold based on drug class
 */
function getWeightLossThreshold(rxnormData) {
  if (rxnormData.genericName?.includes('liraglutide')) {
    return 4; // Saxenda has 4% threshold
  }
  
  if (rxnormData.genericName?.includes('phentermine')) {
    return 3; // Qsymia has lower threshold
  }
  
  return 5; // Standard 5% for most GLP-1/GIP drugs
}

/**
 * Get required documentation based on drug
 */
function getRequiredDocumentation(rxnormData) {
  const baseDocuments = [
    'lifestyle_modification_attempted',
    'diet_counseling_documented',
    'exercise_counseling_documented'
  ];
  
  if (rxnormData.therapeuticClasses?.some(c => c.className?.includes('antidiabetic'))) {
    baseDocuments.push('glucose_monitoring');
    baseDocuments.push('A1C_levels');
  }
  
  if (rxnormData.genericName?.includes('naltrexone')) {
    baseDocuments.push('opioid_screening');
    baseDocuments.push('liver_function_tests');
  }
  
  return baseDocuments;
}

/**
 * Get valid doses from RxNorm for a generic drug
 */
async function getValidDosesFromRxNorm(genericName) {
  try {
    const formulations = await getAvailableFormulations(genericName);
    const doses = new Set();
    
    for (const formulation of formulations) {
      if (formulation.strength) {
        doses.add(formulation.strength);
      }
    }
    
    return Array.from(doses).sort((a, b) => {
      const aNum = parseFloat(a);
      const bNum = parseFloat(b);
      return aNum - bNum;
    });
  } catch (error) {
    console.error('Error getting valid doses:', error);
    return [];
  }
}

/**
 * Validate if current dose is appropriate according to RxNorm
 */
async function validateDoseAgainstRxNorm(dose, rxnormData) {
  const validDoses = await getValidDosesFromRxNorm(rxnormData.genericName);
  
  if (validDoses.length === 0) {
    return { valid: true, reason: 'Unable to verify against RxNorm' };
  }
  
  const normalizedCurrentDose = dose.toLowerCase().replace(/\s+/g, '');
  const isValid = validDoses.some(validDose => {
    const normalizedValid = validDose.toLowerCase().replace(/\s+/g, '');
    return normalizedValid === normalizedCurrentDose;
  });
  
  return {
    valid: isValid,
    reason: isValid ? 'Dose verified in RxNorm' : 'Dose not found in RxNorm database',
    validDoses
  };
}

/**
 * Fallback to local database when RxNorm is unavailable
 */
function getFallbackCriteria(medication, dose) {
  const localData = LOCAL_MEDICATION_DATABASE[medication];
  
  if (!localData) {
    // Return generic criteria
    return {
      age: { required: true, min: 18 },
      bmi: { required: true, min: 27 },
      doseProgression: { required: true },
      maintenance: { required: false },
      weightLoss: { required: true, threshold: 5 },
      documentation: { required: true },
      _rxnormMetadata: {
        normalized: false,
        fallback: true,
        timestamp: new Date().toISOString()
      }
    };
  }
  
  return {
    age: { required: true, min: 18 },
    bmi: { 
      required: localData.criteriaProfile.requiresBMI,
      min: localData.criteriaProfile.minBMI,
      requireComorbidity: localData.criteriaProfile.requiresComorbidity
    },
    doseProgression: { 
      required: localData.criteriaProfile.requiresDoseProgression,
      titrationSchedule: localData.titrationSchedule
    },
    maintenance: { 
      required: false,
      maxDose: localData.maxDose
    },
    weightLoss: { 
      required: localData.criteriaProfile.requiresWeightLoss,
      threshold: localData.criteriaProfile.minWeightLossPercent
    },
    documentation: { 
      required: true,
      requiredDocuments: localData.criteriaProfile.documentationRequired
    },
    _rxnormMetadata: {
      rxcui: localData.rxcui,
      genericName: localData.genericName,
      normalized: false,
      fallback: true,
      timestamp: new Date().toISOString()
    }
  };
}

/**
 * Calculate approval likelihood with RxNorm validation
 */
export async function calculateEnhancedApprovalLikelihood(evaluationResults, medication, dose) {
  // Get RxNorm validation
  const rxnormData = await normalizeDrugAndDose(medication, dose);
  
  // Base calculation from evaluation results
  let baseLikelihood = 0;
  const criteria = Object.values(evaluationResults);
  const totalCriteria = criteria.length;
  
  if (totalCriteria === 0) {
    return { likelihood: 0, factors: [] };
  }
  
  let metCriteria = 0;
  let partialCriteria = 0;
  let requiredNotMet = 0;
  
  criteria.forEach(criterion => {
    const status = normalizeStatus(criterion.status);
    const isRequired = criterion.required !== false;
    
    if (status === CriteriaStatus.MET) {
      metCriteria++;
    } else if (status === CriteriaStatus.PARTIAL) {
      partialCriteria++;
    } else if (status === CriteriaStatus.NOT_MET && isRequired) {
      requiredNotMet++;
    }
  });
  
  // Calculate base likelihood
  if (requiredNotMet > 0) {
    baseLikelihood = Math.max(0, 30 - (requiredNotMet * 10));
  } else {
    const metPercentage = (metCriteria / totalCriteria) * 100;
    const partialBonus = (partialCriteria / totalCriteria) * 20;
    baseLikelihood = metPercentage + partialBonus;
  }
  
  // Apply RxNorm-based adjustments
  const factors = [];
  
  if (rxnormData.normalized) {
    // Bonus for FDA-approved indication
    const fdaInfo = await getFDAApprovalInfo(medication);
    if (fdaInfo.approved) {
      baseLikelihood += 10;
      factors.push({
        factor: 'FDA Approved',
        impact: '+10%',
        details: `${fdaInfo.brandName} approved for ${fdaInfo.indication}`
      });
    }
    
    // Bonus for proper therapeutic class
    if (rxnormData.isGLP1 || rxnormData.isGIP) {
      baseLikelihood += 5;
      factors.push({
        factor: 'Therapeutic Class',
        impact: '+5%',
        details: 'GLP-1/GIP receptor agonist class'
      });
    }
    
    // Penalty for dose not in RxNorm
    const doseValidation = await validateDoseAgainstRxNorm(dose, rxnormData);
    if (!doseValidation.valid) {
      baseLikelihood -= 15;
      factors.push({
        factor: 'Dose Validation',
        impact: '-15%',
        details: doseValidation.reason
      });
    }
  } else {
    // Penalty for unable to verify in RxNorm
    baseLikelihood -= 5;
    factors.push({
      factor: 'RxNorm Verification',
      impact: '-5%',
      details: 'Unable to verify drug in RxNorm database'
    });
  }
  
  // Cap at 0-100
  const finalLikelihood = Math.min(100, Math.max(0, Math.round(baseLikelihood)));
  
  return {
    likelihood: finalLikelihood,
    factors,
    rxnormValidated: rxnormData.normalized,
    evaluationBreakdown: {
      metCriteria,
      partialCriteria,
      requiredNotMet,
      totalCriteria
    }
  };
}

/**
 * Find alternative medications using RxNorm therapeutic classes
 */
export async function findRxNormAlternatives(patientData, currentMedication, currentDose, currentLikelihood) {
  const alternatives = [];
  
  try {
    // Get current drug's therapeutic classes
    const currentDrugData = await normalizeDrugAndDose(currentMedication, currentDose);
    
    if (!currentDrugData.normalized) {
      console.warn('Could not normalize current medication for alternatives search');
      return alternatives;
    }
    
    // Find drugs in same therapeutic class
    const therapeuticClasses = currentDrugData.therapeuticClasses || [];
    
    // For each known medication, check if it's in the same class
    for (const [medName, medData] of Object.entries(LOCAL_MEDICATION_DATABASE)) {
      if (medName === currentMedication) continue;
      
      // Check if same therapeutic class or similar indication
      const isSameClass = medData.category === LOCAL_MEDICATION_DATABASE[currentMedication]?.category;
      const isSameIndication = medData.indication === LOCAL_MEDICATION_DATABASE[currentMedication]?.indication;
      
      if (isSameClass || isSameIndication) {
        // Evaluate this alternative
        const altCriteria = await getEnhancedCriteriaForMedication(medName, medData.startingDose);
        const altResults = {};
        
        for (const [criterionName, criterionConfig] of Object.entries(altCriteria)) {
          if (criterionName === '_rxnormMetadata') continue;
          
          const result = evaluateCriteria(criterionName, patientData, {
            medication: medName,
            dose: medData.startingDose,
            ...criterionConfig
          });
          
          altResults[criterionName] = {
            ...result,
            required: criterionConfig.required
          };
        }
        
        const altLikelihoodData = await calculateEnhancedApprovalLikelihood(
          altResults, 
          medName, 
          medData.startingDose
        );
        
        if (altLikelihoodData.likelihood > currentLikelihood) {
          alternatives.push({
            medication: medName,
            displayName: medData.displayName,
            genericName: medData.genericName,
            category: medData.category,
            suggestedDose: medData.startingDose,
            approvalLikelihood: altLikelihoodData.likelihood,
            improvement: altLikelihoodData.likelihood - currentLikelihood,
            factors: altLikelihoodData.factors,
            rxnormValidated: altLikelihoodData.rxnormValidated,
            fdaApproved: medData.fdaApproved,
            indication: medData.indication
          });
        }
      }
    }
    
    // Sort by likelihood
    alternatives.sort((a, b) => b.approvalLikelihood - a.approvalLikelihood);
    
  } catch (error) {
    console.error('Error finding RxNorm alternatives:', error);
  }
  
  return alternatives.slice(0, 3); // Return top 3
}

// Export functions
export default {
  getEnhancedCriteriaForMedication,
  calculateEnhancedApprovalLikelihood,
  findRxNormAlternatives,
  LOCAL_MEDICATION_DATABASE
};