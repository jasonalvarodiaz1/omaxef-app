import React from 'react';

const AuthHandler = ({ onAuthSuccess, authError }) => {
  const handleLogin = () => {
    // Simulate Epic OAuth login
    console.log('Initiating Epic OAuth...');
    // In production, this would redirect to Epic's authorization endpoint
    alert('Epic OAuth integration not yet configured. Use Dev Mode for testing.');
  };

  return (
    <div className="auth-handler">
      <div className="auth-container">
        <h2>Prior Authorization Assistant</h2>
        <p>Connect to your EHR to get started</p>

        {authError && (
          <div className="auth-error">
            <strong>Error:</strong> {authError}
          </div>
        )}

        <button 
          className="login-button epic"
          onClick={handleLogin}
        >
          Login with Epic
        </button>

        <div className="auth-info">
          <p>This application requires EHR authentication</p>
        </div>
      </div>
    </div>
  );
};

export default AuthHandler;
