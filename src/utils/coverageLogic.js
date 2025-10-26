// Coverage lookup and PA criteria evaluation logic
import React from 'react';
import { evaluateCriterion, getSimpleStatus, calculateApprovalLikelihood } from './criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';

export function getCoverageForDrug(drugCoverage, insurance, drugName) {
  console.log('getCoverageForDrug called:', { insurance, drugName });
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
  
  const coverage = drugCoverage[insurance][drugName];
  console.log('Found coverage:', coverage);
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