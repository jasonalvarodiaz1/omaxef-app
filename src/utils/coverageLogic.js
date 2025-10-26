// Coverage lookup and PA criteria evaluation logic
import React from 'react';
import { evaluateCriterion, getSimpleStatus, calculateApprovalLikelihood } from './criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';

export function getCoverageForDrug(drugCoverage, insurance, drugName, indication) {
  console.log('getCoverageForDrug called:', { insurance, drugName, indication });
  console.log('drugCoverage structure:', drugCoverage);
  
  // Handle both formats:
  // 1. drugCoverage[insurance][drugName] - your current format
  // 2. drugCoverage (direct object) - if passed directly
  
  if (!drugCoverage) {
    console.error('No drugCoverage data provided');
    return null;
  }
  
  // If drugCoverage is already the insurance-specific object
  if (drugCoverage[drugName] && !drugCoverage[insurance]) {
    console.log('Using direct drugCoverage lookup');
    return drugCoverage[drugName];
  }
  
  // Standard lookup: drugCoverage[insurance][drugName]
  if (!drugCoverage[insurance]) {
    console.error(`No coverage data for insurance: ${insurance}`);
    console.log('Available insurances:', Object.keys(drugCoverage));
    return null;
  }
  
  if (!drugCoverage[insurance][drugName]) {
    console.error(`No coverage data for drug: ${drugName} under ${insurance}`);
    console.log('Available drugs:', Object.keys(drugCoverage[insurance]));
    return null;
  }
  
  let coverage = drugCoverage[insurance][drugName];
  
  // For dual-indication drugs (Ozempic, Mounjaro), modify PA criteria based on indication
  if (indication === 'weight_loss' && (drugName === 'Ozempic' || drugName === 'Mounjaro')) {
    console.log(`Modifying ${drugName} PA criteria for weight loss indication`);
    
    // Medicare and Medicare Part D do NOT cover weight loss - deny immediately
    if (insurance.includes('Medicare')) {
      return {
        ...coverage,
        covered: false,
        tier: "Not Covered",
        copay: "N/A",
        paRequired: false,
        stepTherapy: false,
        preferred: false,
        paCriteria: [],
        note: "NOT COVERED - Weight loss medications excluded from Medicare coverage by federal law. Ozempic is ONLY covered for Type 2 Diabetes under Medicare. Off-label use for weight loss will be denied."
      };
    }
    
    // For other insurers, clone the coverage object to avoid mutating the original
    coverage = { ...coverage };
    
    // Replace diabetes-specific PA criteria with weight-loss criteria
    coverage.paCriteria = [
      { 
        rule: "Patient is 18 years or older", 
        type: "age", 
        minAge: 18,
        critical: true
      },
      { 
        rule: "BMI ≥30 kg/m², OR BMI ≥27 kg/m² with at least one weight-related comorbidity (Type 2 Diabetes, Hypertension, Dyslipidemia, Obstructive Sleep Apnea, Cardiovascular Disease)", 
        type: "bmi",
        critical: true
      },
      { 
        rule: "Documented participation in intensive behavioral therapy (IBT) or comprehensive lifestyle modification program for at least 3-6 months with minimal weight loss (<5%)", 
        type: "lifestyleModification",
        requiredDuration: 3,
        critical: true
      },
      { 
        rule: "Trial and documented failure (or intolerance/contraindication) of at least 2 conventional weight management strategies", 
        type: "priorTherapies",
        minTrials: 2,
        critical: true
      },
      { 
        rule: "No contraindications: pregnancy, planning pregnancy, breastfeeding, personal/family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pancreatitis", 
        type: "contraindications",
        critical: true
      },
      { 
        rule: "For CONTINUATION: Patient achieved ≥5% weight loss from baseline within first 12-16 weeks at maximum tolerated dose", 
        type: "weightLoss", 
        minPercentage: 5,
        timeframe: "12-16 weeks"
      },
      { 
        rule: "For MAINTENANCE: Patient has maintained weight loss and continues lifestyle modifications", 
        type: "weightMaintained", 
        minPercentage: 5
      },
      { 
        rule: "Chart documentation includes: baseline weight, height, BMI, comorbidities, prior weight loss attempts with dates and outcomes, lifestyle modification plan", 
        type: "documentation"
      },
      {
        rule: "Patient must follow proper dose titration schedule (drug-naive patients must start with starting dose)",
        type: "doseProgression",
        critical: true
      }
    ];
    
    // Update evaluation rules for weight loss
    coverage.evaluationRules = {
      starting: ["age", "bmi", "lifestyleModification", "priorTherapies", "contraindications", "documentation", "doseProgression"],
      titration: ["age", "bmi", "contraindications", "documentation", "doseProgression"],
      maintenance: ["age", "bmi", "contraindications", "weightLoss", "weightMaintained", "documentation", "doseProgression"]
    };
    
    // Update note to reflect off-label use
    coverage.note = `OFF-LABEL USE for weight loss. ${coverage.note || ''} Insurance may deny coverage for weight loss indication. Higher denial risk than diabetes indication.`;
  }
  
  console.log('Returning coverage:', coverage);
  return coverage;
}

