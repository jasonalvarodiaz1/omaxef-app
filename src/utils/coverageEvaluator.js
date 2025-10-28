import * as coverageLogic from './coverageLogic';
import { getCoverageForDrug, getApplicableCriteria, evaluatePACriteriaDetailed, getDoseInfo, getApprovalLikelihood } from './coverageLogic';
import { criteriaEvaluator } from './criteriaEvaluator';
import { getCodings, codeMatches, getObservationNumericValue, findLatestObservationByCode } from './fhirHelpers';
import { CriteriaStatus, normalizeStatus } from '../constants';
import { CacheManager } from './cacheManager';
import { withErrorRecovery } from './errorHandler';

// Lazy initialize cache manager to allow for mocking in tests
let cacheManager;
function getCacheManager() {
  if (!cacheManager) {
    cacheManager = new CacheManager();
  }
  return cacheManager;
}

// Allow tests to inject a mock cache manager
export function __setCacheManager(mockCache) {
  cacheManager = mockCache;
}

// Reset cache manager (for testing)
export function __resetCacheManager() {
  cacheManager = null;
}

export async function evaluateCoverage(patientId, medication, dose) {
  const cache = getCacheManager();
  try {
    // Check cache first
    const cacheKey = {
      patientId,
      medication: medication?.code || medication?.name,
      dose
    };
    
    const cached = await cache.get('evaluations', cacheKey);
    if (cached && cached.timestamp && (Date.now() - cached.timestamp < 5 * 60 * 1000)) {
      console.log('Using cached evaluation result');
      return cached;
    }

    // Proceed with evaluation
    const result = await withErrorRecovery(
      async () => performEvaluation(patientId, medication, dose),
      'CRITERIA_EVAL_ERROR',
      { operation: 'evaluateCoverage', patientId }
    );

    // Cache the result
    await cache.set('evaluations', cacheKey, {
      ...result,
      timestamp: Date.now()
    });

    return result;
  } catch (error) {
    console.error('Coverage evaluation failed:', error);
    return {
      error: error.message,
      criteriaResults: [],
      summary: 'Evaluation failed. Manual review required.',
      approvalLikelihood: 0,
      recommendations: [{
        priority: 'high',
        action: 'manual_review',
        message: 'Automated evaluation failed. Please perform manual review.',
        steps: ['Review patient chart', 'Contact payer for requirements']
      }],
      metadata: {
        evaluationDate: new Date().toISOString(),
        medication: medication?.name || medication?.code || 'Unknown',
        dose,
        patientId,
        metCriteria: 0,
        totalCriteria: 0,
        averageConfidence: 0
      }
    };
  }
}

