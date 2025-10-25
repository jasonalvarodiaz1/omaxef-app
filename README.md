# Omaxef EHR - Prior Authorization Assistant

An intelligent Electronic Health Record (EHR) system that preemptively evaluates patient eligibility for prior authorization (PA) of weight-loss medications.

## Features

- **Dynamic PA Criteria Evaluation**: Real-time assessment of patient eligibility against insurance requirements
- **Approval Likelihood Prediction**: Smart algorithm that predicts PA approval probability with confidence scoring
- **Therapy History Tracking**: Complete medication history with dose progression validation
- **Drug Coverage Analysis**: Instant lookup of coverage status, copays, and PA requirements
- **Alternative Drug Suggestions**: Recommends alternatives when approval likelihood is low
- **Patient Management**: Comprehensive patient chart with vitals, labs, medications, and allergies

## Tech Stack

- **Frontend**: React 19 with Hooks and Context API
- **Styling**: Tailwind CSS
- **Testing**: Jest + React Testing Library

## Getting Started

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Installation

```bash
npm install
```

### Available Scripts

#### `npm start`

Runs the app in development mode.\
Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.

#### `npm test`

Launches the test runner in interactive watch mode.

#### `npm run build`

Builds the app for production to the `build` folder.\
Optimizes the build for best performance.

## Project Structure

```
omaxef-app/
├── public/               # Static assets
│   └── omaxef-logo.png  # Brand logo
├── src/
│   ├── components/      # React components
│   │   ├── PatientSidebar.js
│   │   ├── PatientChart.js
│   │   ├── TherapyModal.js
│   │   └── CoverageDisplay.js
│   ├── context/         # React Context providers
│   │   └── PatientContext.js
│   ├── data/            # Sample data and drug configs
│   │   ├── patients.js
│   │   ├── allDrugs.js
│   │   ├── glp1Drugs.js
│   │   └── DrugCoverage.js
│   ├── utils/           # Business logic
│   │   ├── criteriaEvaluator.js
│   │   └── coverageLogic.js
│   └── App.js           # Main application
└── README.md

```

## Key Features Explained

### Criteria Evaluation Engine

The app evaluates multiple PA criteria types:
- **Age**: Validates patient age requirements
- **BMI**: Checks BMI thresholds and comorbidity requirements
- **Dose Progression**: Ensures proper titration sequence
- **Weight Loss**: Tracks initial weight loss percentage
- **Weight Maintenance**: Monitors sustained weight loss over time
- **Documentation**: Verifies clinical notes and supporting documents

### Approval Likelihood Algorithm

Uses structured criteria results to predict PA approval:
- Identifies critical criteria (age, BMI, dose progression)
- Calculates weighted likelihood score
- Provides actionable recommendations
- Suggests alternatives when likelihood is low

## Documentation

- [Weight Tracking Schema](./WEIGHT_TRACKING.md)
- [Therapy History Schema](./THERAPY_HISTORY_SCHEMA.md)

## Testing

Run the test suite:

```bash
npm test
```

The test suite includes:
- **normalizeStatus.test.js**: Tests for canonical status normalization
- **criteriaEvaluator.test.js**: Tests for age and BMI criteria evaluation

Run tests in your browser console:

```javascript
import('./testCriteria.js').then(m => m.runTests())
```

## Status Normalization

The application uses a canonical status enum (`CriteriaStatus`) to ensure consistent status values across all modules:

- `CriteriaStatus.MET`: Criteria is met (previously: 'pass', 'yes', 'approved')
- `CriteriaStatus.NOT_MET`: Criteria is not met (previously: 'fail', 'no', 'denied')
- `CriteriaStatus.NOT_APPLICABLE`: Criteria does not apply (previously: 'n/a', 'not_applicable')
- `CriteriaStatus.WARNING`: Criteria met with warnings (previously: 'warning', 'warn')

The `normalizeStatus()` function handles legacy status values and converts them to the canonical format.

## Local Development - Token Exchange Shim

For local development and testing with EPIC FHIR integration, a token-exchange shim is available at `server/tokenExchange.js`.

**⚠️ IMPORTANT: This is for LOCAL DEVELOPMENT ONLY - do not use in production!**

### Setup

1. Set environment variables (never commit these to the repository):
   ```bash
   export EPIC_TOKEN_ENDPOINT="https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token"
   export EPIC_CLIENT_ID="your-client-id"
   export EPIC_CLIENT_SECRET="your-client-secret"  # Optional
   ```

2. Start the token exchange server:
   ```bash
   node server/tokenExchange.js
   ```

3. The server will run on port 3001 (or PORT environment variable)

### Usage

POST to `/exchange` with the authorization code:
```bash
curl -X POST http://localhost:3001/exchange \
  -d "code=AUTH_CODE" \
  -d "redirect_uri=http://localhost:3000/callback" \
  -d "code_verifier=VERIFIER"
```

**Security Notes:**
- Never commit secrets or tokens to the repository
- Use environment variables for all sensitive configuration
- This shim is intended for local testing only
- Production deployments should use proper OAuth2 backend services

## License

Proprietary - Omaxef

## Contributing

This is a private project. For questions or contributions, contact the development team.