export function getApplicableCriteria(drug, dose, patient, drugName) {
  if (!drug.evaluationRules || !drug.paCriteria) return drug.paCriteria || [];
  
  const doseInfo = getDoseInfo(drug, dose);
  let applicableTypes = drug.evaluationRules[doseInfo.doseType] || [];
  
  // Check if this is a continuation of current therapy
  const drugHistory = patient?.therapyHistory?.find(h => h.drug === drugName);
  const isContinuation = drugHistory && drugHistory.currentDose === dose && drugHistory.status === "active";
  
  // For continuations, only apply basic eligibility criteria (age, BMI, doseProgression)
  // Skip maintenance time and weight loss criteria since they were checked at initial approval
  if (isContinuation) {
    applicableTypes = applicableTypes.filter(type => 
      ['age', 'bmi', 'doseProgression'].includes(type)
    );
  }
  
  // Filter criteria based on dose type
  return drug.paCriteria.filter(criterion => 
    applicableTypes.includes(criterion.type)
  );
}

// Legacy function - now wraps the new evaluator
export function evaluatePACriteria(patient, drug, dose, criterion, drugName) {
  const result = evaluateCriterion(patient, criterion, drug, dose, drugName);
  return getSimpleStatus(result);
}

// New function that returns detailed results
export function evaluatePACriteriaDetailed(patient, drug, dose, criterion, drugName) {
  return evaluateCriterion(patient, criterion, drug, dose, drugName);
}

// Helper function for dose info (used by evaluator)
export function getDoseInfo(drug, dose) {
  // Normalize dose to string for consistent comparison
  const normalizedDose = String(dose);
  
  // Check if drug has doseSchedule (new structure)
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
  
  // Fallback to old startingDoses array (for backward compatibility)
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
  
  // Default: treat as maintenance dose
  return {
    isStartingDose: false,
    isTitrationDose: false,
    isMaintenanceDose: true,
    doseType: "maintenance",
    duration: null
  };
}

// Status icon renderer
export function statusIcon(status, rule) {
  const normalized = normalizeStatus(status);
  
  if (rule && rule.includes("Documentation")) {
    if (normalized === CriteriaStatus.MET) {
      return <span className="text-green-700 font-bold mr-2" style={{color: '#15803d'}}>✓</span>;
    }
    return <span style={{color: "orange", fontWeight: "bold", marginRight: 8}}>~</span>;
  }
  if (normalized === CriteriaStatus.MET) return <span className="text-green-700 font-bold mr-2" style={{color: '#15803d'}}>✓</span>;
  if (normalized === CriteriaStatus.NOT_MET) return <span style={{color: "red", fontWeight: "bold", marginRight: 8}}>✗</span>;
  if (normalized === CriteriaStatus.NOT_APPLICABLE) return <span style={{color: "orange", fontWeight: "bold", marginRight: 8}}>N/A</span>;
  if (normalized === CriteriaStatus.WARNING) return <span style={{color: "orange", fontWeight: "bold", marginRight: 8}}>⚠</span>;
  return null;
}

// Calculate approval likelihood
export const getApprovalLikelihood = (criteriaResults) => {
  return calculateApprovalLikelihood(criteriaResults);
};