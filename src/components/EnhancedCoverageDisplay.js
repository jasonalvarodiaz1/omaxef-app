import React, { useState, useEffect } from 'react';
import { normalizeStatus, CriteriaStatus } from '../constants';
import { 
  getEnhancedCriteriaForMedication, 
  calculateEnhancedApprovalLikelihood,
  findRxNormAlternatives
} from '../utils/enhancedCoverageLogic';
import { evaluateCriteria } from '../utils/criteriaEvaluator';
import { checkRxNormHealth } from '../utils/rxnormAPI';
import { drugCoverage } from '../data/drugCoverage';
import './CoverageDisplay.css';
import './EnhancedCoverageDisplay.css';const EnhancedCoverageDisplay = ({ patientData, medication, dose }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [rxnormStatus, setRxnormStatus] = useState('checking');
  const [evaluationResults, setEvaluationResults] = useState({});
  const [approvalData, setApprovalData] = useState({ likelihood: 0, factors: [] });
  const [alternatives, setAlternatives] = useState([]);
  const [rxnormMetadata, setRxnormMetadata] = useState(null);
  const [error, setError] = useState(null);

  useEffect(() => {
    const evaluateWithRxNorm = async () => {
      if (!patientData || !medication) return;
      
      setIsLoading(true);
      setRxnormStatus('checking');
      setError(null);
      
      try {
        // First check if the medication is covered by the patient's insurance
        const insurance = patientData.insurance;
        const coverageInfo = drugCoverage[insurance]?.[medication];
        
        if (coverageInfo && coverageInfo.covered === false) {
          // Medication explicitly not covered by this payer
          setError(`NOT COVERED: ${coverageInfo.note || 'This medication is not covered under ' + insurance}`);
          setEvaluationResults({});
          setApprovalData({ likelihood: 0, factors: [], rxnormValidated: false });
          setIsLoading(false);
          return;
        }
        
        // Check RxNorm API health
        const healthCheck = await checkRxNormHealth();
        setRxnormStatus(healthCheck.status === 'healthy' ? 'connected' : 'offline');
        
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
            source: criterionConfig.source || 'Standard'
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
        console.error('Enhanced evaluation error:', error);
        setError(error.message);
        setRxnormStatus('error');
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
      <div className="coverage-display enhanced loading">
        <div className="rxnorm-loading">
          <div className="spinner"></div>
          <p>🔍 Connecting to RxNorm API...</p>
          <p className="loading-sub">Validating {medication} {dose}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="coverage-display enhanced">
      {/* RxNorm Status Banner */}
      <div className="rxnorm-status-banner">
        <span className="rxnorm-icon">🚀</span>
        <span className="rxnorm-text">Enhanced Mode Active</span>
        <span className={`rxnorm-connection ${rxnormStatus}`}>
          {rxnormStatus === 'connected' ? '✓ RxNorm Connected' : 
           rxnormStatus === 'error' ? '✗ RxNorm Error' : '⚠ RxNorm Offline'}
        </span>
      </div>

      <div className="coverage-header">
        <h3>Prior Authorization Assessment (Enhanced)</h3>
        <div className="medication-info">
          <span className="medication-name">{medication}</span>
          <span className="medication-dose">{dose}</span>
          {rxnormMetadata?.normalized && (
            <span className="rxnorm-validated">RxNorm Validated ✓</span>
          )}
        </div>
        {rxnormMetadata?.genericName && (
          <div className="generic-name">Generic: {rxnormMetadata.genericName}</div>
        )}
      </div>

      {error && (
        <div className="demo-notice" style={{ backgroundColor: '#fff3cd', borderColor: '#ffc107' }}>
          ⚠️ {error}
        </div>
      )}

      {/* Approval Likelihood */}
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
          <h4>📊 Likelihood Factors</h4>
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

      {/* Coverage Criteria */}
      <div className="criteria-section">
        <h4>📋 Coverage Criteria</h4>
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
                  {result.source && result.source !== 'Standard' && (
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

      {/* Alternative Medications */}
      {alternatives.length > 0 && (
        <div className="alternatives-section">
          <h4>💊 Alternative Medications with Better Coverage</h4>
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
                  {alt.indication && (
                    <div className="alt-indication">Indication: {alt.indication}</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* RxNorm Metadata Info */}
      {rxnormMetadata && rxnormMetadata.rxcui && (
        <div className="rxnorm-info" style={{ 
          marginTop: '20px', 
          padding: '10px', 
          background: '#f8f9fa', 
          borderRadius: '6px',
          fontSize: '12px',
          color: '#666'
        }}>
          RxNorm RXCUI: {rxnormMetadata.rxcui} | 
          {rxnormMetadata.tty && ` Term Type: ${rxnormMetadata.tty}`}
        </div>
      )}
    </div>
  );
};

export default EnhancedCoverageDisplay;