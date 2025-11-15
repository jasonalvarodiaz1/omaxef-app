// Express backend to proxy CoverMyMeds Coverage API
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json());

// Use port 4000 for backend (React app uses 3001)
const PORT = process.env.BACKEND_PORT || 4000;

// Replace with your CoverMyMeds API credentials
const CMM_API_URL = 'https://api.covermymeds.com/formulary/v2/coverage';
const CMM_API_KEY = process.env.CMM_API_KEY; // Store your API key in .env

// Example endpoint: /api/coverage?insurance=Medicare&drugName=Ozempic
app.get('/api/coverage', async (req, res) => {
  const { insurance, drugName } = req.query;
  if (!insurance || !drugName) {
    return res.status(400).json({ error: 'Missing insurance or drugName' });
  }

  try {
    // You may need to map drugName to RxNorm or NDC code for CoverMyMeds
    // Example request body for CoverMyMeds API
    const response = await axios.get(CMM_API_URL, {
      headers: {
        'Authorization': `Bearer ${CMM_API_KEY}`,
        'Accept': 'application/json'
      },
      params: {
        insurance_plan: insurance,
        drug_name: drugName
        // Add other required params (patient info, prescriber, etc.)
      }
    });
    res.json(response.data);
  } catch (error) {
    console.error('CMM API error:', error.response?.data || error.message);
    res.status(500).json({ error: 'Failed to fetch coverage info' });
  }
});

// Epic token exchange endpoint for embedded mode
app.post('/api/epic/token-exchange', async (req, res) => {
  const { launch, iss, codeVerifier } = req.body;
  
  if (!launch || !iss) {
    return res.status(400).json({ error: 'Missing launch token or issuer' });
  }
  
  console.log('🔄 Token exchange request for issuer:', iss);
  
  try {
    // For embedded apps, Epic may provide the token in the launch JWT itself
    // Or we need to exchange it using client credentials
    const tokenUrl = `${iss}/oauth2/token`;
    
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      code: launch, // Try using launch as the code
      redirect_uri: process.env.REACT_APP_REDIRECT_URI || 'https://localhost:3001/callback'
    });
    
    // Add code_verifier if provided (PKCE)
    if (codeVerifier) {
      params.append('code_verifier', codeVerifier);
    }
    
    // Prepare headers
    const headers = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json'
    };
    
    // Add Basic Auth header if client_secret is available (Epic's preferred method)
    const clientId = process.env.REACT_APP_EPIC_CLIENT_ID;
    const clientSecret = process.env.REACT_APP_EPIC_CLIENT_SECRET;
    
    if (clientSecret) {
      // Epic requires: Authorization: Basic base64(client_id:client_secret)
      const credentials = `${clientId}:${clientSecret}`;
      const base64Credentials = Buffer.from(credentials).toString('base64');
      headers['Authorization'] = `Basic ${base64Credentials}`;
      console.log('✅ Using client secret authentication (Basic Auth)');
    } else {
      // Public client - include client_id in params
      params.append('client_id', clientId);
      console.log('⚠️ No client secret - using public client mode');
    }
    
    console.log('📤 Sending token exchange request...');
    const response = await axios.post(tokenUrl, params, { headers });
    
    console.log('✅ Token exchange successful');
    res.json({
      access_token: response.data.access_token,
      patient: response.data.patient,
      expires_in: response.data.expires_in,
      scope: response.data.scope
    });
    
  } catch (error) {
    console.error('❌ Token exchange failed:', error.response?.data || error.message);
    
    // Provide helpful error message
    const errorDetails = error.response?.data || error.message;
    console.error('Error details:', JSON.stringify(errorDetails, null, 2));
    
    res.status(500).json({ 
      error: 'Token exchange failed',
      details: errorDetails,
      hint: 'You may need to add REACT_APP_EPIC_CLIENT_SECRET to your .env file if this is a confidential client'
    });
  }
});

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
