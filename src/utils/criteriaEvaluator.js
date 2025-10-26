import { CriteriaStatus, normalizeStatus } from '../constants';
import { withErrorRecovery, CriteriaEvaluationError } from './errorHandler';

export const criteriaEvaluator = {
  // Enhanced evaluateAge with confidence scoring
  evaluateAge: async (patientData, criterion) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      
      if (!patientData.birthDate) {
        return {
          status: CriteriaStatus.PENDING_DOCUMENTATION,
          reason: 'Patient birth date not found',
          displayValue: 'Unknown',
          confidence: 0,
          evidence: [{
            type: 'error',
            message: 'Birth date missing from patient record'
          }]
        };
      }

      const birthDate = new Date(patientData.birthDate);
      
      // Check for invalid date
      if (isNaN(birthDate.getTime())) {
        throw new CriteriaEvaluationError(
          'AGE',
          'Invalid birth date format',
          { birthDate: patientData.birthDate }
        );
      }
      
      const today = new Date();
      let age = today.getFullYear() - birthDate.getFullYear();
      const monthDiff = today.getMonth() - birthDate.getMonth();
      if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
        age--;
      }

      const met = age >= criterion.minimum;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        reason: met 
          ? `Patient age ${age} meets minimum of ${criterion.minimum}`
          : `Patient age ${age} below minimum of ${criterion.minimum}`,
        displayValue: `${age} years`,
        confidence,
        evidence,
        details: {
          age,
          minimum: criterion.minimum,
          birthDate: patientData.birthDate
        }
      };
    } catch (error) {
      throw new CriteriaEvaluationError(
        'AGE',
        'Failed to evaluate age criterion',
        { error: error.message }
      );
    }
  },

  // Enhanced evaluateBMI with confidence and evidence
  evaluateBMI: async (patientData, criterion, fhirHelpers) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      
      const bmiObs = await fhirHelpers.getLatestObservation(
        patientData.observations,
        '39156-5'
      );

      if (!bmiObs) {
        return {
          status: CriteriaStatus.PENDING_DOCUMENTATION,
          reason: 'No BMI measurement found',
          displayValue: 'Not documented',
          confidence: 0.3,
          evidence: [{
            type: 'warning',
            message: 'No BMI measurement found in patient records'
          }],
          recommendation: {
            priority: 'high',
            action: 'document_bmi',
            message: 'Document current BMI measurement',
            steps: ['Measure height and weight', 'Calculate BMI', 'Document in patient record']
          }
        };
      }

      const bmiValue = fhirHelpers.extractNumericValue(bmiObs);
      const measurementDate = new Date(bmiObs.effectiveDateTime || bmiObs.issued);
      const dataAge = Math.floor((Date.now() - measurementDate) / (1000 * 60 * 60 * 24));
      
      // Adjust confidence based on data age
      if (dataAge > 30) {
        confidence *= 0.8;
        evidence.push({
          type: 'warning',
          message: `BMI data is ${dataAge} days old`
        });
      }
      
      if (dataAge > 90) {
        confidence *= 0.6;
        evidence.push({
          type: 'warning',
          message: 'BMI measurement over 90 days old - consider updating'
        });
      }

      const met = bmiValue >= criterion.threshold;
      
      const result = {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        reason: met 
          ? `BMI of ${bmiValue} meets threshold of ${criterion.threshold}`
          : `BMI of ${bmiValue} is below threshold of ${criterion.threshold}`,
        displayValue: `${bmiValue} kg/m²`,
        confidence,
        evidence,
        details: {
          value: bmiValue,
          threshold: criterion.threshold,
          measurementDate: measurementDate.toISOString(),
          dataAge
        }
      };

      // Add recommendation if not met
      if (!met) {
        result.recommendation = {
          priority: 'high',
          action: 'weight_management',
          message: `Patient needs BMI ≥ ${criterion.threshold}. Current: ${bmiValue}`,
          steps: [
            'Document weight management interventions',
            'Consider nutrition counseling referral',
            'Schedule follow-up weight check in 30 days'
          ]
        };
      }

      return result;
    } catch (error) {
      throw new CriteriaEvaluationError(
        'BMI',
        'Failed to evaluate BMI criterion',
        { error: error.message }
      );
    }
  },

  // Enhanced evaluateWeightLoss with confidence scoring
  evaluateWeightLoss: async (patientData, criterion, fhirHelpers) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      
      const weightObs = await fhirHelpers.getObservationsByCode(
        patientData.observations,
        '29463-7'
      );

      if (!weightObs || weightObs.length < 2) {
        return {
          status: CriteriaStatus.PENDING_DOCUMENTATION,
          reason: 'Insufficient weight measurements for comparison',
          displayValue: 'Insufficient data',
          confidence: 0.2,
          evidence: [{
            type: 'warning',
            message: `Only ${weightObs?.length || 0} weight measurements found (need at least 2)`
          }],
          recommendation: {
            priority: 'high',
            action: 'document_weights',
            message: 'Document weight history for weight loss assessment',
            steps: ['Record baseline weight', 'Document recent weight measurements']
          }
        };
      }

      // Sort by date
      const sortedWeights = weightObs
        .filter(obs => obs.effectiveDateTime || obs.issued)
        .sort((a, b) => 
          new Date(a.effectiveDateTime || a.issued) - 
          new Date(b.effectiveDateTime || b.issued)
        );

      // Calculate measurement gaps
      const gaps = [];
      for (let i = 1; i < sortedWeights.length; i++) {
        const gap = (new Date(sortedWeights[i].effectiveDateTime || sortedWeights[i].issued) - 
                     new Date(sortedWeights[i-1].effectiveDateTime || sortedWeights[i-1].issued)) / 
                     (1000 * 60 * 60 * 24);
        gaps.push(gap);
      }
      
      const maxGap = Math.max(...gaps, 0);
      if (maxGap > 45) {
        confidence *= 0.7;
        evidence.push({
          type: 'warning',
          message: `Gap of ${Math.round(maxGap)} days between measurements`
        });
      }

      const firstWeight = fhirHelpers.extractNumericValue(sortedWeights[0]);
      const lastWeight = fhirHelpers.extractNumericValue(sortedWeights[sortedWeights.length - 1]);
      const percentageLoss = ((firstWeight - lastWeight) / firstWeight) * 100;

      const met = percentageLoss >= criterion.targetPercentage;

      // Check for weight regain in recent measurements
      if (sortedWeights.length >= 3) {
        const recentWeights = sortedWeights.slice(-3);
        const recentTrend = fhirHelpers.extractNumericValue(recentWeights[2]) - 
                           fhirHelpers.extractNumericValue(recentWeights[0]);
        if (recentTrend > 0) {
          evidence.push({
            type: 'warning',
            message: 'Recent weight regain detected'
          });
          confidence *= 0.85;
        }
      }

      const result = {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        reason: met
          ? `Weight loss of ${percentageLoss.toFixed(1)}% meets target of ${criterion.targetPercentage}%`
          : `Weight loss of ${percentageLoss.toFixed(1)}% below target of ${criterion.targetPercentage}%`,
        displayValue: `${percentageLoss.toFixed(1)}% loss`,
        confidence,
        evidence,
        details: {
          percentageLoss: percentageLoss.toFixed(1),
          targetPercentage: criterion.targetPercentage,
          firstWeight,
          lastWeight,
          measurementCount: sortedWeights.length,
          measurementSpan: Math.round((new Date(sortedWeights[sortedWeights.length - 1].effectiveDateTime) - 
                                       new Date(sortedWeights[0].effectiveDateTime)) / (1000 * 60 * 60 * 24))
        }
      };

      if (!met) {
        result.recommendation = {
          priority: 'high',
          action: 'weight_loss_intervention',
          message: `Additional ${(criterion.targetPercentage - percentageLoss).toFixed(1)}% weight loss needed`,
          steps: [
            'Review current weight loss interventions',
            'Consider intensifying lifestyle modifications',
            'Document adherence to current regimen'
          ]
        };
      }

      return result;
    } catch (error) {
      throw new CriteriaEvaluationError(
        'WEIGHT_LOSS',
        'Failed to evaluate weight loss criterion',
        { error: error.message }
      );
    }
  },

  // Enhanced evaluateMaintenance with confidence
  evaluateMaintenance: async (patientData, criterion, fhirHelpers) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      
      const medicationData = patientData.medicationHistory?.find(med =>
        med.medication?.toLowerCase().includes(criterion.medication?.toLowerCase())
      );

      if (!medicationData) {
        return {
          status: CriteriaStatus.NOT_MET,
          reason: `No history of ${criterion.medication} found`,
          displayValue: 'Not documented',
          confidence: 0.9,
          evidence: [{
            type: 'info',
            message: `No ${criterion.medication} in medication history`
          }]
        };
      }

      const startDate = new Date(medicationData.startDate);
      const monthsOnMedication = (Date.now() - startDate) / (1000 * 60 * 60 * 24 * 30);
      
      // Check for gaps in therapy
      if (medicationData.gaps && medicationData.gaps.length > 0) {
        confidence *= 0.8;
        evidence.push({
          type: 'warning',
          message: `${medicationData.gaps.length} gap(s) in therapy detected`
        });
      }

      const met = monthsOnMedication >= criterion.minimumMonths;

      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        reason: met
          ? `${monthsOnMedication.toFixed(1)} months on ${criterion.medication} meets minimum of ${criterion.minimumMonths}`
          : `Only ${monthsOnMedication.toFixed(1)} months on ${criterion.medication}, need ${criterion.minimumMonths}`,
        displayValue: `${monthsOnMedication.toFixed(1)} months`,
        confidence,
        evidence,
        details: {
          monthsOnMedication: monthsOnMedication.toFixed(1),
          minimumMonths: criterion.minimumMonths,
          startDate: medicationData.startDate,
          medication: criterion.medication
        }
      };
    } catch (error) {
      throw new CriteriaEvaluationError(
        'MAINTENANCE',
        'Failed to evaluate maintenance criterion',
        { error: error.message }
      );
    }
  },

  // Enhanced evaluateDoseProgression with confidence
  evaluateDoseProgression: async (patientData, criterion, fhirHelpers) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      
      const medicationHistory = patientData.medicationHistory || [];
      const relevantMeds = medicationHistory.filter(med =>
        med.medication?.toLowerCase().includes(criterion.medication?.toLowerCase())
      );

      if (relevantMeds.length === 0) {
        return {
          status: CriteriaStatus.NOT_MET,
          reason: `No history of ${criterion.medication} found`,
          displayValue: 'Not documented',
          confidence: 0.9,
          evidence: [{
            type: 'info',
            message: `No ${criterion.medication} in medication history`
          }]
        };
      }

      // Check dose progression
      const doses = relevantMeds.map(med => parseFloat(med.dose)).filter(d => !isNaN(d));
      const currentDose = doses[doses.length - 1];
      const expectedProgression = criterion.expectedProgression || [];
      
      let progressionMet = true;
      let progressionDetails = [];
      
      for (let i = 0; i < expectedProgression.length && i < doses.length; i++) {
        if (doses[i] < expectedProgression[i]) {
          progressionMet = false;
          progressionDetails.push(`Dose ${i + 1}: ${doses[i]}mg (expected ≥${expectedProgression[i]}mg)`);
        } else {
          progressionDetails.push(`Dose ${i + 1}: ${doses[i]}mg ✓`);
        }
      }

      if (progressionDetails.length < expectedProgression.length) {
        progressionMet = false;
        evidence.push({
          type: 'warning',
          message: `Only ${progressionDetails.length} of ${expectedProgression.length} expected dose steps documented`
        });
        confidence *= 0.7;
      }

      return {
        status: progressionMet ? CriteriaStatus.MET : CriteriaStatus.PARTIALLY_MET,
        reason: progressionDetails.join(', '),
        displayValue: `Current: ${currentDose}mg`,
        confidence,
        evidence,
        details: {
          doses,
          currentDose,
          expectedProgression,
          progressionDetails
        }
      };
    } catch (error) {
      throw new CriteriaEvaluationError(
        'DOSE_PROGRESSION',
        'Failed to evaluate dose progression',
        { error: error.message }
      );
    }
  },

  // Enhanced evaluateDocumentation with quality assessment
  evaluateDocumentation: async (patientData, criterion) => {
    try {
      let confidence = 1.0;
      const evidence = [];
      const required = criterion.required || [];
      const found = [];
      const missing = [];
      const qualityIssues = [];

      for (const docType of required) {
        const doc = patientData.documentation?.find(d => 
          d.type?.toLowerCase() === docType.toLowerCase()
        );
        
        if (doc) {
          found.push(docType);
          
          // Check document age
          if (doc.date) {
            const age = (Date.now() - new Date(doc.date)) / (1000 * 60 * 60 * 24);
            if (age > 90) {
              qualityIssues.push(`${docType} is ${Math.round(age)} days old`);
              confidence *= 0.9;
              evidence.push({
                type: 'warning',
                message: `${docType} documentation is outdated (${Math.round(age)} days old)`
              });
            }
          }
          
          // Check for clinical rationale
          if (!doc.clinicalRationale || doc.clinicalRationale.length < 50) {
            qualityIssues.push(`${docType} lacks detailed clinical rationale`);
            confidence *= 0.85;
            evidence.push({
              type: 'warning',
              message: `${docType} lacks detailed clinical rationale`
            });
          }
        } else {
          missing.push(docType);
        }
      }

      const status = missing.length === 0 
        ? CriteriaStatus.MET 
        : missing.length === required.length 
          ? CriteriaStatus.NOT_MET
          : CriteriaStatus.PARTIALLY_MET;

      const result = {
        status,
        reason: missing.length === 0
          ? `All required documentation present: ${found.join(', ')}`
          : `Missing: ${missing.join(', ')}`,
        displayValue: `${found.length}/${required.length} documented`,
        confidence,
        evidence,
        details: {
          required,
          found,
          missing,
          qualityIssues
        }
      };

      if (missing.length > 0) {
        result.recommendation = {
          priority: 'high',
          action: 'complete_documentation',
          message: `Complete missing documentation: ${missing.join(', ')}`,
          steps: missing.map(doc => `Document ${doc} with clinical rationale`)
        };
      }

      return result;
    } catch (error) {
      throw new CriteriaEvaluationError(
        'DOCUMENTATION',
        'Failed to evaluate documentation',
        { error: error.message }
      );
    }
  }
};

