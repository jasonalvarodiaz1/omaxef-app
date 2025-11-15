// Decode Epic's launch JWT to extract patient/user context
// This runs in the browser - Epic's launch tokens are safe to decode client-side

export const decodeLaunchToken = (launchToken) => {
  try {
    // JWT format: header.payload.signature
    const parts = launchToken.split('.');
    if (parts.length !== 3) {
      throw new Error('Invalid JWT format');
    }
    
    // Decode the payload (middle part)
    const payload = parts[1];
    const decodedPayload = atob(payload.replace(/-/g, '+').replace(/_/g, '/'));
    const claims = JSON.parse(decodedPayload);
    
    console.log('📋 Decoded launch token:', claims);
    
    return {
      patientId: claims.sub || claims.patient,
      clientId: claims.client_id,
      issuer: claims.iss,
      fhirServer: claims.aud,
      metadata: claims['epic.metadata'],
      expiresAt: claims.exp,
      issuedAt: claims.iat
    };
  } catch (error) {
    console.error('❌ Error decoding launch token:', error);
    return null;
  }
};

// Check if we can use the launch token directly for embedded mode
export const canUseDirectLaunch = (launchContext) => {
  // If Epic provides these, we might not need OAuth
  return !!(launchContext && launchContext.patientId && launchContext.fhirServer);
};
