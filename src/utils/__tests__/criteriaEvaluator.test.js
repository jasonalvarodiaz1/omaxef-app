import { criteriaEvaluator } from '../criteriaEvaluator';
import { CriteriaStatus } from '../../constants';
import { fhirHelpers } from '../fhirHelpers';

// Mock fhirHelpers
jest.mock('../fhirHelpers', () => ({
  fhirHelpers: {
    getLatestObservation: jest.fn(),
    getObservationsByCode: jest.fn(),
    extractNumericValue: jest.fn()
  }
}));

describe('Enhanced Criteria Evaluator', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateAge', () => {
    it('should return MET when patient meets minimum age', async () => {
      const patientData = {
        birthDate: '1980-01-01'
      };
      const criterion = {
        minimum: 18
      };

      const result = await criteriaEvaluator.evaluateAge(patientData, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBe(1.0);
      expect(result.evidence).toEqual([]);
      expect(result.details.age).toBeGreaterThanOrEqual(18);
    });

    it('should return NOT_MET when patient below minimum age', async () => {
      const patientData = {
        birthDate: '2020-01-01'
      };
      const criterion = {
        minimum: 18
      };

      const result = await criteriaEvaluator.evaluateAge(patientData, criterion);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.confidence).toBe(1.0);
    });

    it('should return PENDING_DOCUMENTATION when birthDate missing', async () => {
      const patientData = {};
      const criterion = { minimum: 18 };

      const result = await criteriaEvaluator.evaluateAge(patientData, criterion);

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
      expect(result.confidence).toBe(0);
      expect(result.evidence).toHaveLength(1);
      expect(result.evidence[0].type).toBe('error');
    });

    it('should calculate age correctly across leap years', async () => {
      const patientData = {
        birthDate: '2000-02-29' // Leap year birthday
      };
      const criterion = { minimum: 18 };

      const result = await criteriaEvaluator.evaluateAge(patientData, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.details.age).toBeGreaterThanOrEqual(24);
    });
  });

  describe('evaluateBMI', () => {
    it('should return MET when BMI meets threshold', async () => {
      const bmiObs = {
        valueQuantity: { value: 32 },
        effectiveDateTime: new Date().toISOString()
      };

      fhirHelpers.getLatestObservation.mockResolvedValue(bmiObs);
      fhirHelpers.extractNumericValue.mockReturnValue(32);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBe(1.0);
      expect(result.displayValue).toBe('32 kg/m²');
      expect(result.recommendation).toBeUndefined();
    });

    it('should return NOT_MET when BMI below threshold', async () => {
      const bmiObs = {
        valueQuantity: { value: 28 },
        effectiveDateTime: new Date().toISOString()
      };

      fhirHelpers.getLatestObservation.mockResolvedValue(bmiObs);
      fhirHelpers.extractNumericValue.mockReturnValue(28);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.priority).toBe('high');
      expect(result.recommendation.steps).toHaveLength(3);
    });

    it('should reduce confidence for stale BMI data (30+ days)', async () => {
      const staleBMI = {
        valueQuantity: { value: 32 },
        effectiveDateTime: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString()
      };

      fhirHelpers.getLatestObservation.mockResolvedValue(staleBMI);
      fhirHelpers.extractNumericValue.mockReturnValue(32);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('45 days old')
        })
      );
    });

    it('should reduce confidence more for very stale BMI data (90+ days)', async () => {
      const veryOldBMI = {
        valueQuantity: { value: 32 },
        effectiveDateTime: new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString()
      };

      fhirHelpers.getLatestObservation.mockResolvedValue(veryOldBMI);
      fhirHelpers.extractNumericValue.mockReturnValue(32);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.confidence).toBeLessThan(0.7);
      expect(result.evidence).toHaveLength(2);
    });

    it('should return PENDING_DOCUMENTATION when no BMI found', async () => {
      fhirHelpers.getLatestObservation.mockResolvedValue(null);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
      expect(result.confidence).toBe(0.3);
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.action).toBe('document_bmi');
    });

    it('should handle boundary condition exactly at threshold', async () => {
      const bmiObs = {
        valueQuantity: { value: 30.0 },
        effectiveDateTime: new Date().toISOString()
      };

      fhirHelpers.getLatestObservation.mockResolvedValue(bmiObs);
      fhirHelpers.extractNumericValue.mockReturnValue(30.0);

      const result = await criteriaEvaluator.evaluateBMI(
        { observations: [] },
        { threshold: 30 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
    });
  });

  describe('evaluateWeightLoss', () => {
    it('should calculate percentage weight loss correctly', async () => {
      const weights = [
        { 
          valueQuantity: { value: 100, unit: 'kg' }, 
          effectiveDateTime: '2024-01-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 95, unit: 'kg' }, 
          effectiveDateTime: '2024-02-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 90, unit: 'kg' }, 
          effectiveDateTime: '2024-03-01T00:00:00Z' 
        }
      ];

      fhirHelpers.getObservationsByCode.mockResolvedValue(weights);
      fhirHelpers.extractNumericValue
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(90);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.displayValue).toBe('10.0% loss');
      expect(result.details.percentageLoss).toBe('10.0');
      expect(result.recommendation).toBeUndefined();
    });

    it('should return NOT_MET when weight loss insufficient', async () => {
      const weights = [
        { 
          valueQuantity: { value: 100 }, 
          effectiveDateTime: '2024-01-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 98 }, 
          effectiveDateTime: '2024-02-01T00:00:00Z' 
        }
      ];

      fhirHelpers.getObservationsByCode.mockResolvedValue(weights);
      fhirHelpers.extractNumericValue
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(98);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.displayValue).toBe('2.0% loss');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.message).toContain('3.0% weight loss needed');
    });

    it('should return PENDING_DOCUMENTATION with insufficient measurements', async () => {
      const weights = [
        { 
          valueQuantity: { value: 100 }, 
          effectiveDateTime: '2024-01-01T00:00:00Z' 
        }
      ];

      fhirHelpers.getObservationsByCode.mockResolvedValue(weights);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
      expect(result.confidence).toBe(0.2);
      expect(result.evidence[0].message).toContain('Only 1 weight measurements found');
    });

    it('should reduce confidence with large measurement gaps', async () => {
      const weights = [
        { 
          valueQuantity: { value: 100 }, 
          effectiveDateTime: '2024-01-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 90 }, 
          effectiveDateTime: '2024-04-01T00:00:00Z' // 90 day gap
        }
      ];

      fhirHelpers.getObservationsByCode.mockResolvedValue(weights);
      fhirHelpers.extractNumericValue
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(90);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.confidence).toBeLessThan(0.8);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Gap of')
        })
      );
    });

    it('should detect weight regain pattern', async () => {
      const weights = [
        { 
          valueQuantity: { value: 100 }, 
          effectiveDateTime: '2024-01-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 92 }, 
          effectiveDateTime: '2024-02-01T00:00:00Z' 
        },
        { 
          valueQuantity: { value: 96 }, // Weight regain
          effectiveDateTime: '2024-03-01T00:00:00Z' 
        }
      ];

      fhirHelpers.getObservationsByCode.mockResolvedValue(weights);
      fhirHelpers.extractNumericValue
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(96)
        .mockReturnValueOnce(100)
        .mockReturnValueOnce(92)
        .mockReturnValueOnce(96);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: 'Recent weight regain detected'
        })
      );
      expect(result.confidence).toBeLessThan(1.0);
    });

    it('should handle no weight observations at all', async () => {
      fhirHelpers.getObservationsByCode.mockResolvedValue(null);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
      expect(result.displayValue).toBe('Insufficient data');
    });

    it('should handle empty weight observations array', async () => {
      fhirHelpers.getObservationsByCode.mockResolvedValue([]);

      const result = await criteriaEvaluator.evaluateWeightLoss(
        { observations: [] },
        { targetPercentage: 5 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
      expect(result.evidence[0].message).toContain('Only 0 weight measurements found');
    });
  });

  describe('evaluateMaintenance', () => {
    it('should return MET when maintenance period satisfied', async () => {
      const patientData = {
        medicationHistory: [
          {
            medication: 'metformin',
            startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString() // 6 months ago
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateMaintenance(
        patientData,
        { medication: 'metformin', minimumMonths: 3 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBe(1.0);
      expect(parseFloat(result.displayValue)).toBeGreaterThanOrEqual(6);
    });

    it('should return NOT_MET when maintenance period not met', async () => {
      const patientData = {
        medicationHistory: [
          {
            medication: 'metformin',
            startDate: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() // 2 months ago
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateMaintenance(
        patientData,
        { medication: 'metformin', minimumMonths: 3 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('Only');
      expect(result.reason).toContain('need 3');
    });

    it('should reduce confidence when therapy gaps detected', async () => {
      const patientData = {
        medicationHistory: [
          {
            medication: 'metformin',
            startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString(),
            gaps: ['2024-02-01 to 2024-02-15', '2024-03-01 to 2024-03-10']
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateMaintenance(
        patientData,
        { medication: 'metformin', minimumMonths: 3 },
        fhirHelpers
      );

      expect(result.confidence).toBe(0.8);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: '2 gap(s) in therapy detected'
        })
      );
    });

    it('should return NOT_MET when medication not found', async () => {
      const patientData = {
        medicationHistory: [
          {
            medication: 'lisinopril',
            startDate: new Date().toISOString()
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateMaintenance(
        patientData,
        { medication: 'metformin', minimumMonths: 3 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('No history of metformin found');
    });

    it('should handle case-insensitive medication matching', async () => {
      const patientData = {
        medicationHistory: [
          {
            medication: 'METFORMIN',
            startDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000).toISOString()
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateMaintenance(
        patientData,
        { medication: 'metformin', minimumMonths: 3 },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
    });
  });

  describe('evaluateDoseProgression', () => {
    it('should return MET when dose progression follows expected pattern', async () => {
      const patientData = {
        medicationHistory: [
          { medication: 'semaglutide', dose: '0.25' },
          { medication: 'semaglutide', dose: '0.5' },
          { medication: 'semaglutide', dose: '1.0' }
        ]
      };

      const result = await criteriaEvaluator.evaluateDoseProgression(
        patientData,
        { medication: 'semaglutide', expectedProgression: [0.25, 0.5, 1.0] },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBe(1.0);
    });

    it('should return PARTIALLY_MET when doses below expected', async () => {
      const patientData = {
        medicationHistory: [
          { medication: 'semaglutide', dose: '0.25' },
          { medication: 'semaglutide', dose: '0.25' }, // Should be 0.5
          { medication: 'semaglutide', dose: '0.5' }  // Should be 1.0
        ]
      };

      const result = await criteriaEvaluator.evaluateDoseProgression(
        patientData,
        { medication: 'semaglutide', expectedProgression: [0.25, 0.5, 1.0] },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.PARTIALLY_MET);
      expect(result.reason).toContain('expected');
    });

    it('should reduce confidence when progression incomplete', async () => {
      const patientData = {
        medicationHistory: [
          { medication: 'semaglutide', dose: '0.25' },
          { medication: 'semaglutide', dose: '0.5' }
        ]
      };

      const result = await criteriaEvaluator.evaluateDoseProgression(
        patientData,
        { medication: 'semaglutide', expectedProgression: [0.25, 0.5, 1.0, 2.0] },
        fhirHelpers
      );

      expect(result.confidence).toBeLessThan(1.0);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('Only 2 of 4')
        })
      );
    });

    it('should return NOT_MET when no medication history found', async () => {
      const patientData = {
        medicationHistory: []
      };

      const result = await criteriaEvaluator.evaluateDoseProgression(
        patientData,
        { medication: 'semaglutide', expectedProgression: [0.25, 0.5] },
        fhirHelpers
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
    });
  });

  describe('evaluateDocumentation', () => {
    it('should return MET when all documentation present', async () => {
      const patientData = {
        documentation: [
          {
            type: 'clinical_note',
            date: new Date().toISOString(),
            clinicalRationale: 'Patient has documented history of failed therapy with metformin due to GI intolerance. BMI remains elevated at 35 despite lifestyle modifications.'
          },
          {
            type: 'consent_form',
            date: new Date().toISOString(),
            clinicalRationale: 'Patient provided informed consent for GLP-1 therapy including discussion of risks and benefits.'
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note', 'consent_form'] }
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBe(1.0);
      expect(result.displayValue).toBe('2/2 documented');
    });

    it('should return PARTIALLY_MET when some documentation missing', async () => {
      const patientData = {
        documentation: [
          {
            type: 'clinical_note',
            date: new Date().toISOString(),
            clinicalRationale: 'Some clinical rationale here that is long enough to be considered detailed documentation.'
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note', 'consent_form', 'lab_results'] }
      );

      expect(result.status).toBe(CriteriaStatus.PARTIALLY_MET);
      expect(result.displayValue).toBe('1/3 documented');
      expect(result.reason).toContain('Missing: consent_form, lab_results');
      expect(result.recommendation).toBeDefined();
    });

    it('should reduce confidence for outdated documentation', async () => {
      const patientData = {
        documentation: [
          {
            type: 'clinical_note',
            date: new Date(Date.now() - 120 * 24 * 60 * 60 * 1000).toISOString(), // 120 days old
            clinicalRationale: 'Detailed clinical rationale explaining the medical necessity and clinical history.'
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note'] }
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.confidence).toBeLessThan(1.0);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('120 days old')
        })
      );
    });

    it('should reduce confidence for insufficient clinical rationale', async () => {
      const patientData = {
        documentation: [
          {
            type: 'clinical_note',
            date: new Date().toISOString(),
            clinicalRationale: 'Short note' // Less than 50 characters
          }
        ]
      };

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note'] }
      );

      expect(result.confidence).toBeLessThan(1.0);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('lacks detailed clinical rationale')
        })
      );
    });

    it('should return NOT_MET when no documentation found', async () => {
      const patientData = {
        documentation: []
      };

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note', 'consent_form'] }
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.displayValue).toBe('0/2 documented');
      expect(result.recommendation).toBeDefined();
      expect(result.recommendation.steps).toHaveLength(2);
    });

    it('should handle missing documentation array gracefully', async () => {
      const patientData = {};

      const result = await criteriaEvaluator.evaluateDocumentation(
        patientData,
        { required: ['clinical_note'] }
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
    });
  });

  describe('Error Handling', () => {
    it('should throw CriteriaEvaluationError on BMI evaluation failure', async () => {
      fhirHelpers.getLatestObservation.mockRejectedValue(new Error('FHIR API error'));

      await expect(
        criteriaEvaluator.evaluateBMI(
          { observations: [] },
          { threshold: 30 },
          fhirHelpers
        )
      ).rejects.toThrow('Failed to evaluate BMI criterion');
    });

    it('should throw CriteriaEvaluationError on age evaluation failure', async () => {
      const patientData = {
        birthDate: 'invalid-date'
      };

      await expect(
        criteriaEvaluator.evaluateAge(patientData, { minimum: 18 })
      ).rejects.toThrow();
    });
  });
});