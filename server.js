// Express backend to proxy CoverMyMeds Coverage API
const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(cors());

const PORT = process.env.PORT || 4000;

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

app.listen(PORT, () => {
  console.log(`Backend server running on port ${PORT}`);
});