async function performEvaluation(patientId, medication, dose) {
  // Mock patient data - replace with actual FHIR data fetching
  const patientData = await fetchPatientData(patientId);
  
  // Get applicable criteria for this medication
  // Handle both medication.code and medication.name for flexibility
  const medicationId = medication?.code || medication?.name;
  
  if (!medicationId) {
    return {
      error: 'Invalid medication parameter',
      criteriaResults: [],
      summary: 'Invalid medication specified',
      approvalLikelihood: 0,
      recommendations: [{
        priority: 'high',
        action: 'configuration',
        message: 'Medication must have a code or name property.'
      }],
      metadata: {
        evaluationDate: new Date().toISOString(),
        medication: 'Unknown',
        dose,
        patientId,
        metCriteria: 0,
        totalCriteria: 0,
        averageConfidence: 0
      }
    };
  }
  
  // Call getCriteriaForMedication if it exists (will be mocked in tests)
  let applicableCriteria = [];
  if (coverageLogic.getCriteriaForMedication) {
    applicableCriteria = coverageLogic.getCriteriaForMedication(medicationId, dose);
  } else {
    // Fallback to legacy getApplicableCriteria if getCriteriaForMedication doesn't exist
    // This maintains backward compatibility
    const drug = getCoverageForDrug(null, patientData.insurance, medication.name, null);
    if (drug) {
      applicableCriteria = getApplicableCriteria(drug, dose, patientData, medication.name);
    }
  }
  
  if (!applicableCriteria || applicableCriteria.length === 0) {
    return {
      error: 'No criteria found for this medication/dose combination',
      criteriaResults: [],
      summary: 'No coverage criteria configured',
      approvalLikelihood: 0,
      recommendations: [{
        priority: 'high',
        action: 'configuration',
        message: 'No criteria configured for this medication. Contact system administrator.'
      }],
      metadata: {
        evaluationDate: new Date().toISOString(),
        medication: medication?.name || medication?.code || 'Unknown',
        dose,
        patientId,
        metCriteria: 0,
        totalCriteria: 0,
        averageConfidence: 0
      }
    };
  }
  
  // Evaluate each criterion with enhanced features
  const criteriaResults = [];
  let totalScore = 0;
  let totalWeight = 0;
  let highPriorityRecommendations = [];
  let mediumPriorityRecommendations = [];
  
  // Create fhirHelpers object for compatibility with criteriaEvaluator
  const fhirHelpersObj = {
    getCodings,
    codeMatches,
    getObservationNumericValue,
    findLatestObservationByCode,
    getLatestObservation: findLatestObservationByCode,
    extractNumericValue: getObservationNumericValue,
    getObservationsByCode: (observations, code) => {
      return observations?.filter(obs => codeMatches(obs, code)) || [];
    }
  };
  
  for (const criterion of applicableCriteria) {
    let result;
    
    try {
      // Call the appropriate evaluator based on criterion type
      switch (criterion.type) {
        case 'age':
          result = await criteriaEvaluator.evaluateAge(patientData, criterion);
          break;
        case 'bmi':
          result = await criteriaEvaluator.evaluateBMI(patientData, criterion, fhirHelpersObj);
          break;
        case 'weightLoss':
          result = await criteriaEvaluator.evaluateWeightLoss(patientData, criterion, fhirHelpersObj);
          break;
        case 'maintenance':
          result = await criteriaEvaluator.evaluateMaintenance(patientData, criterion, fhirHelpersObj);
          break;
        case 'doseProgression':
          result = await criteriaEvaluator.evaluateDoseProgression(patientData, criterion, fhirHelpersObj);
          break;
        case 'documentation':
          result = await criteriaEvaluator.evaluateDocumentation(patientData, criterion);
          break;
        default:
          result = {
            status: CriteriaStatus.NOT_EVALUATED,
            reason: `Unknown criterion type: ${criterion.type}`,
            displayValue: 'Not evaluated',
            confidence: 0,
            evidence: [{
              type: 'error',
              message: `Criterion type '${criterion.type}' is not implemented`
            }]
          };
      }
    } catch (error) {
      console.error(`Error evaluating criterion ${criterion.type}:`, error);
      result = {
        status: CriteriaStatus.NOT_EVALUATED,
        reason: `Evaluation error: ${error.message}`,
        displayValue: 'Error',
        confidence: 0,
        evidence: [{
          type: 'error',
          message: error.message
        }]
      };
    }
    
    // Add criterion metadata to result
    result.criterion = criterion.description || criterion.type;
    result.type = criterion.type;
    result.required = criterion.required !== false;
    
    criteriaResults.push(result);
    
    // Calculate weighted score for approval likelihood
    const normalizedStatus = normalizeStatus(result.status);
    const confidence = result.confidence || 1;
    const weight = result.required ? 2 : 1;
    
    if (normalizedStatus === CriteriaStatus.MET) {
      totalScore += weight * confidence;
    } else if (normalizedStatus === CriteriaStatus.PARTIALLY_MET) {
      totalScore += weight * confidence * 0.5;
    } else if (normalizedStatus === CriteriaStatus.PENDING_DOCUMENTATION) {
      totalScore += weight * confidence * 0.3;
    }
    
    if (normalizedStatus !== CriteriaStatus.NOT_APPLICABLE) {
      totalWeight += weight;
    }
    
    // Collect recommendations
    if (result.recommendation) {
      if (result.recommendation.priority === 'high') {
        highPriorityRecommendations.push({
          ...result.recommendation,
          criterion: result.criterion,
          currentStatus: normalizedStatus
        });
      } else {
        mediumPriorityRecommendations.push({
          ...result.recommendation,
          criterion: result.criterion,
          currentStatus: normalizedStatus
        });
      }
    }
  }
  
  // Calculate approval likelihood
  const approvalLikelihood = totalWeight > 0 
    ? Math.round((totalScore / totalWeight) * 100)
    : 0;
  
  // Generate summary
  const metCount = criteriaResults.filter(r => 
    normalizeStatus(r.status) === CriteriaStatus.MET
  ).length;
  const totalCount = criteriaResults.filter(r => 
    normalizeStatus(r.status) !== CriteriaStatus.NOT_APPLICABLE
  ).length;
  
  let summary = `Patient meets ${metCount} of ${totalCount} criteria.`;
  
  if (approvalLikelihood >= 80) {
    summary += ' Prior authorization likely to be approved.';
  } else if (approvalLikelihood >= 60) {
    summary += ' Prior authorization may require additional documentation.';
  } else {
    summary += ' Prior authorization unlikely without addressing deficiencies.';
  }
  
  // Prioritize and limit recommendations
  const recommendations = [
    ...highPriorityRecommendations.slice(0, 3),
    ...mediumPriorityRecommendations.slice(0, 2)
  ];
  
  // Add general recommendations based on patterns
  const documentationCriteria = criteriaResults.filter(r => r.type === 'documentation');
  const unmetDocCount = documentationCriteria.filter(r => 
    normalizeStatus(r.status) === CriteriaStatus.NOT_MET || 
    normalizeStatus(r.status) === CriteriaStatus.PARTIALLY_MET
  ).length;
  
  if (unmetDocCount > 2) {
    recommendations.push({
      priority: 'high',
      action: 'documentation_review',
      message: `${unmetDocCount} criteria require documentation. Schedule comprehensive chart review.`,
      steps: [
        'Review missing documentation items',
        'Collect required clinical notes',
        'Update patient record'
      ]
    });
  }
  
  // Check for data quality issues
  const lowConfidenceCount = criteriaResults.filter(r => 
    r.confidence && r.confidence < 0.7
  ).length;
  
  if (lowConfidenceCount > 1) {
    recommendations.push({
      priority: 'medium',
      action: 'data_quality',
      message: 'Multiple criteria have low confidence due to outdated or missing data.',
      steps: [
        'Update clinical measurements',
        'Verify medication history',
        'Confirm documentation dates'
      ]
    });
  }
  
  const averageConfidence = criteriaResults.length
    ? criteriaResults.reduce((sum, r) => sum + (r.confidence || 0), 0) / criteriaResults.length
    : 0;
  
  return {
    criteriaResults,
    summary,
    approvalLikelihood,
    recommendations: recommendations.slice(0, 5), // Limit to 5 recommendations
    metadata: {
      evaluationDate: new Date().toISOString(),
      medication: medication?.name || 'Unknown',
      dose,
      patientId,
      metCriteria: metCount,
      totalCriteria: totalCount,
      averageConfidence
    }
  };
}

