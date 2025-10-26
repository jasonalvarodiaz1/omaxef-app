import { evaluateCriterion } from '../utils/criteriaEvaluator';
import { CriteriaStatus } from '../constants';

describe('criteriaEvaluator', () => {
  describe('evaluateAge', () => {
    test('returns MET when patient meets age requirement', () => {
      const patient = { age: 25 };
      const criterion = { type: 'age', minAge: 18 };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.criterionType).toBe('age');
      expect(result.value).toBe(25);
    });

    test('returns NOT_MET when patient does not meet age requirement', () => {
      const patient = { age: 16 };
      const criterion = { type: 'age', minAge: 18 };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.criterionType).toBe('age');
      expect(result.value).toBe(16);
    });
  });

  describe('evaluateBMI', () => {
    test('returns MET when BMI is >= 30', () => {
      const patient = {
        vitals: { bmi: 32 },
        diagnosis: []
      };
      const criterion = { type: 'bmi' };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.criterionType).toBe('bmi');
      expect(result.value).toBe(32);
    });

    test('returns MET when BMI is >= 27 with comorbidity', () => {
      const patient = {
        vitals: { bmi: 28 },
        diagnosis: ['Type 2 Diabetes']
      };
      const criterion = { type: 'bmi' };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.criterionType).toBe('bmi');
      expect(result.value).toBe(28);
      expect(result.hasComorbidity).toBe(true);
    });

    test('returns NOT_MET when BMI is < 27', () => {
      const patient = {
        vitals: { bmi: 25 },
        diagnosis: []
      };
      const criterion = { type: 'bmi' };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.criterionType).toBe('bmi');
      expect(result.value).toBe(25);
    });

    test('returns NOT_MET when BMI is 27-29 without comorbidity', () => {
      const patient = {
        vitals: { bmi: 28 },
        diagnosis: []
      };
      const criterion = { type: 'bmi' };
      const drug = {};
      const dose = '1mg';
      const drugName = 'Test Drug';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.criterionType).toBe('bmi');
      expect(result.value).toBe(28);
      expect(result.hasComorbidity).toBe(false);
    });
  });

  describe('evaluateDoseProgression', () => {
    test('drug-naive patient: returns NOT_MET when requesting non-starting dose', () => {
      const patient = {
        therapyHistory: [] // No history with Wegovy
      };
      const criterion = { type: 'doseProgression' };
      const drug = {
        doseSchedule: [
          { value: "0.25 mg", phase: "starting", duration: "Month 1" },
          { value: "0.5 mg", phase: "titration", duration: "Month 2" },
          { value: "1.7 mg", phase: "titration", duration: "Month 4" },
          { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
        ]
      };
      const dose = '1.7 mg'; // Requesting titration dose
      const drugName = 'Wegovy';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.NOT_MET);
      expect(result.criterionType).toBe('doseProgression');
      expect(result.displayValue).toBe('No prior therapy');
    });

    test('drug-naive patient: returns MET when requesting starting dose', () => {
      const patient = {
        therapyHistory: [] // No history with Wegovy
      };
      const criterion = { type: 'doseProgression' };
      const drug = {
        doseSchedule: [
          { value: "0.25 mg", phase: "starting", duration: "Month 1" },
          { value: "0.5 mg", phase: "titration", duration: "Month 2" },
          { value: "1.7 mg", phase: "titration", duration: "Month 4" }
        ]
      };
      const dose = '0.25 mg'; // Requesting starting dose
      const drugName = 'Wegovy';

      const result = evaluateCriterion(patient, criterion, drug, dose, drugName);

      expect(result.status).toBe(CriteriaStatus.MET);
      expect(result.criterionType).toBe('doseProgression');
      expect(result.displayValue).toBe('Drug naive');
    });
  });
});
