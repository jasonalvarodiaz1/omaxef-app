import React, { useState, useEffect } from 'react';
import { 
  getEnhancedCriteriaForMedication,
  calculateEnhancedApprovalLikelihood,
  findRxNormAlternatives
} from '../utils/enhancedCoverageLogic';
import { evaluateCriteria } from '../utils/criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';
import './CoverageDisplay.css';

const EnhancedCoverageDisplay = ({ patientData, medication, dose }) => {
  const [evaluationResults, setEvaluationResults] = useState({});
  const [approvalData, setApprovalData] = useState({ likelihood: 0, factors: [] });
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [rxnormMetadata, setRxnormMetadata] = useState(null);
  const [showDetails, setShowDetails] = useState(false);

  useEffect(() => {
    const evaluateWithRxNorm = async () => {
      if (!patientData || !medication) return;
      
      setIsLoading(true);
      
      try {
        // Get enhanced criteria with RxNorm data
        const criteria = await getEnhancedCriteriaForMedication(medication, dose);
        
        // Store RxNorm metadata
        if (criteria._rxnormMetadata) {
          setRxnormMetadata(criteria._rxnormMetadata);
        }
        
        const results = {};
        
        // Evaluate each criterion
        for (const [criterionName, criterionConfig] of Object.entries(criteria)) {
          if (criterionName === '_rxnormMetadata') continue;
          
          const result = evaluateCriteria(criterionName, patientData, {
            medication,
            dose,
            ...criterionConfig
          });
          
          results[criterionName] = {
            ...result,
            required: criterionConfig.required !== false,
            source: criterionConfig.source
          };
        }
        
        setEvaluationResults(results);
        
        // Calculate enhanced approval likelihood
        const approvalInfo = await calculateEnhancedApprovalLikelihood(
          results,
          medication,
          dose
        );
        setApprovalData(approvalInfo);
        
        // Find alternatives if likelihood is low
        if (approvalInfo.likelihood < 70) {
          const alts = await findRxNormAlternatives(
            patientData,
            medication,
            dose,
            approvalInfo.likelihood
          );
          setAlternatives(alts);
        } else {
          setAlternatives([]);
        }
        
      } catch (error) {
        console.error('Evaluation error:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    evaluateWithRxNorm();
  }, [patientData, medication, dose]);

  const getLikelihoodClass = (likelihood) => {
    if (likelihood >= 80) return 'likelihood-high';
    if (likelihood >= 50) return 'likelihood-medium';
    return 'likelihood-low';
  };

  const getStatusIcon = (status) => {
    const normalized = normalizeStatus(status);
    switch (normalized) {
      case CriteriaStatus.MET: return '✓';
      case CriteriaStatus.NOT_MET: return '✗';
      case CriteriaStatus.PARTIAL: return '⚠';
      default: return '—';
    }
  };

  if (isLoading) {
    return (
      <div className="coverage-display loading">
        <div className="spinner"></div>
        <p>Evaluating coverage with RxNorm validation...</p>
      </div>
    );
  }

  return (
    <div className="coverage-display enhanced">
      <div className="coverage-header">
        <h3>Prior Authorization Assessment</h3>
        <div className="medication-info">
          <span className="medication-name">{medication}</span>
          <span className="medication-dose">{dose}</span>
          {rxnormMetadata?.normalized && (
            <span className="rxnorm-badge" title="Validated with RxNorm">
              RxNorm ✓
            </span>
          )}
        </div>
        {rxnormMetadata?.genericName && (
          <div className="generic-name">Generic: {rxnormMetadata.genericName}</div>
        )}
      </div>

      <div className={`approval-section ${getLikelihoodClass(approvalData.likelihood)}`}>
        <div className="approval-label">APPROVAL LIKELIHOOD</div>
        <div className="approval-value">{approvalData.likelihood}%</div>
        {approvalData.evaluationBreakdown && (
          <div className="criteria-summary">
            {approvalData.evaluationBreakdown.metCriteria} of {' '}
            {approvalData.evaluationBreakdown.totalCriteria} criteria met
          </div>
        )}
      </div>

      {/* Likelihood Factors */}
      {approvalData.factors && approvalData.factors.length > 0 && (
        <div className="likelihood-factors">
          <h4>Likelihood Factors</h4>
          <div className="factors-list">
            {approvalData.factors.map((factor, idx) => (
              <div key={idx} className={`factor-item ${factor.impact.startsWith('+') ? 'positive' : 'negative'}`}>
                <span className="factor-name">{factor.factor}</span>
                <span className="factor-impact">{factor.impact}</span>
                <span className="factor-details">{factor.details}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Criteria Results */}
      <div className="criteria-section">
        <h4>Coverage Criteria</h4>
        <div className="criteria-list">
          {Object.entries(evaluationResults).map(([criterion, result]) => {
            const status = normalizeStatus(result.status);
            const statusClass = status === CriteriaStatus.MET ? 'status-met' :
                              status === CriteriaStatus.NOT_MET ? 'status-not-met' :
                              status === CriteriaStatus.PARTIAL ? 'status-partial' : 'status-na';
            
            return (
              <div key={criterion} className={`criterion-item ${statusClass}`}>
                <div className="criterion-header">
                  <span className="criterion-icon">{getStatusIcon(result.status)}</span>
                  <span className="criterion-name">{criterion}</span>
                  {result.required && <span className="required-badge">Required</span>}
                  {result.source && (
                    <span className="source-badge" title={`Source: ${result.source}`}>
                      {result.source}
                    </span>
                  )}
                </div>
                <div className="criterion-details">
                  {result.details || result.reason}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Alternatives with RxNorm validation */}
      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h4>Alternative Medications with Better Coverage</h4>
          <div className="alternatives-list">
            {alternatives.map((alt, idx) => (
              <div key={idx} className="alternative-item">
                <div className="alternative-header">
                  <span className="alt-name">{alt.displayName}</span>
                  {alt.rxnormValidated && <span className="rxnorm-mini">RxNorm ✓</span>}
                  {alt.fdaApproved && <span className="fda-badge">FDA Approved</span>}
                </div>
                <div className="alt-details">
                  <div className="alt-likelihood">
                    Approval: <strong>{alt.approvalLikelihood}%</strong>
                    <span className="improvement">(+{alt.improvement}%)</span>
                  </div>
                  <div className="alt-dose">Starting dose: {alt.suggestedDose}</div>
                  <div className="alt-indication">Indication: {alt.indication}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RxNorm Metadata Debug (toggle visibility) */}
      {rxnormMetadata && (
        <div className="rxnorm-debug">
          <button onClick={() => setShowDetails(!showDetails)} className="toggle-details">
            {showDetails ? 'Hide' : 'Show'} RxNorm Details
          </button>
          {showDetails && (
            <pre>{JSON.stringify(rxnormMetadata, null, 2)}</pre>
          )}
        </div>
      )}
    </div>
  );
};

export default EnhancedCoverageDisplay;