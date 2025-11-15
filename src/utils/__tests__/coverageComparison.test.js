import { getCriteriaForMedication } from '../coverageLogic';
import { getEnhancedCriteriaForMedication } from '../enhancedCoverageLogic';

describe('Coverage Logic Comparison', () => {
  const testMedication = 'Wegovy';
  const testDose = '0.25 mg';
  
  it('should produce compatible criteria structure', async () => {
    const standardCriteria = getCriteriaForMedication(testMedication, testDose);
    const enhancedCriteria = await getEnhancedCriteriaForMedication(testMedication, testDose);
    
    // Both should have the same core criteria
    expect(standardCriteria).toHaveProperty('age');
    expect(enhancedCriteria).toHaveProperty('age');
    expect(standardCriteria).toHaveProperty('bmi');
    expect(enhancedCriteria).toHaveProperty('bmi');
  });
  
  it('enhanced version should add RxNorm metadata', async () => {
    const enhancedCriteria = await getEnhancedCriteriaForMedication(testMedication, testDose);
    expect(enhancedCriteria).toHaveProperty('_rxnormMetadata');
  });
});