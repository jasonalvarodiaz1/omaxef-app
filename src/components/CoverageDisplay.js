import React from "react";
import { getCoverageForDrug, getApplicableCriteria, evaluatePACriteria, statusIcon } from "../utils/coverageLogic";
import { normalizeStatus, CriteriaStatus } from "../constants";

// StatusIcon component for rendering criterion status
const StatusIcon = ({ status, rule }) => {
  return statusIcon(status, rule);
};

export default function CoverageDisplay({ 
  insurance, 
  drugName, 
  selectedDose, 
  selectedPatient,
  drugCoverage 
}) {
   console.log('🎨 CoverageDisplay RENDER START');
  console.log('Props:', { insurance, drugName, selectedDose, hasPatient: !!selectedPatient });
  
  // Don't render until dose is selected
  if (!selectedDose || !selectedPatient) {
    console.log('❌ Returning null - missing data');
    return null;
  }
  
  console.log('✅ Has dose and patient');

  // Get coverage info
  let coverage;
  try {
    coverage = getCoverageForDrug(drugCoverage, insurance, drugName);
    console.log('📦 Coverage result:', coverage);
  } catch (error) {
    console.error('💥 Error getting coverage:', error);
    return <div className="p-3 bg-red-100 rounded">Error: {error.message}</div>;
  }

  if (!coverage) {
    console.log('⚠️ No coverage found');
    return (
      <div className="p-3 bg-yellow-50 border border-yellow-300 rounded text-yellow-800 mt-4">
        <strong>⚠️ No coverage information available</strong>
        <div className="text-sm mt-1">
          Insurance: {insurance}<br/>
          Drug: {drugName}
        </div>
      </div>
    );
  }

  console.log('🎉 Rendering coverage display');

  const patient = selectedPatient;
  const applicableCriteria = getApplicableCriteria(coverage, selectedDose, patient, drugName);

  // Evaluate each criterion
  const criteriaEvaluations = applicableCriteria.map(criterion => ({
    criterion,
    status: evaluatePACriteria(patient, coverage, selectedDose, criterion, drugName)
  }));

  const totalCriteria = criteriaEvaluations.length;
  const metCriteria = criteriaEvaluations.filter(e => normalizeStatus(e.status) === CriteriaStatus.MET).length;
  const failedCriteria = criteriaEvaluations.filter(e => normalizeStatus(e.status) === CriteriaStatus.NOT_MET).length;
  const notApplicable = criteriaEvaluations.filter(e => normalizeStatus(e.status) === CriteriaStatus.NOT_APPLICABLE).length;

  let approvalLikelihood = 0;
  let likelihoodColor = 'red';
  let likelihoodText = 'Low';

  if (totalCriteria > 0) {
    const applicableCount = totalCriteria - notApplicable;
    if (applicableCount > 0) {
      approvalLikelihood = Math.round((metCriteria / applicableCount) * 100);

      if (failedCriteria === 0 && metCriteria === applicableCount) {
        likelihoodColor = 'green';
        likelihoodText = 'High';
      } else if (approvalLikelihood >= 70) {
        likelihoodColor = 'yellow';
        likelihoodText = 'Moderate';
      }
    }
  }

  return (
    <div className="mt-4 border-t pt-4">
      {/* Coverage Basic Info */}
      <div className="mb-4 p-3 bg-gray-50 rounded">
        <div className="grid grid-cols-2 gap-2 text-sm">
          <div><strong>Tier:</strong> {coverage.tier}</div>
          <div><strong>Copay:</strong> {coverage.copay}</div>
          <div>
            <strong>Prior Auth:</strong>
            <span className={coverage.paRequired ? "ml-1 text-red-600 font-semibold" : "ml-1 text-green-600"}>
              {coverage.paRequired ? "Required" : "Not Required"}
            </span>
          </div>
          <div>
            <strong>Preferred:</strong>
            <span className={coverage.preferred ? "ml-1 text-green-600 font-semibold" : "ml-1 text-gray-600"}>
              {coverage.preferred ? "Yes" : "No"}
            </span>
          </div>
        </div>
      </div>

      {/* Approval Likelihood Badge */}
      {coverage.paRequired && applicableCriteria.length > 0 && (
        <div className={`mb-4 p-4 rounded-lg border-2 ${
          likelihoodColor === 'green' ? 'bg-green-50 border-green-400' :
          likelihoodColor === 'yellow' ? 'bg-yellow-50 border-yellow-400' :
          'bg-red-50 border-red-400'
        }`}>
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-semibold text-gray-700">PA Approval Likelihood</div>
               <div className={`text-2xl font-bold ${
                 likelihoodColor === 'green' ? 'text-green-700' :
                 likelihoodColor === 'yellow' ? 'text-yellow-700' :
                 'text-red-700'
               }`}>
                {likelihoodText} ({approvalLikelihood}%)
              </div>
            </div>
            <div className="text-right text-sm text-gray-600">
              <div>{metCriteria} of {totalCriteria - notApplicable} criteria met</div>
            </div>
          </div>
        </div>
      )}
      
      {/* PA Criteria */}
      {coverage.paCriteria && applicableCriteria.length > 0 && (
        <>
          <div className="mb-2">
            <div className="font-bold text-gray-900">Prior Authorization Criteria:</div>
            {coverage.preferred && (
              <div className="text-sm text-green-700 font-semibold">✓ Preferred weight loss agent</div>
            )}
          </div>
          
          <ul className="list-none ml-0 space-y-2">
            {criteriaEvaluations.map((evalItem, i) => {
              const { criterion, status } = evalItem;
              return (
                <li key={i} className="flex items-start p-2 rounded hover:bg-gray-50">
                  <span className="mr-2 mt-0.5 flex-shrink-0">
                    <StatusIcon status={status} rule={criterion.rule} />
                  </span>
                  <span className="flex-1 text-gray-800">{criterion.rule}</span>
                </li>
              );
            })}
          </ul>
          
          {/* Approval/Denial Messages */}
          {failedCriteria > 0 && (
            <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded">
              <div className="flex items-start gap-2">
                <span className="text-red-600 text-xl">⚠️</span>
                <div>
                  <div className="font-bold text-red-800">Coverage Likely to be Denied</div>
                  <div className="text-sm text-red-700 mt-1">
                    Patient does not meet {failedCriteria} required {failedCriteria === 1 ? 'criterion' : 'criteria'}. 
                    Address missing requirements before submitting PA.
                  </div>
                </div>
              </div>
            </div>
          )}
          
          {failedCriteria === 0 && metCriteria === (totalCriteria - notApplicable) && (
            <div className="mt-4 p-3 bg-green-100 border border-green-400 rounded">
              <div className="flex items-start gap-2">
                <span className="text-green-600 text-xl">✓</span>
                <div>
                  <div className="font-bold text-green-800">All Criteria Met</div>
                  <div className="text-sm text-green-700 mt-1">
                    Patient meets all PA requirements for {selectedDose}. Proceed with prior authorization submission.
                  </div>
                </div>
              </div>
            </div>
          )}
        </>
      )}
      
      {/* Note */}
      {coverage.note && (
        <div className="mt-3 p-2 bg-blue-50 border border-blue-200 rounded text-sm text-blue-800">
          <strong>Note:</strong> {coverage.note}
        </div>
      )}
    </div>
  );
}