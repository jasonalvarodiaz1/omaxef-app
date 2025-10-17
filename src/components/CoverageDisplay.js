import React from "react";
import { getCoverageForDrug, evaluatePACriteriaDetailed, statusIcon, getApplicableCriteria, getApprovalLikelihood } from "../utils/coverageLogic";
import { getSimpleStatus } from "../utils/criteriaEvaluator";

export default function CoverageDisplay({ 
  insurance, 
  drugName, 
  selectedDose, 
  selectedPatient,
  drugCoverage 
}) {
  if (!selectedDose) return null;
  const coverage = getCoverageForDrug(drugCoverage, insurance, drugName);
  if (!coverage) return <div>No coverage info found.</div>;

  const patient = selectedPatient;
  const applicableCriteria = getApplicableCriteria(coverage, selectedDose, patient, drugName);

  // Calculate approval likelihood
  const criteriaResults = applicableCriteria.map(crit => 
    evaluatePACriteriaDetailed(patient, coverage, selectedDose, crit, drugName)
  );
  const approvalLikelihood = getApprovalLikelihood(criteriaResults);

  return (
    <div>
      <div>
        <strong>Tier:</strong> {coverage.tier}
        <br />
        <strong>Copay:</strong> {coverage.copay}
        <br />
        <strong>Prior Auth Required:</strong> {coverage.paRequired ? "Yes" : "No"}
        <br />
        <strong>Step Therapy:</strong> {coverage.stepTherapy ? "Yes" : "No"}
        <br />
        <strong>Preferred:</strong> <span className={coverage.preferred ? "text-green-700 font-bold" : "text-red-700 font-bold"}>{coverage.preferred ? "Yes" : "No"}</span>
        
        {coverage.paRequired && (
          <div className="mt-2 text-sm text-gray-700">
            <strong>Cost Impact:</strong>
            <div>With PA approval: {coverage.copay}</div>
            <div>Without PA: ~$1,200/month</div>
          </div>
        )}
      </div>
      {applicableCriteria && applicableCriteria.length > 0 && (
        <>
          <div className="mt-2 font-bold text-green-700">Preferred weight loss agent, PA required</div>
          <div className="mt-2 font-bold">PA Criteria:</div>
          <ul className="list-disc ml-6">
            {applicableCriteria
              .filter(crit => crit.type !== "weightProgram" && crit.type !== "documentation")
              .map((crit, i) => {
                const result = evaluatePACriteriaDetailed(patient, coverage, selectedDose, crit, drugName);
                const status = getSimpleStatus(result);
                return (
                  <li key={i} className="flex flex-col mb-2">
                    <div className="flex items-start">
                      <span className="flex-shrink-0">{statusIcon(status, crit.rule)}</span>
                      <div className="flex-1">
                        <span>{crit.rule}</span>
                        {result.displayValue && result.displayValue !== 'N/A' && (
                          <div className="text-sm text-gray-600 ml-0 mt-1">
                            <span className="font-semibold">Value: </span>{result.displayValue}
                            {result.requirement && (
                              <span> (Required: {result.requirement})</span>
                            )}
                          </div>
                        )}
                        {result.reason && status !== 'yes' && (
                          <div className={`text-sm ml-0 mt-1 ${status === 'no' ? 'text-red-600' : 'text-orange-600'}`}>
                            {result.reason}
                          </div>
                        )}
                      </div>
                    </div>
                  </li>
                );
              })}
          </ul>
          {/* Show coverage denial message if any criterion is a red X */}
          {(() => {
            const visibleCriteria = applicableCriteria.filter(crit => crit.type !== "weightProgram" && crit.type !== "documentation");
            const hasRedX = visibleCriteria.some(crit => {
              const result = evaluatePACriteriaDetailed(patient, coverage, selectedDose, crit, drugName);
              return getSimpleStatus(result) === "no";
            });
            return hasRedX ? (
              <div className="mt-4 p-3 bg-red-100 border border-red-400 rounded text-red-800 font-bold">
                Drug will not be covered: patient does not meet all PA criteria.
              </div>
            ) : null;
          })()}
          
          {/* Approval Likelihood Indicator */}
          <div className="mt-4 p-4 rounded-lg border-2" style={{
            backgroundColor: approvalLikelihood.color === 'green' ? '#dcfce7' :
                            approvalLikelihood.color === 'yellow' ? '#fef9c3' :
                            approvalLikelihood.color === 'orange' ? '#fed7aa' :
                            approvalLikelihood.color === 'red' ? '#fee2e2' : '#f3f4f6',
            borderColor: approvalLikelihood.color === 'green' ? '#16a34a' :
                         approvalLikelihood.color === 'yellow' ? '#ca8a04' :
                         approvalLikelihood.color === 'orange' ? '#ea580c' :
                         approvalLikelihood.color === 'red' ? '#dc2626' : '#9ca3af'
          }}>
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-lg">PA Approval Likelihood</span>
              <span className="text-2xl font-bold" style={{
                color: approvalLikelihood.color === 'green' ? '#15803d' :
                       approvalLikelihood.color === 'yellow' ? '#a16207' :
                       approvalLikelihood.color === 'orange' ? '#c2410c' :
                       approvalLikelihood.color === 'red' ? '#991b1b' : '#6b7280'
              }}>
                {approvalLikelihood.likelihood}%
              </span>
            </div>
            <div className="text-sm mb-2">
              <span className="font-semibold">Confidence: </span>
              <span className="capitalize">{approvalLikelihood.confidence}</span>
            </div>
            <div className="text-sm mb-2">
              <span className="font-semibold">Reason: </span>
              {approvalLikelihood.reason}
            </div>
            <div className="text-sm font-semibold mt-3 p-2 rounded" style={{
              backgroundColor: approvalLikelihood.color === 'green' ? '#bbf7d0' :
                              approvalLikelihood.color === 'yellow' ? '#fef08a' :
                              approvalLikelihood.color === 'orange' ? '#fdba74' :
                              approvalLikelihood.color === 'red' ? '#fecaca' : '#e5e7eb'
            }}>
              ➜ {approvalLikelihood.action}
            </div>
          </div>

          {/* Alternative Drug Recommendations */}
          {approvalLikelihood.likelihood < 50 && (
            <div className="mt-4 p-4 bg-blue-50 border-2 border-blue-300 rounded">
              <div className="font-bold text-blue-900 mb-2">💡 Consider These Alternatives:</div>
              <ul className="space-y-2">
                <li className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-semibold">Saxenda</span>
                    <div className="text-sm text-gray-600">No PA required</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-700 font-bold">$50 copay</div>
                    <div className="text-xs text-gray-500">Available today</div>
                  </div>
                </li>
                <li className="flex justify-between items-center p-2 bg-white rounded">
                  <div>
                    <span className="font-semibold">Contrave</span>
                    <div className="text-sm text-gray-600">No PA required</div>
                  </div>
                  <div className="text-right">
                    <div className="text-green-700 font-bold">$30 copay</div>
                    <div className="text-xs text-gray-500">Available today</div>
                  </div>
                </li>
              </ul>
            </div>
          )}
        </>
      )}
    </div>
  );
}