// Mock function - replace with actual FHIR data fetching
async function fetchPatientData(patientId) {
  // This should be replaced with actual FHIR API calls
  // For now, returning mock data structure
  
  const cache = getCacheManager();
  
  // Try to get from cache first
  const cached = await cache.get('patientData', { patientId });
  if (cached) {
    console.log('Using cached patient data');
    return cached;
  }
  
  // Base mock data
  const mockData = {
    id: patientId,
    birthDate: '1980-01-15',
    observations: [
      // Mock BMI observation
      {
        resourceType: 'Observation',
        code: {
          coding: [{ system: 'http://loinc.org', code: '39156-5' }]
        },
        valueQuantity: { value: 31, unit: 'kg/m2' },
        effectiveDateTime: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000).toISOString()
      },
      // Mock weight observations
      {
        resourceType: 'Observation',
        code: {
          coding: [{ system: 'http://loinc.org', code: '29463-7' }]
        },
        valueQuantity: { value: 95, unit: 'kg' },
        effectiveDateTime: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        resourceType: 'Observation',
        code: {
          coding: [{ system: 'http://loinc.org', code: '29463-7' }]
        },
        valueQuantity: { value: 88, unit: 'kg' },
        effectiveDateTime: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
      }
    ],
    medicationHistory: [
      {
        medication: 'metformin',
        dose: '1000',
        unit: 'mg',
        startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        medication: 'semaglutide',
        dose: '0.25',
        unit: 'mg',
        startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        medication: 'semaglutide',
        dose: '0.5',
        unit: 'mg',
        startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString(),
        endDate: null
      }
    ],
    documentation: []
  };
  
  // Add documentation only for patients that should have it
  if (!patientId.includes('no-docs')) {
    mockData.documentation = [
      {
        type: 'clinical_note',
        date: new Date(Date.now() - 20 * 24 * 60 * 60 * 1000).toISOString(),
        clinicalRationale: 'Patient has documented history of failed therapy with metformin due to GI intolerance. Current BMI 31 with ongoing weight management needs.'
      }
    ];
  }
  
  // Cache the mock data
  await cache.set('patientData', { patientId }, mockData);
  
  return mockData;
}