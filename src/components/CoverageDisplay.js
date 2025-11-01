import React, { useState, useEffect } from 'react';
import { getCriteriaForMedication } from '../utils/coverageLogic';
import { evaluateCriteria } from '../utils/criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';
import './CoverageDisplay.css';

const CoverageDisplay = ({ patientData, medication, dose }) => {
  const [evaluationResults, setEvaluationResults] = useState({});
  const [approvalLikelihood, setApprovalLikelihood] = useState(0);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const evaluatePatient = async () => {
      setIsLoading(true);
      
      try {
        const criteria = getCriteriaForMedication(medication, dose);
        const results = {};
        
        // Evaluate each criterion
        for (const [criterionName, criterionConfig] of Object.entries(criteria)) {
          const result = evaluateCriteria(criterionName, patientData, {
            medication,
            dose,
            ...criterionConfig
          });
          
          results[criterionName] = {
            ...result,
            required: criterionConfig.required !== false
          };
        }

        setEvaluationResults(results);
        
        // Calculate approval likelihood
        const metCount = Object.values(results).filter(
          r => normalizeStatus(r.status) === CriteriaStatus.MET
        ).length;
        const totalCount = Object.keys(results).length;
        const likelihood = Math.round((metCount / totalCount) * 100);
        setApprovalLikelihood(likelihood);

      } catch (err) {
        console.error('Evaluation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (patientData && medication) {
      evaluatePatient();
    }
  }, [patientData, medication, dose]);

  // Get status badge
  const getStatusBadge = (status, required) => {
    const normalizedStatus = normalizeStatus(status);
    const isRequired = required !== false;
    
    let className = '';
    let text = '';
    
    switch (normalizedStatus) {
      case CriteriaStatus.MET:
        className = 'status-badge-met';
        text = 'Met';
        break;
      case CriteriaStatus.NOT_MET:
        className = 'status-badge-not-met';
        text = 'Not Met';
        break;
      case CriteriaStatus.PARTIAL:
        className = 'status-badge-partial';
        text = 'Partial';
        break;
      default:
        className = 'status-badge-na';
        text = 'N/A';
    }
    
    return (
      <span className={`status-badge ${className}`}>
        {text}
        {isRequired && <span className="required-indicator">Required</span>}
      </span>
    );
  };

  // Get status icon
  const getStatusIcon = (status) => {
    const normalizedStatus = normalizeStatus(status);
    
    switch (normalizedStatus) {
      case CriteriaStatus.MET:
        return '✓';
      case CriteriaStatus.NOT_MET:
        return 'X';
      case CriteriaStatus.PARTIAL:
        return '!';
      default:
        return '—';
    }
  };

  // Format criterion name for display
  const formatCriterionName = (name) => {
    const nameMap = {
      age: 'Age Requirement',
      bmi: 'BMI Criteria',
      doseProgression: 'Dose Progression',
      maintenance: 'Maintenance Phase',
      weightLoss: 'Weight Loss',
      documentation: 'Clinical Documentation',
      comorbidity: 'Comorbidity'
    };
    return nameMap[name] || name;
  };

  if (isLoading) {
    return <div className="coverage-display loading">Evaluating...</div>;
  }

  const metCount = Object.values(evaluationResults).filter(
    r => normalizeStatus(r.status) === CriteriaStatus.MET
  ).length;
  const totalCount = Object.keys(evaluationResults).length;

  // Determine approval likelihood class
  const getLikelihoodClass = () => {
    if (approvalLikelihood >= 80) return 'likelihood-high';
    if (approvalLikelihood >= 50) return 'likelihood-medium';
    return 'likelihood-low';
  };

  return (
    <div className="coverage-display">
      <div className="coverage-header">
        <h3>Prior Authorization Assessment</h3>
        <div className="medication-info">
          <span>{medication}</span>
          <span className="dose">{dose}</span>
        </div>
      </div>

      <div className={`approval-section ${getLikelihoodClass()}`}>
        <div className="approval-likelihood-label">APPROVAL LIKELIHOOD</div>
        <div className="approval-likelihood-value">{approvalLikelihood}%</div>
        <div className="criteria-summary">
          {metCount} of {totalCount} criteria met
        </div>
      </div>

      <div className="criteria-section">
        <h4>Coverage Criteria</h4>
        {Object.entries(evaluationResults).map(([criterion, result]) => {
          const normalizedStatus = normalizeStatus(result.status);
          let statusClass = 'criterion-item';
          
          if (normalizedStatus === CriteriaStatus.MET) {
            statusClass += ' status-met';
          } else if (normalizedStatus === CriteriaStatus.NOT_MET) {
            statusClass += ' status-not-met';
          } else if (normalizedStatus === CriteriaStatus.PARTIAL) {
            statusClass += ' status-partial';
          }

          return (
            <div key={criterion} className={statusClass}>
              <div className="criterion-header">
                <span className="criterion-icon">{getStatusIcon(result.status)}</span>
                <span className="criterion-name">{formatCriterionName(criterion)}</span>
                {result.required && (
                  <span className="required-badge">Required</span>
                )}
              </div>
              <div className="criterion-status">
                <span>{normalizedStatus === CriteriaStatus.MET ? 'Met' : 
                       normalizedStatus === CriteriaStatus.NOT_MET ? 'Not Met' :
                       normalizedStatus === CriteriaStatus.PARTIAL ? 'Partial' : 'N/A'}</span>
              </div>
              <div className="criterion-details">
                {result.details || result.reason}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default CoverageDisplay;