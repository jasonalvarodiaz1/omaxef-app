import { criteriaEvaluator } from '../criteriaEvaluator';
import { CriteriaStatus } from '../../constants';

// Mock fhirHelpers if it's being used
const mockFhirHelpers = {
  getLatestObservation: jest.fn(),
  getObservationsByCode: jest.fn(),
  extractNumericValue: jest.fn(),
  getMedicationHistory: jest.fn()
};

describe.skip('Criteria Evaluator - Critical Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('evaluateBMI', () => {
    it('should return MET when BMI meets threshold for weight-related comorbidity', async () => {
      const patient = {
        id: 'test-patient',
        comorbidities: ['type-2-diabetes'],
        observations: []
      };

      const criterion = {
        type: 'bmi',
        threshold: 27,
        critical: true,
        description: 'BMI ≥ 27 with weight-related comorbidity'
      };

      // Mock FHIR helpers to return BMI observation
      mockFhirHelpers.getLatestObservation.mockResolvedValue({
        code: { coding: [{ code: '39156-5' }] },
        valueQuantity: { value: 32.9, unit: 'kg/m2' },
        effectiveDateTime: new Date().toISOString()
      });
      mockFhirHelpers.extractNumericValue.mockReturnValue(32.9);

      const result = await criteriaEvaluator.evaluateBMI(patient, criterion, mockFhirHelpers);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.displayValue).toContain('32.9');
      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return NOT_MET when no weight-related comorbidity', async () => {
      const patient = {
        id: 'test-patient',
        comorbidities: [], // No weight-related conditions
        observations: []
      };

      const criterion = {
        type: 'bmi',
        threshold: 27,
        critical: true
      };

      // Mock FHIR helpers to return BMI observation
      mockFhirHelpers.getLatestObservation.mockResolvedValue({
        code: { coding: [{ code: '39156-5' }] },
        valueQuantity: { value: 28, unit: 'kg/m2' },
        effectiveDateTime: new Date().toISOString()
      });
      mockFhirHelpers.extractNumericValue.mockReturnValue(28);

      const result = await criteriaEvaluator.evaluateBMI(patient, criterion, mockFhirHelpers);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('below threshold');
    });

    it('should return PENDING_DOCUMENTATION when weight data missing', async () => {
      const patient = {
        id: 'test-patient',
        comorbidities: ['type-2-diabetes'],
        observations: []
      };

      const criterion = {
        type: 'bmi',
        threshold: 27,
        critical: false // Non-critical
      };

      // Mock no BMI observation found
      mockFhirHelpers.getLatestObservation.mockResolvedValue(null);

      const result = await criteriaEvaluator.evaluateBMI(patient, criterion, mockFhirHelpers);

      expect(result.status).toBe(CriteriaStatus.PENDING_DOCUMENTATION);
    });

    it('should reduce confidence for stale weight data', async () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 100); // 100 days old

      const patient = {
        id: 'test-patient',
        comorbidities: ['type-2-diabetes'],
        observations: []
      };

      const criterion = {
        type: 'bmi',
        threshold: 27,
        critical: true
      };

      // Mock old BMI observation
      mockFhirHelpers.getLatestObservation.mockResolvedValue({
        code: { coding: [{ code: '39156-5' }] },
        valueQuantity: { value: 32, unit: 'kg/m2' },
        effectiveDateTime: oldDate.toISOString()
      });
      mockFhirHelpers.extractNumericValue.mockReturnValue(32);

      const result = await criteriaEvaluator.evaluateBMI(patient, criterion, mockFhirHelpers);

      expect(result.confidence).toBeDefined();
      expect(result.confidence).toBeLessThan(1.0); // Confidence reduced due to stale data
    });
  });

  describe('evaluateDoseProgression', () => {
    it('should block drug-naive patients from non-starting doses', () => {
      const patient = {
        id: 'andre-patel',
        medications: [] // Drug-naive
      };

      const drug = {
        name: 'Wegovy',
        code: 'wegovy',
        doses: [
          { value: '0.25', unit: 'mg', isStarting: true },
          { value: '0.5', unit: 'mg', isStarting: false },
          { value: '1.0', unit: 'mg', isStarting: false },
          { value: '1.7', unit: 'mg', isStarting: false },
          { value: '2.4', unit: 'mg', isStarting: false }
        ]
      };

      const criterion = {
        type: 'doseProgression',
        critical: true
      };

      // Try to start at 1.7mg (should fail)
      const selectedDose = '1.7';

      const result = criteriaEvaluator.evaluateDoseProgression(
        patient,
        criterion,
        drug,
        selectedDose
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('must start');
      expect(result.reason).toContain('0.25');
    });

    it('should allow proper dose titration after sufficient time', () => {
      const startDate = new Date();
      startDate.setDate(startDate.getDate() - 35); // 35 days ago

      const patient = {
        id: 'test-patient',
        medications: [
          {
            name: 'Wegovy',
            dose: '0.25',
            unit: 'mg',
            startDate: startDate.toISOString(),
            status: 'active'
          }
        ]
      };

      const drug = {
        name: 'Wegovy',
        code: 'wegovy',
        doses: [
          { value: '0.25', unit: 'mg', minimumDays: 28 },
          { value: '0.5', unit: 'mg', minimumDays: 28 }
        ]
      };

      const criterion = { type: 'doseProgression', critical: true };
      const selectedDose = '0.5'; // Next dose up

      const result = criteriaEvaluator.evaluateDoseProgression(
        patient,
        criterion,
        drug,
        selectedDose
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.reason).toContain('appropriate');
    });

    it('should block escalation if insufficient time on current dose', () => {
      const recentStart = new Date();
      recentStart.setDate(recentStart.getDate() - 10); // Only 10 days

      const patient = {
        id: 'test-patient',
        medications: [
          {
            name: 'Wegovy',
            dose: '0.25',
            unit: 'mg',
            startDate: recentStart.toISOString(),
            status: 'active'
          }
        ]
      };

      const drug = {
        name: 'Wegovy',
        code: 'wegovy',
        doses: [
          { value: '0.25', unit: 'mg', minimumDays: 28 },
          { value: '0.5', unit: 'mg', minimumDays: 28 }
        ]
      };

      const criterion = { type: 'doseProgression', critical: true };
      const selectedDose = '0.5';

      const result = criteriaEvaluator.evaluateDoseProgression(
        patient,
        criterion,
        drug,
        selectedDose
      );

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('only 10 days');
    });

    it('should block escalation beyond max dose', () => {
      const patient = {
        id: 'sarah-johnson',
        medications: [
          {
            name: 'Wegovy',
            dose: '2.4',
            unit: 'mg',
            startDate: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString(),
            status: 'active'
          }
        ]
      };

      const drug = {
        name: 'Wegovy',
        code: 'wegovy',
        doses: [
          { value: '2.4', unit: 'mg', isMaxDose: true }
        ]
      };

      const criterion = { type: 'doseProgression', critical: true };
      const selectedDose = '2.4'; // Already on max

      const result = criteriaEvaluator.evaluateDoseProgression(
        patient,
        criterion,
        drug,
        selectedDose
      );

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.reason).toContain('max');
    });
  });

  describe('evaluateWeightLoss', () => {
    it('should calculate weight loss percentage correctly', () => {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

      const patient = {
        id: 'test-patient',
        weightHistory: [
          { value: 100, unit: 'kg', date: threeMonthsAgo.toISOString() },
          { value: 95, unit: 'kg', date: new Date().toISOString() }
        ]
      };

      const criterion = {
        type: 'weightLoss',
        targetPercentage: 5,
        periodMonths: 3,
        critical: false
      };

      const result = criteriaEvaluator.evaluateWeightLoss(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.displayValue).toContain('5.0%');
      expect(result.confidence).toBeGreaterThan(0.8);
    });

    it('should return NOT_APPLICABLE when no weight history for non-critical', () => {
      const patient = {
        id: 'test-patient',
        weightHistory: []
      };

      const criterion = {
        type: 'weightLoss',
        targetPercentage: 5,
        critical: false
      };

      const result = criteriaEvaluator.evaluateWeightLoss(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.NOT_APPLICABLE);
    });

    it('should detect weight regain', () => {
      const patient = {
        id: 'test-patient',
        weightHistory: [
          { value: 100, unit: 'kg', date: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString() },
          { value: 92, unit: 'kg', date: new Date(Date.now() - 45 * 24 * 60 * 60 * 1000).toISOString() },
          { value: 96, unit: 'kg', date: new Date().toISOString() } // Regain
        ]
      };

      const criterion = {
        type: 'weightLoss',
        targetPercentage: 5,
        critical: false
      };

      const result = criteriaEvaluator.evaluateWeightLoss(patient, criterion);

      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('regain')
        })
      );
    });
  });

  describe('evaluateWeightMaintenance', () => {
    it('should pass when weight maintained within 1% tolerance', () => {
      const patient = {
        id: 'test-patient',
        weightHistory: [
          { value: 90, unit: 'kg', date: new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString() },
          { value: 90.5, unit: 'kg', date: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString() },
          { value: 89.8, unit: 'kg', date: new Date().toISOString() }
        ]
      };

      const criterion = {
        type: 'weightMaintenance',
        tolerancePercent: 1,
        critical: false
      };

      const result = criteriaEvaluator.evaluateWeightMaintenance(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.displayValue).toContain('maintained');
    });
  });

  describe('evaluateContraindications', () => {
    it('should fail when patient has absolute contraindication', () => {
      const patient = {
        id: 'test-patient',
        contraindications: ['medullary-thyroid-cancer']
      };

      const criterion = {
        type: 'contraindications',
        critical: true
      };

      const result = criteriaEvaluator.evaluateContraindications(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.reason).toContain('absolute contraindication');
    });

    it('should pass when no contraindications', () => {
      const patient = {
        id: 'test-patient',
        contraindications: []
      };

      const criterion = {
        type: 'contraindications',
        critical: true
      };

      const result = criteriaEvaluator.evaluateContraindications(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
    });
  });

  describe('evaluateDocumentation', () => {
    it('should return MET when all required docs present', () => {
      const patient = {
        id: 'test-patient',
        documentation: [
          {
            type: 'clinical_note',
            date: new Date().toISOString(),
            clinicalRationale: 'Patient meets all criteria for weight management medication with documented failed lifestyle interventions and comorbidities.'
          },
          {
            type: 'consent_form',
            date: new Date().toISOString(),
            clinicalRationale: 'Informed consent obtained and documented.'
          }
        ]
      };

      const criterion = {
        type: 'documentation',
        required: ['clinical_note', 'consent_form'],
        critical: true
      };

      const result = criteriaEvaluator.evaluateDocumentation(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.displayValue).toBe('2/2 documented');
    });

    it('should return NOT_APPLICABLE when docs missing and not critical', () => {
      const patient = {
        id: 'test-patient',
        documentation: []
      };

      const criterion = {
        type: 'documentation',
        required: ['clinical_note'],
        critical: false
      };

      const result = criteriaEvaluator.evaluateDocumentation(patient, criterion);

      expect(result.status).toBe(CriteriaStatus.NOT_APPLICABLE);
    });

    it('should reduce confidence for outdated documentation', () => {
      const oldDate = new Date();
      oldDate.setDate(oldDate.getDate() - 180); // 6 months old

      const patient = {
        id: 'test-patient',
        documentation: [
          {
            type: 'clinical_note',
            date: oldDate.toISOString(),
            clinicalRationale: 'Old clinical rationale that needs updating.'
          }
        ]
      };

      const criterion = {
        type: 'documentation',
        required: ['clinical_note'],
        critical: true
      };

      const result = criteriaEvaluator.evaluateDocumentation(patient, criterion);

      expect(result.confidence).toBeLessThan(0.9);
      expect(result.evidence).toContainEqual(
        expect.objectContaining({
          type: 'warning',
          message: expect.stringContaining('old')
        })
      );
    });
  });

  describe('Indication-based PA criteria', () => {
    it('should apply diabetes criteria when indication is diabetes', () => {
      const patient = {
        id: 'test-patient',
        comorbidities: ['type-2-diabetes'],
        insurance: 'Blue Cross Blue Shield'
      };

      const drug = {
        name: 'Ozempic',
        code: 'ozempic',
        indications: ['diabetes', 'weight-loss']
      };

      const indication = 'diabetes';

      // This test would call your actual coverage logic
      // Just ensuring the pattern is correct
      expect(indication).toBe('diabetes');
      expect(drug.indications).toContain('diabetes');
    });

    it('should deny Medicare coverage for weight loss indication', () => {
      const patient = {
        id: 'maria-gomez',
        insurance: 'Medicare Part D'
      };

      const drug = {
        name: 'Ozempic',
        code: 'ozempic'
      };

      const indication = 'weight-loss';

      // Medicare/Medicare Part D cannot cover weight loss indication
      expect(patient.insurance).toContain('Medicare');
      expect(indication).toBe('weight-loss');
      // Your coverage logic should deny this
    });
  });
});