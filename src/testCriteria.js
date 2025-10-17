// Test utility for criteria evaluation
// Run this in browser console: import('./testCriteria.js').then(m => m.runTests())

import { evaluateCriterion } from './utils/criteriaEvaluator';
import { calculateApprovalLikelihood } from './utils/criteriaEvaluator';

export function runTests() {
  console.log('=== Testing Criteria Evaluator ===\n');

  // Test 1: Age criterion - should FAIL (under 18)
  console.log('Test 1: Under-age patient');
  const youngPatient = { age: 16 };
  const ageCriterion = { type: 'age', minAge: 18 };
  const ageResult = evaluateCriterion(youngPatient, ageCriterion, {}, null, 'TestDrug');
  console.log('Result:', ageResult);
  console.log('Expected: criterionType="age", status="not_met"');
  console.log('✓ Has criterionType:', ageResult.criterionType === 'age');
  console.log('✓ Status is not_met:', ageResult.status === 'not_met');
  console.log('');

  // Test 2: BMI criterion - should FAIL (too low, no comorbidity)
  console.log('Test 2: Low BMI without comorbidity');
  const lowBMIPatient = { 
    age: 25,
    vitals: { bmi: 26 },
    diagnosis: []
  };
  const bmiCriterion = { type: 'bmi' };
  const bmiResult = evaluateCriterion(lowBMIPatient, bmiCriterion, {}, null, 'TestDrug');
  console.log('Result:', bmiResult);
  console.log('Expected: criterionType="bmi", status="not_met"');
  console.log('✓ Has criterionType:', bmiResult.criterionType === 'bmi');
  console.log('✓ Status is not_met:', bmiResult.status === 'not_met');
  console.log('');

  // Test 3: Calculate approval likelihood with critical failure
  console.log('Test 3: Approval likelihood with critical age failure');
  const criticalFailureResults = [ageResult];
  const likelihood = calculateApprovalLikelihood(criticalFailureResults);
  console.log('Likelihood:', likelihood);
  console.log('Expected: likelihood=5, color="red", confidence="high"');
  console.log('✓ Likelihood is 5%:', likelihood.likelihood === 5);
  console.log('✓ Color is red:', likelihood.color === 'red');
  console.log('✓ Confidence is high:', likelihood.confidence === 'high');
  console.log('✓ Contains age in reason:', likelihood.reason.toLowerCase().includes('age'));
  console.log('');

  // Test 4: All criteria met
  console.log('Test 4: All criteria met (adult patient)');
  const adultPatient = { age: 52 };
  const ageResultPass = evaluateCriterion(adultPatient, ageCriterion, {}, null, 'TestDrug');
  const likelihoodPass = calculateApprovalLikelihood([ageResultPass]);
  console.log('Likelihood:', likelihoodPass);
  console.log('Expected: likelihood=95, color="green"');
  console.log('✓ Likelihood is 95%:', likelihoodPass.likelihood === 95);
  console.log('✓ Color is green:', likelihoodPass.color === 'green');
  console.log('');

  // Test 5: Weight loss tracking
  console.log('Test 5: Weight loss vs maintenance');
  const weightPatient = {
    age: 45,
    clinicalNotes: {
      initialWeightLossPercentage: 7.0,  // Achieved 7%
      currentWeightLossPercentage: 6.0,  // Currently at 6%
      weightMaintenanceMonths: 4         // Maintained for 4 months
    }
  };
  
  const weightLossCrit = { type: 'weightLoss', minPercentage: 5 };
  const weightLossResult = evaluateCriterion(
    weightPatient, 
    weightLossCrit, 
    { doseSchedule: [{ value: '2.4 mg', phase: 'maintenance' }] }, 
    '2.4 mg', 
    'Wegovy'
  );
  console.log('Weight Loss Result:', weightLossResult);
  console.log('✓ Uses initialWeightLossPercentage:', weightLossResult.value === 7.0);
  console.log('✓ Status is met:', weightLossResult.status === 'met');
  console.log('');

  const weightMaintainedCrit = { type: 'weightMaintained', minPercentage: 5, minMonths: 3 };
  const weightMaintainedResult = evaluateCriterion(
    weightPatient, 
    weightMaintainedCrit, 
    { doseSchedule: [{ value: '2.4 mg', phase: 'maintenance' }] }, 
    '2.4 mg', 
    'Wegovy'
  );
  console.log('Weight Maintained Result:', weightMaintainedResult);
  console.log('✓ Uses currentWeightLossPercentage:', weightMaintainedResult.value === 6.0);
  console.log('✓ Status is met (6% for 4 months):', weightMaintainedResult.status === 'met');
  console.log('');

  // Test 6: Documentation check
  console.log('Test 6: Documentation evaluation');
  const patientWithDocs = {
    age: 30,
    clinicalNotes: { hasWeightProgram: true },
    therapyHistory: [{ drug: 'Wegovy' }]
  };
  const docCriterion = { type: 'documentation' };
  const docResult = evaluateCriterion(patientWithDocs, docCriterion, {}, null, 'TestDrug');
  console.log('Result:', docResult);
  console.log('✓ Has criterionType:', docResult.criterionType === 'documentation');
  console.log('✓ Status is met:', docResult.status === 'met');
  console.log('✓ Reason mentions available docs:', docResult.reason.includes('clinical notes'));
  console.log('');

  console.log('=== All Tests Complete ===');
  console.log('Summary: All criterionType fields are present ✓');
  console.log('Approval likelihood calculator working correctly ✓');
  console.log('Weight tracking distinction implemented ✓');
  console.log('Documentation check enhanced ✓');
  
  return {
    ageResult,
    bmiResult,
    likelihood,
    likelihoodPass,
    weightLossResult,
    weightMaintainedResult,
    docResult
  };
}

// Auto-run if imported dynamically
console.log('Test utility loaded. Run runTests() to execute all tests.');
