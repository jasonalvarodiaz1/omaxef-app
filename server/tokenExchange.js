// Local development token-exchange shim
// DO NOT USE IN PRODUCTION - reads secrets from environment variables
// This is a minimal Express app for local dev to exchange authorization codes for tokens

const express = require('express');
const axios = require('axios');

const app = express();

// Middleware to parse URL-encoded bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * POST /exchange
 * Exchange authorization code for access token
 * Reads configuration from environment variables:
 * - EPIC_TOKEN_ENDPOINT: The token endpoint URL
 * - EPIC_CLIENT_ID: The client ID
 * - EPIC_CLIENT_SECRET: (optional) The client secret
 */
app.post('/exchange', async (req, res) => {
  const { code, redirect_uri, code_verifier } = req.body;

  // Read from environment variables - NEVER hardcode secrets
  const tokenEndpoint = process.env.EPIC_TOKEN_ENDPOINT;
  const clientId = process.env.EPIC_CLIENT_ID;
  const clientSecret = process.env.EPIC_CLIENT_SECRET; // Optional

  if (!tokenEndpoint) {
    return res.status(500).json({ 
      error: 'server_error', 
      error_description: 'EPIC_TOKEN_ENDPOINT not configured' 
    });
  }

  if (!clientId) {
    return res.status(500).json({ 
      error: 'server_error', 
      error_description: 'EPIC_CLIENT_ID not configured' 
    });
  }

  if (!code) {
    return res.status(400).json({ 
      error: 'invalid_request', 
      error_description: 'Missing code parameter' 
    });
  }

  // Build token request
  const tokenRequest = {
    grant_type: 'authorization_code',
    code,
    redirect_uri,
    client_id: clientId,
    code_verifier
  };

  // Add client_secret if provided
  if (clientSecret) {
    tokenRequest.client_secret = clientSecret;
  }

  try {
    // Exchange code for token
    const response = await axios.post(tokenEndpoint, 
      new URLSearchParams(tokenRequest).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        }
      }
    );

    // Return token response
    res.json(response.data);
  } catch (error) {
    console.error('Token exchange error:', error.response?.data || error.message);
    
    // Forward error from token endpoint
    if (error.response) {
      res.status(error.response.status).json(error.response.data);
    } else {
      res.status(500).json({ 
        error: 'server_error', 
        error_description: error.message 
      });
    }
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'token-exchange-shim' });
});

module.exports = app;

// If running directly (not imported as module)
if (require.main === module) {
  const PORT = process.env.PORT || 3001;
  app.listen(PORT, () => {
    console.log(`Token exchange shim listening on port ${PORT}`);
    console.log('Environment check:');
    console.log(`  EPIC_TOKEN_ENDPOINT: ${process.env.EPIC_TOKEN_ENDPOINT ? 'SET' : 'NOT SET'}`);
    console.log(`  EPIC_CLIENT_ID: ${process.env.EPIC_CLIENT_ID ? 'SET' : 'NOT SET'}`);
    console.log(`  EPIC_CLIENT_SECRET: ${process.env.EPIC_CLIENT_SECRET ? 'SET' : 'NOT SET'}`);
  });
}
