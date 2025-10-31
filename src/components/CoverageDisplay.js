import React, { useState, useEffect, useMemo } from 'react';
import { 
  getCriteriaForMedication, 
  calculateApprovalLikelihood, 
  generateRecommendations,
  findAlternativeMedications,
  MEDICATION_DATABASE 
} from '../utils/coverageLogic';
import { evaluateCriterion } from '../utils/criteriaEvaluator';
import { normalizeStatus, CriteriaStatus } from '../constants';
import './CoverageDisplay.css';

const CoverageDisplay = ({ patientData, medication, dose }) => {
  const [evaluationResults, setEvaluationResults] = useState({});
  const [approvalLikelihood, setApprovalLikelihood] = useState(0);
  const [recommendations, setRecommendations] = useState([]);
  const [alternatives, setAlternatives] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showAlternatives, setShowAlternatives] = useState(false);
  const [selectedAlternative, setSelectedAlternative] = useState(null);

  // Memoize criteria to prevent unnecessary recalculations
  const criteria = useMemo(() => 
    getCriteriaForMedication(medication, dose),
    [medication, dose]
  );

  useEffect(() => {
    const evaluatePatient = async () => {
      setIsLoading(true);
      setError(null);
      
      try {
        // Validate inputs
        if (!patientData || !medication) {
          throw new Error('Missing patient data or medication selection');
        }

        const results = {};
        
        // Evaluate each criterion
        for (const [criterionName, criterionConfig] of Object.entries(criteria)) {
          try {
            const result = evaluateCriterion(patientData, criterionConfig, medication, dose, medication);
            
            results[criterionName] = {
              ...result,
              required: criterionConfig.required
            };
          } catch (err) {
            console.error(`Error evaluating ${criterionName}:`, err);
            results[criterionName] = {
              status: CriteriaStatus.ERROR,
              reason: `Error evaluating ${criterionName}: ${err.message}`,
              required: criterionConfig.required
            };
          }
        }

        setEvaluationResults(results);
        
        // Calculate approval likelihood
        const likelihood = calculateApprovalLikelihood(results, medication);
        setApprovalLikelihood(likelihood);
        
        // Generate recommendations
        const recs = generateRecommendations(results, medication, dose);
        setRecommendations(recs);

        // Find alternatives if likelihood is low
        if (likelihood < 70) {
          const alts = findAlternativeMedications(patientData, medication, dose, likelihood);
          setAlternatives(alts);
          setShowAlternatives(alts.length > 0);
        } else {
          setAlternatives([]);
          setShowAlternatives(false);
        }

      } catch (err) {
        setError(err.message);
        console.error('Evaluation error:', err);
      } finally {
        setIsLoading(false);
      }
    };

    evaluatePatient();
  }, [patientData, medication, dose, criteria]);

  // Get status icon and color
  const getStatusDisplay = (status) => {
    const normalizedStatus = normalizeStatus(status);
    
    switch (normalizedStatus) {
      case CriteriaStatus.MET:
        return { icon: '✓', className: 'status-met', label: 'Met' };
      case CriteriaStatus.NOT_MET:
        return { icon: '✗', className: 'status-not-met', label: 'Not Met' };
      case CriteriaStatus.PARTIAL:
        return { icon: '⚠', className: 'status-partial', label: 'Partial' };
      case CriteriaStatus.NOT_APPLICABLE:
        return { icon: '—', className: 'status-na', label: 'N/A' };
      case CriteriaStatus.ERROR:
        return { icon: '!', className: 'status-error', label: 'Error' };
      default:
        return { icon: '?', className: 'status-unknown', label: 'Unknown' };
    }
  };

  // Get likelihood color class
  const getLikelihoodClass = (likelihood) => {
    if (likelihood >= 80) return 'likelihood-high';
    if (likelihood >= 50) return 'likelihood-medium';
    return 'likelihood-low';
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
      comorbidity: 'Comorbidity',
      noOpioidUse: 'No Opioid Use',
      diabetesPreferred: 'Diabetes Indication'
    };
    return nameMap[name] || name.charAt(0).toUpperCase() + name.slice(1);
  };

  // Handle alternative selection
  const handleSelectAlternative = (alternative) => {
    setSelectedAlternative(alternative);
  };

  if (isLoading) {
    return (
      <div className="coverage-display loading">
        <div className="spinner"></div>
        <p>Evaluating coverage criteria...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="coverage-display error">
        <div className="error-message">
          <span className="error-icon">⚠️</span>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const metCount = Object.values(evaluationResults).filter(
    r => normalizeStatus(r.status) === CriteriaStatus.MET
  ).length;
  const totalCount = Object.keys(evaluationResults).length;

  return (
    <div className="coverage-display">
      {/* Header Section */}
      <div className="coverage-header">
        <h2>Prior Authorization Assessment</h2>
        <div className="medication-info">
          <span className="medication-name">{medication}</span>
          {dose && <span className="medication-dose">{dose}</span>}
        </div>
      </div>

      {/* Approval Likelihood */}
      <div className={`approval-likelihood ${getLikelihoodClass(approvalLikelihood)}`}>
        <div className="likelihood-label">Approval Likelihood</div>
        <div className="likelihood-value">{approvalLikelihood}%</div>
        <div className="likelihood-bar">
          <div 
            className="likelihood-bar-fill" 
            style={{ width: `${approvalLikelihood}%` }}
          ></div>
        </div>
        <div className="criteria-summary">
          {metCount} of {totalCount} criteria met
        </div>
      </div>

      {/* Criteria Results */}
      <div className="criteria-section">
        <h3>Coverage Criteria</h3>
        <div className="criteria-list">
          {Object.entries(evaluationResults).map(([criterion, result]) => {
            const statusDisplay = getStatusDisplay(result.status);
            // Filter out internal debug fields
            const { details, ...displayResult } = result;
            return (
              <div key={criterion} className={`criterion-item ${statusDisplay.className}`}>
                <div className="criterion-header">
                  <span className="criterion-icon">{statusDisplay.icon}</span>
                  <span className="criterion-name">{formatCriterionName(criterion)}</span>
                  {displayResult.required && <span className="required-badge">Required</span>}
                </div>
                <div className="criterion-details">
                  <span className="criterion-status">{statusDisplay.label}</span>
                  {displayResult.displayValue && (
                    <span className="criterion-value">{displayResult.displayValue}</span>
                  )}
                </div>
                {displayResult.reason && (
                  <div className="criterion-reason">{displayResult.reason}</div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Recommendations */}
      {recommendations.length > 0 && (
        <div className="recommendations-section">
          <h3>Recommended Actions</h3>
          <div className="recommendations-list">
            {recommendations.map((rec, index) => (
              <div key={index} className={`recommendation-item priority-${rec.priority.toLowerCase()}`}>
                <div className="recommendation-header">
                  <span className="recommendation-priority">{rec.priority}</span>
                  <span className="recommendation-action">{rec.action}</span>
                </div>
                <div className="recommendation-details">{rec.details}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Alternative Medications */}
      {showAlternatives && alternatives.length > 0 && (
        <div className="alternatives-section">
          <h3>Alternative Options with Better Coverage</h3>
          <p className="alternatives-description">
            These medications may have a higher chance of approval based on the patient&apos;s profile:
          </p>
          <div className="alternatives-list">
            {alternatives.map((alt, index) => (
              <div 
                key={`${alt.medication}-${index}`}
                className={`alternative-item ${selectedAlternative === alt ? 'selected' : ''}`}
                onClick={() => handleSelectAlternative(alt)}
              >
                <div className="alternative-header">
                  <div className="alternative-name">{alt.displayName}</div>
                  <div className="alternative-category">{alt.category}</div>
                </div>
                <div className="alternative-likelihood">
                  <span className="likelihood-label">Approval Likelihood:</span>
                  <span className={`likelihood-value ${getLikelihoodClass(alt.approvalLikelihood)}`}>
                    {alt.approvalLikelihood}%
                  </span>
                  <span className="likelihood-improvement">
                    (+{alt.improvement}% vs current)
                  </span>
                </div>
                <div className="alternative-dose">
                  Suggested starting dose: {alt.suggestedDose}
                </div>
                {alt.reasons.length > 0 && (
                  <div className="alternative-reasons">
                    <span className="reasons-label">Advantages:</span>
                    <ul>
                      {alt.reasons.map((reason, idx) => (
                        <li key={idx}>{reason}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Selected Alternative Details */}
      {selectedAlternative && (
        <div className="selected-alternative-details">
          <h4>Detailed Assessment: {selectedAlternative.displayName}</h4>
          <div className="criteria-list">
            {Object.entries(selectedAlternative.evaluationResults).map(([criterion, result]) => {
              const statusDisplay = getStatusDisplay(result.status);
              return (
                <div key={criterion} className={`criterion-item ${statusDisplay.className}`}>
                  <span className="criterion-icon">{statusDisplay.icon}</span>
                  <span className="criterion-name">{formatCriterionName(criterion)}</span>
                  <span className="criterion-status">{statusDisplay.label}</span>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageDisplay;