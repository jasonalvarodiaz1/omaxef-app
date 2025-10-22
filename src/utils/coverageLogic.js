// Coverage lookup and PA criteria evaluation logic
import { evaluateCriterion, getSimpleStatus, calculateApprovalLikelihood } from './criteriaEvaluator';

export function getCoverageForDrug(insurance, drugName) {
  if (!insurance || !insurance[drugName]) return null;
  return insurance[drugName];
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
  // Check if drug has doseSchedule (new structure)
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
  
  // Fallback to old startingDoses array (for backward compatibility)
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
  if (rule && rule.includes("Documentation")) {
    if (status === "yes") {
      return <span className="text-green-700 font-bold mr-2" style={{color: '#15803d'}}>✓</span>;
    }
    return <span style={{color: "orange", fontWeight: "bold", marginRight: 8}}>~</span>;
  }
  if (status === "yes") return <span className="text-green-700 font-bold mr-2" style={{color: '#15803d'}}>✓</span>;
  if (status === "no") return <span style={{color: "red", fontWeight: "bold", marginRight: 8}}>✗</span>;
  if (status === "not_applicable") return <span style={{color: "orange", fontWeight: "bold", marginRight: 8}}>N/A</span>;
  return null;
}

// Calculate approval likelihood
export const getApprovalLikelihood = (criteriaResults) => {
  return calculateApprovalLikelihood(criteriaResults);
};