// Legacy wrapper function for backward compatibility
export function evaluateCriterion(patient, criterion, drug, dose, drugName) {
  // Map old criterion types to new evaluator methods
  switch (criterion.type) {
    case 'age':
      return {
        status: patient.age >= criterion.minAge ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'age',
        value: patient.age,
        reason: patient.age >= criterion.minAge 
          ? `Patient age ${patient.age} meets minimum ${criterion.minAge}`
          : `Patient age ${patient.age} below minimum ${criterion.minAge}`
      };
      
    case 'bmi':
      const bmiValue = patient.vitals?.bmi || patient.bmi;
      const hasComorbidity = Boolean(
        (patient.diagnosis && patient.diagnosis.length > 0) || 
        (patient.comorbidities && patient.comorbidities.length > 0)
      );
      let bmiMet = false;
      let bmiReason = '';
      
      if (bmiValue >= 30) {
        bmiMet = true;
        bmiReason = `BMI ${bmiValue} >= 30`;
      } else if (bmiValue >= 27 && hasComorbidity) {
        bmiMet = true;
        bmiReason = `BMI ${bmiValue} >= 27 with comorbidities`;
      } else {
        bmiReason = bmiValue < 27 
          ? `BMI ${bmiValue} < 27` 
          : `BMI ${bmiValue} is 27-29 without comorbidities`;
      }
      
      return {
        status: bmiMet ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'bmi',
        value: bmiValue,
        reason: bmiReason,
        hasComorbidity
      };
      
    case 'doseProgression':
      // Get dose info from drug schedule
      const normalizedDose = String(dose);
      let doseInfo = null;
      
      if (drug.doseSchedule) {
        doseInfo = drug.doseSchedule.find(d => String(d.value) === normalizedDose);
      }
      
      if (!doseInfo) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'doseProgression',
          reason: 'Dose not found in schedule'
        };
      }
      
      const isStartingDose = doseInfo.phase === 'starting';
      
      // Check if patient has history with this drug
      const drugHistory = patient.therapyHistory?.find(h => 
        h.drug?.toLowerCase() === drugName?.toLowerCase()
      );
      
      const isDrugNaive = !drugHistory;
      
      // Drug-naive patients MUST start with starting dose
      if (isDrugNaive && !isStartingDose) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'doseProgression',
          reason: `Drug-naive patients must start with starting dose. ${dose} is a ${doseInfo.phase} dose.`,
          displayValue: 'No prior therapy',
          details: {
            isDrugNaive,
            requestedDose: dose,
            requestedPhase: doseInfo.phase,
            isStartingDose
          }
        };
      }
      
      return {
        status: CriteriaStatus.MET,
        criterionType: 'doseProgression',
        reason: isDrugNaive 
          ? `Drug-naive patient requesting appropriate starting dose ${dose}`
          : `Dose progression appropriate for patient with therapy history`,
        displayValue: isDrugNaive ? 'Drug naive' : 'Has therapy history',
        details: {
          isDrugNaive,
          requestedDose: dose,
          requestedPhase: doseInfo.phase,
          isStartingDose
        }
      };
      
    default:
      return {
        status: CriteriaStatus.NOT_MET,
        criterionType: criterion.type,
        reason: `Unknown criterion type: ${criterion.type}`
      };
  }
}

// Helper function used by coverageLogic
export function getSimpleStatus(result) {
  return result?.status || CriteriaStatus.NOT_MET;
}

export function calculateApprovalLikelihood(criteriaResults) {
  if (!criteriaResults || criteriaResults.length === 0) return 0;
  
  const metCount = criteriaResults.filter(r => 
    r.status === CriteriaStatus.MET
  ).length;
  
  return Math.round((metCount / criteriaResults.length) * 100);
}