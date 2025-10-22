// CoverageDisplay.js - Real-time coverage evaluation display
import React, { useState, useEffect } from 'react';
import { evaluateCoverage, getAvailableMedications } from '../utils/coverageEvaluator';
import './CoverageDisplay.css';

const CoverageDisplay = ({ patientData }) => {
  const [selectedMedication, setSelectedMedication] = useState(null);
  const [selectedDose, setSelectedDose] = useState(null);
  const [evaluationResults, setEvaluationResults] = useState(null);
  const [medications] = useState(getAvailableMedications());

  useEffect(() => {
    // Auto-evaluate when medication or dose changes
    if (selectedMedication && patientData) {
      const results = evaluateCoverage(patientData, selectedMedication, selectedDose);
      setEvaluationResults(results);
    }
  }, [selectedMedication, selectedDose, patientData]);

  const handleMedicationSelect = (medId) => {
    setSelectedMedication(medId);
    setSelectedDose(null); // Reset dose when medication changes
  };

  const handleDoseSelect = (dose) => {
    setSelectedDose(dose);
  };

  if (!patientData) {
    return (
      <div className="coverage-display">
        <div className="no-data-message">
          <h2>Coverage Evaluation</h2>
          <p>Load patient data to evaluate medication coverage</p>
        </div>
      </div>
    );
  }

  const selectedMed = medications.find(m => m.id === selectedMedication);

  return (
    <div className="coverage-display">
      <div className="coverage-header">
        <h2>Weight-Loss Medication Coverage</h2>
        <p className="subtitle">Real-time prior authorization evaluation</p>
      </div>

      {/* Medication Selection */}
      <section className="medication-selection">
        <h3>Select Medication</h3>
        <div className="medication-grid">
          {medications.map(med => (
            <button
              key={med.id}
              className={`medication-card ${selectedMedication === med.id ? 'selected' : ''}`}
              onClick={() => handleMedicationSelect(med.id)}
            >
              <div className="med-brand">{med.brandName}</div>
              <div className="med-generic">{med.genericName}</div>
              {med.indication && (
                <div className="med-indication">{med.indication}</div>
              )}
            </button>
          ))}
        </div>
      </section>

      {/* Dose Selection */}
      {selectedMed && (
        <section className="dose-selection">
          <h3>Select Dose</h3>
          <div className="dose-buttons">
            {selectedMed.dosages.map(dose => (
              <button
                key={dose}
                className={`dose-button ${selectedDose === dose ? 'selected' : ''}`}
                onClick={() => handleDoseSelect(dose)}
              >
                {dose}
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Evaluation Results */}
      {evaluationResults && (
        <div className="evaluation-results">
          {/* Coverage Status Banner */}
          <div 
            className="coverage-status-banner"
            style={{ 
              background: `linear-gradient(135deg, ${evaluationResults.coverageStatus.color}15, ${evaluationResults.coverageStatus.color}05)`,
              borderLeft: `4px solid ${evaluationResults.coverageStatus.color}`
            }}
          >
            <div className="status-icon" style={{ color: evaluationResults.coverageStatus.color }}>
              {evaluationResults.coverageStatus.icon}
            </div>
            <div className="status-content">
              <div className="status-level">{evaluationResults.coverageStatus.level.toUpperCase()}</div>
              <div className="status-message">{evaluationResults.coverageStatus.message}</div>
              <div className="status-summary">{evaluationResults.summary}</div>
            </div>
            <div className="likelihood-badge" style={{ background: evaluationResults.coverageStatus.color }}>
              {evaluationResults.likelihood}%
            </div>
          </div>

          {/* Criteria Breakdown */}
          <section className="criteria-section">
            <h3>Criteria Evaluation</h3>
            <div className="criteria-list">
              {evaluationResults.criteriaResults.criteriaList.map((criterion, idx) => (
                <div key={idx} className={`criterion-item status-${criterion.status}`}>
                  <div className="criterion-header">
                    <span className="criterion-icon">
                      {criterion.status === 'pass' && '✓'}
                      {criterion.status === 'warning' && '⚠'}
                      {criterion.status === 'fail' && '✗'}
                    </span>
                    <span className="criterion-name">{criterion.name}</span>
                    <span className={`criterion-badge badge-${criterion.status}`}>
                      {criterion.status}
                    </span>
                  </div>
                  <div className="criterion-reason">{criterion.reason}</div>
                  {criterion.value !== undefined && (
                    <div className="criterion-value">
                      Value: {typeof criterion.value === 'number' ? criterion.value.toFixed(1) : criterion.value}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </section>

          {/* Recommendations */}
          <section className="recommendations-section">
            <h3>Recommendations</h3>
            <div className="recommendations-list">
              {evaluationResults.recommendations.map((rec, idx) => (
                <div key={idx} className={`recommendation-item priority-${rec.priority}`}>
                  <div className="rec-header">
                    <span className={`priority-badge priority-${rec.priority}`}>
                      {rec.priority}
                    </span>
                    <span className="rec-category">{rec.category}</span>
                  </div>
                  <div className="rec-message">{rec.message}</div>
                  <div className="rec-action">
                    <strong>Action:</strong> {rec.action}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* Next Steps */}
          <section className="next-steps-section">
            <h3>Next Steps</h3>
            <div className="next-steps-content">
              {evaluationResults.coverageStatus.level === 'approved' ? (
                <div className="step-item">
                  <div className="step-number">1</div>
                  <div className="step-text">
                    Submit prescription. Prior authorization should be approved quickly based on patient meeting all criteria.
                  </div>
                </div>
              ) : (
                <>
                  <div className="step-item">
                    <div className="step-number">1</div>
                    <div className="step-text">
                      Address any failed or warning criteria listed above
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">2</div>
                    <div className="step-text">
                      Gather required documentation (BMI records, treatment history, lifestyle modifications)
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">3</div>
                    <div className="step-text">
                      Submit prior authorization request with complete supporting documentation
                    </div>
                  </div>
                  <div className="step-item">
                    <div className="step-number">4</div>
                    <div className="step-text">
                      Consider calling insurance plan to verify specific requirements
                    </div>
                  </div>
                </>
              )}
            </div>
          </section>

          {/* Action Buttons */}
          <div className="action-buttons">
            <button className="btn btn-primary">
              Submit Prescription
            </button>
            <button className="btn btn-secondary">
              Generate PA Letter
            </button>
            <button className="btn btn-secondary">
              Print Summary
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default CoverageDisplay;
