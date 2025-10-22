import React, { useState } from 'react';
import { epicConfig } from '../config/epicConfig';

export default function EpicLogin() {
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // Clean URL on component mount (remove any old OAuth parameters)
  React.useEffect(() => {
    const currentUrl = window.location.href;
    if (currentUrl.includes('?code=') || currentUrl.includes('&code=')) {
      console.log('Cleaning OAuth parameters from URL');
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  const handleLogin = async () => {
    setLoading(true);
    setError(null);

    try {
      // Clear any old session data first
      sessionStorage.clear();
      
      // Generate random state for security
      const state = Math.random().toString(36).substring(2, 15);

      // Generate PKCE parameters
      const { codeVerifier, codeChallenge } = await generatePKCE();
      
      console.log('=== PKCE Generation ===');
      console.log('Code verifier length:', codeVerifier.length);
      console.log('Code verifier:', codeVerifier);
      console.log('Code challenge:', codeChallenge);

      // Store state and code verifier in sessionStorage
      sessionStorage.setItem('oauth_state', state);
      sessionStorage.setItem('code_verifier', codeVerifier);

      // Build the authorization URL
      const params = new URLSearchParams({
        response_type: 'code',
        client_id: epicConfig.clientId,
        redirect_uri: epicConfig.redirectUri,
        scope: epicConfig.scope,
        state: state,
        code_challenge: codeChallenge,
        code_challenge_method: 'S256',
        aud: epicConfig.iss
      });

      const authUrl = `${epicConfig.authorizeUrl}?${params.toString()}`;
      console.log('=== Authorization Request ===');
      console.log('Full auth URL:', authUrl);
      console.log('Client ID:', epicConfig.clientId);
      console.log('Redirect URI:', epicConfig.redirectUri);
      console.log('State:', state);

      // Redirect to the Epic login page
      window.location.href = authUrl;
    } catch (error) {
      console.error('Epic login error:', error);
      setError(error.message || 'Failed to initiate Epic login');
      setLoading(false);
    }
  };

  // Helper function to convert ArrayBuffer to base64url
  const base64urlEncode = (arrayBuffer) => {
    const bytes = new Uint8Array(arrayBuffer);
    let binary = '';
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const base64 = btoa(binary);
    return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '');
  };

  const generatePKCE = async () => {
    // Generate a random code verifier (43-128 characters)
    const array = new Uint8Array(32);
    window.crypto.getRandomValues(array);
    const codeVerifier = base64urlEncode(array);

    console.log('Generated code verifier length:', codeVerifier.length);
    console.log('Code verifier:', codeVerifier);

    // Generate code challenge from verifier using SHA-256
    const encoder = new TextEncoder();
    const data = encoder.encode(codeVerifier);
    const hashBuffer = await window.crypto.subtle.digest('SHA-256', data);
    const codeChallenge = base64urlEncode(hashBuffer);

    console.log('Generated code challenge:', codeChallenge);

    return { codeVerifier, codeChallenge };
  };

  return (
    <div className="min-h-screen bg-gray-100 flex items-center justify-center">
      <div className="bg-white p-8 rounded shadow max-w-md w-full">
        <h1 className="text-2xl font-bold mb-4">Sign in with Epic</h1>
        <button
          onClick={handleLogin}
          disabled={loading}
          className={`w-full ${loading ? 'bg-gray-400' : 'bg-blue-600 hover:bg-blue-700'} text-white font-bold py-4 px-6 rounded-lg`}
        >
          {loading ? 'Connecting...' : 'Sign in'}
        </button>
        {error && <p className="mt-4 text-red-500">{error}</p>}
      </div>
    </div>
  );
}