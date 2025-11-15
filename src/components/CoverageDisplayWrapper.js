import React, { useState, useEffect } from 'react';
import CoverageDisplay from './CoverageDisplay';
import EnhancedCoverageDisplay from './EnhancedCoverageDisplay';
import { isRxNormEnabled } from '../config/features';

const CoverageDisplayWrapper = ({ patientData, medication, dose }) => {
  const [useEnhanced, setUseEnhanced] = useState(false);
  const [rxnormAvailable, setRxnormAvailable] = useState(true);
  
  useEffect(() => {
    // Check if RxNorm should be used
    const shouldUseRxNorm = isRxNormEnabled();
    setUseEnhanced(shouldUseRxNorm && rxnormAvailable);
  }, [rxnormAvailable]);
  
  const handleRxNormError = () => {
    console.warn('RxNorm API unavailable, falling back to standard mode');
    setRxnormAvailable(false);
  };
  
  if (useEnhanced) {
    return (
      <EnhancedCoverageDisplay 
        patientData={patientData}
        medication={medication}
        dose={dose}
        onRxNormError={handleRxNormError}
      />
    );
  }
  
  return (
    <CoverageDisplay 
      patientData={patientData}
      medication={medication}
      dose={dose}
    />
  );
};

export default CoverageDisplayWrapper;