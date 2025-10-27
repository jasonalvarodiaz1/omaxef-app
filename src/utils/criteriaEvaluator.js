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

// Export a stub for evaluatePatientCriteria for compatibility
export function evaluatePatientCriteria() {
  throw new Error('evaluatePatientCriteria is not implemented. Use criteriaEvaluator instead.');
}
      
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
      
    case 'bmi': {
      const bmiValue = patient.vitals?.bmi || patient.bmi;
      
      // Check for weight-related comorbidities specifically
      const weightRelatedComorbidities = [
        'diabetes',
        'type 2 diabetes',
        'hypertension',
        'dyslipidemia',
        'hyperlipidemia',
        'sleep apnea',
        'obstructive sleep apnea',
        'cardiovascular',
        'heart disease',
        'coronary',
        'ischemic heart'
      ];
      
      const diagnosisList = [
        ...(patient.diagnosis || []),
        ...(patient.comorbidities || [])
      ].map(d => d.toLowerCase());
      
      const hasWeightRelatedComorbidity = diagnosisList.some(diagnosis =>
        weightRelatedComorbidities.some(comorbidity => diagnosis.includes(comorbidity))
      );
      
      let bmiMet = false;
      let bmiReason = '';
      
      if (bmiValue >= 30) {
        bmiMet = true;
        bmiReason = `BMI ${bmiValue} ≥ 30`;
      } else if (bmiValue >= 27 && hasWeightRelatedComorbidity) {
        bmiMet = true;
        const matchedComorbidities = diagnosisList.filter(d => 
          weightRelatedComorbidities.some(c => d.includes(c))
        );
        bmiReason = `BMI ${bmiValue} ≥ 27 with weight-related comorbidity: ${matchedComorbidities[0]}`;
      } else if (bmiValue >= 27 && bmiValue < 30) {
        bmiReason = `BMI ${bmiValue} is 27-29.9 but no weight-related comorbidities present`;
      } else {
        bmiReason = `BMI ${bmiValue} < 27`;
      }
      
      return {
        status: bmiMet ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'bmi',
        value: bmiValue,
        reason: bmiReason,
        hasComorbidity: hasWeightRelatedComorbidity,
        hasWeightRelatedComorbidity
      };
    }
      
    case 'doseProgression': {
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
    }
    
    case 'lifestyleModification': {
      const lifestyle = patient.clinicalNotes?.lifestyleModification;
      const requiredMonths = criterion.requiredDuration || 3;
      
      if (!lifestyle || !lifestyle.participated) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'lifestyleModification',
          reason: 'No documented lifestyle modification program',
          displayValue: 'Not documented'
        };
      }
      
      const durationMet = lifestyle.durationMonths >= requiredMonths;
      const maxWeightLoss = criterion.maxWeightLoss || 5;
      const weightLossMet = !criterion.maxWeightLoss || (lifestyle.weightLossAchieved < maxWeightLoss);
      
      const met = durationMet && weightLossMet;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'lifestyleModification',
        reason: met 
          ? `Completed ${lifestyle.durationMonths}-month program with ${lifestyle.weightLossAchieved}% weight loss`
          : !durationMet 
            ? `Only ${lifestyle.durationMonths} months (need ${requiredMonths})`
            : `Weight loss ${lifestyle.weightLossAchieved}% exceeds threshold`,
        displayValue: `${lifestyle.durationMonths} months`
      };
    }
    
    case 'priorTherapies': {
      const priorAttempts = patient.clinicalNotes?.priorWeightLossAttempts || [];
      const minTrials = criterion.minTrials || 2;
      
      if (priorAttempts.length >= minTrials) {
        return {
          status: CriteriaStatus.MET,
          criterionType: 'priorTherapies',
          reason: `Documented ${priorAttempts.length} prior weight loss attempts`,
          displayValue: `${priorAttempts.length} trials`
        };
      }
      
      return {
        status: CriteriaStatus.NOT_MET,
        criterionType: 'priorTherapies',
        reason: `Only ${priorAttempts.length} trials documented (need ${minTrials})`,
        displayValue: `${priorAttempts.length}/${minTrials}`
      };
    }
    
    case 'prescriberQualification': {
      const prescriber = patient.clinicalNotes?.prescriberQualification;
      
      if (!prescriber || !prescriber.qualified) {
        // If criterion is not marked as critical, treat missing data as not applicable
        // rather than not met (prescriber qualification is often assumed if not documented)
        const isCritical = criterion.critical === true;
        
        return {
          status: isCritical ? CriteriaStatus.NOT_MET : CriteriaStatus.NOT_APPLICABLE,
          criterionType: 'prescriberQualification',
          reason: isCritical 
            ? 'Prescriber qualification not documented (required)' 
            : 'Prescriber qualification not documented (assumed qualified if prescribing)',
          displayValue: 'Not documented'
        };
      }
      
      return {
        status: CriteriaStatus.MET,
        criterionType: 'prescriberQualification',
        reason: `Prescriber qualified: ${prescriber.specialty}`,
        displayValue: prescriber.specialty
      };
    }
    
    case 'contraindications': {
      const contraindications = patient.clinicalNotes?.contraindications;
      
      if (!contraindications) {
        const isCritical = criterion.critical === true;
        return {
          status: isCritical ? CriteriaStatus.NOT_MET : CriteriaStatus.NOT_APPLICABLE,
          criterionType: 'contraindications',
          reason: isCritical
            ? 'Contraindications screening not documented (required)'
            : 'Contraindications not documented (optional)',
          displayValue: 'Not documented'
        };
      }
      
      // Check for any contraindications
      const hasContraindication = 
        contraindications.pregnancy ||
        contraindications.breastfeeding ||
        contraindications.mtcHistory ||
        contraindications.men2 ||
        contraindications.pancreatitis ||
        contraindications.familyMtcHistory;
      
      return {
        status: hasContraindication ? CriteriaStatus.NOT_MET : CriteriaStatus.MET,
        criterionType: 'contraindications',
        reason: hasContraindication 
          ? 'Patient has documented contraindications'
          : 'No contraindications documented',
        displayValue: hasContraindication ? 'Present' : 'None'
      };
    }
    
    case 'documentation': {
      const documentation = patient.clinicalNotes?.documentation;
      
      if (!documentation) {
        const isCritical = criterion.critical === true;
        return {
          status: isCritical ? CriteriaStatus.NOT_MET : CriteriaStatus.NOT_APPLICABLE,
          criterionType: 'documentation',
          reason: isCritical 
            ? 'Documentation not present (required)'
            : 'Documentation not present (not required)',
          displayValue: 'Not documented'
        };
      }
      
      const requiredDocs = [
        'baselineVitals',
        'bmiChart',
        'comorbidities',
        'lifestyleProgram',
        'priorMedications',
        'treatmentPlan'
      ];
      
      const presentDocs = requiredDocs.filter(doc => documentation[doc]?.present);
      const allPresent = presentDocs.length === requiredDocs.length;
      
      return {
        status: allPresent ? CriteriaStatus.MET : CriteriaStatus.PARTIALLY_MET,
        criterionType: 'documentation',
        reason: allPresent 
          ? 'All required documentation present'
          : `${presentDocs.length}/${requiredDocs.length} documents present`,
        displayValue: `${presentDocs.length}/${requiredDocs.length}`
      };
    }
    
    case 'diagnosis': {
      const requiredDiagnosis = criterion.requiredDiagnosis;
      const hasDiagnosis = patient.diagnosis?.some(d => 
        d.toLowerCase().includes(requiredDiagnosis.toLowerCase())
      );
      
      return {
        status: hasDiagnosis ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'diagnosis',
        reason: hasDiagnosis 
          ? `Patient has ${requiredDiagnosis} diagnosis`
          : `${requiredDiagnosis} diagnosis not found`,
        displayValue: hasDiagnosis ? 'Documented' : 'Not documented'
      };
    }
    
    case 'labValue': {
      const labName = criterion.labName;
      const minValue = criterion.minValue;
      const labData = patient.labs?.[labName.toLowerCase().replace(/\s/g, '')];
      
      if (!labData) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'labValue',
          reason: `${labName} not documented`,
          displayValue: 'Not documented'
        };
      }
      
      const labValue = labData.value;
      const met = labValue >= minValue;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'labValue',
        reason: met 
          ? `${labName} ${labValue}${labData.units} >= ${minValue}${labData.units}`
          : `${labName} ${labValue}${labData.units} < ${minValue}${labData.units}`,
        displayValue: `${labValue}${labData.units}`
      };
    }
    
    case 'stepTherapy': {
      const requiredMed = criterion.requiredMedication;
      const minDuration = criterion.minDuration || 3; // months
      
      if (!requiredMed) {
        // If no specific medication required, check for min number of trials
        const minTrials = criterion.minTrials || 1;
        const priorMeds = patient.clinicalNotes?.priorMedicationTrials || [];
        
        return {
          status: priorMeds.length >= minTrials ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
          criterionType: 'stepTherapy',
          reason: priorMeds.length >= minTrials
            ? `${priorMeds.length} prior medication trials documented`
            : `Only ${priorMeds.length} trials (need ${minTrials})`,
          displayValue: `${priorMeds.length} trials`
        };
      }
      
      // Check for specific medication
      const medHistory = patient.medications?.find(med => 
        med.name.toLowerCase().includes(requiredMed.toLowerCase())
      );
      
      if (!medHistory) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'stepTherapy',
          reason: `No ${requiredMed} trial documented`,
          displayValue: 'Not tried'
        };
      }
      
      // Check duration if startDate is available
      if (medHistory.startDate) {
        const startDate = new Date(medHistory.startDate);
        const monthsOnMed = (Date.now() - startDate) / (1000 * 60 * 60 * 24 * 30);
        const durationMet = monthsOnMed >= minDuration;
        
        return {
          status: durationMet ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
          criterionType: 'stepTherapy',
          reason: durationMet
            ? `${requiredMed} tried for ${Math.floor(monthsOnMed)} months`
            : `${requiredMed} only ${Math.floor(monthsOnMed)} months (need ${minDuration})`,
          displayValue: `${Math.floor(monthsOnMed)} months`
        };
      }
      
      // If no start date, assume it's documented but duration unknown
      return {
        status: CriteriaStatus.PARTIALLY_MET,
        criterionType: 'stepTherapy',
        reason: `${requiredMed} documented but duration not specified`,
        displayValue: 'Documented'
      };
    }
    
    case 'efficacy': {
      // For continuation criteria - check for clinical improvement
      const a1cBaseline = patient.clinicalNotes?.baselineA1C;
      const a1cCurrent = patient.labs?.a1c?.value;
      
      if (!a1cBaseline || !a1cCurrent) {
        const isCritical = criterion.critical === true;
        return {
          status: isCritical ? CriteriaStatus.NOT_MET : CriteriaStatus.NOT_APPLICABLE,
          criterionType: 'efficacy',
          reason: isCritical
            ? 'Baseline or current A1C not documented (required for continuation)'
            : 'Baseline or current A1C not documented (optional for continuation)',
          displayValue: 'Not documented'
        };
      }
      
      const a1cReduction = a1cBaseline - a1cCurrent;
      const met = a1cReduction >= 0.5;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'efficacy',
        reason: met
          ? `A1C reduced by ${a1cReduction.toFixed(1)}%`
          : `A1C reduction only ${a1cReduction.toFixed(1)}% (need ≥0.5%)`,
        displayValue: `${a1cReduction.toFixed(1)}% reduction`
      };
    }
    
    case 'cvdRisk': {
      // Check for cardiovascular disease or risk factors
      const hasCVD = patient.diagnosis?.some(d => 
        d.toLowerCase().includes('cardiovascular') ||
        d.toLowerCase().includes('heart disease') ||
        d.toLowerCase().includes('coronary')
      );
      
      const cvRiskFactors = patient.clinicalNotes?.cvRiskFactors;
      
      if (hasCVD || cvRiskFactors?.high) {
        return {
          status: CriteriaStatus.MET,
          criterionType: 'cvdRisk',
          reason: hasCVD ? 'Documented CVD' : 'High CV risk documented',
          displayValue: 'Present'
        };
      }
      
      return {
        status: CriteriaStatus.NOT_APPLICABLE,
        criterionType: 'cvdRisk',
        reason: 'No CVD or high CV risk documented (not required)',
        displayValue: 'N/A'
      };
    }
    
    case 'weightLoss': {
      const minPercentage = criterion.minPercentage || 5;
      const initialWeightLoss = patient.clinicalNotes?.initialWeightLossPercentage;
      
      if (initialWeightLoss === undefined || initialWeightLoss === null) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'weightLoss',
          reason: 'Weight loss not documented',
          displayValue: 'Not documented'
        };
      }
      
      const met = initialWeightLoss >= minPercentage;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'weightLoss',
        reason: met
          ? `Achieved ${initialWeightLoss}% weight loss (≥${minPercentage}%)`
          : `Only ${initialWeightLoss}% weight loss (need ≥${minPercentage}%)`,
        displayValue: `${initialWeightLoss}%`
      };
    }
    
    case 'weightMaintained': {
      const minPercentage = criterion.minPercentage || 5;
      const currentWeightLoss = patient.clinicalNotes?.currentWeightLossPercentage;
      const initialWeightLoss = patient.clinicalNotes?.initialWeightLossPercentage;
      const maintenanceMonths = patient.clinicalNotes?.weightMaintenanceMonths || 0;
      
      if (currentWeightLoss === undefined || currentWeightLoss === null) {
        return {
          status: CriteriaStatus.NOT_MET,
          criterionType: 'weightMaintained',
          reason: 'Current weight loss not documented',
          displayValue: 'Not documented'
        };
      }
      
      // For weight maintenance, patient should have:
      // 1. Initially achieved the target (e.g., ≥5%)
      // 2. Currently maintaining close to that level (allow some variation, e.g., within 1-2% of initial)
      const initiallyMetTarget = initialWeightLoss >= minPercentage;
      const maintainingWeight = currentWeightLoss >= (minPercentage - 1); // Allow 1% fluctuation
      
      const met = initiallyMetTarget && maintainingWeight;
      
      return {
        status: met ? CriteriaStatus.MET : CriteriaStatus.NOT_MET,
        criterionType: 'weightMaintained',
        reason: met
          ? `Achieved ${initialWeightLoss}% initially, maintaining ${currentWeightLoss}% for ${maintenanceMonths} months`
          : !initiallyMetTarget
            ? `Did not achieve initial target of ${minPercentage}%`
            : `Weight regain - now at ${currentWeightLoss}% (from ${initialWeightLoss}%)`,
        displayValue: `${currentWeightLoss}%`
      };
    }
      
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
  if (!criteriaResults || criteriaResults.length === 0) {
    return { likelihood: 0, color: 'red', reason: 'No criteria evaluated' };
  }
  
  const metCount = criteriaResults.filter(r => 
    r.status === CriteriaStatus.MET
  ).length;
  
  const notMetCount = criteriaResults.filter(r =>
    r.status === CriteriaStatus.NOT_MET
  ).length;
  
  const partialCount = criteriaResults.filter(r =>
    r.status === CriteriaStatus.PARTIALLY_MET
  ).length;
  
  const likelihood = Math.round((metCount / criteriaResults.length) * 100);
  
  let color = 'red';
  let reason = '';
  
  if (likelihood >= 80) {
    color = 'green';
    reason = `${metCount}/${criteriaResults.length} criteria met`;
  } else if (likelihood >= 60) {
    color = 'yellow';
    reason = `${metCount}/${criteriaResults.length} criteria met, ${notMetCount} not met`;
  } else {
    color = 'red';
    reason = `Only ${metCount}/${criteriaResults.length} criteria met, ${notMetCount} not met`;
  }
  
  if (partialCount > 0) {
    reason += `, ${partialCount} partially met`;
  }
  
  return { likelihood, color, reason };
}