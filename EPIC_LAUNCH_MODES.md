# Epic Launch Modes Testing Guide

## Overview
This guide explains how to test both **Embedded** and **External Browser** launch modes with your Epic integration.

---

## 🔐 Prerequisites

### For Both Modes:
- ✅ Epic Client ID: `e12f6559-dcee-4201-881e-90fc41978ef3`
- ✅ HTTPS enabled with mkcert certificates
- ✅ WSL port forwarding configured
- ✅ Backend server running on port 4000
- ✅ Frontend app running on port 3001

### For Embedded Mode Only:
- ⏳ Epic Client Secret (waiting to receive)

---

## 🎯 Launch Mode 1: External Browser (Works Now!)

### What It Is
- User clicks "Login with Epic" from your app
- Redirects to Epic's authorization page in a new browser window/tab
- Epic redirects back to your callback URL with auth code
- Your app exchanges code for access token

### Configuration

**1. Epic App Registration Settings:**
```
Launch Type: External Browser
Redirect URI: https://localhost:3001/callback
Client Type: Can be Public (no secret required) or Confidential
```

**2. Environment Variables (Already Set):**
```bash
# .env.development
REACT_APP_EPIC_CLIENT_ID=e12f6559-dcee-4201-881e-90fc41978ef3
REACT_APP_REDIRECT_URI=http://localhost:3001/callback
REACT_APP_EPIC_AUTH_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize
REACT_APP_EPIC_TOKEN_URL=https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token
REACT_APP_EPIC_SCOPE=launch launch/patient patient/Patient.read patient/Condition.read patient/Observation.read patient/MedicationRequest.read patient/Coverage.read openid fhirUser

# Optional - only if using confidential client
REACT_APP_EPIC_CLIENT_SECRET=your_secret_here
```

**3. Testing Steps:**

```bash
# 1. Start backend server
cd /home/jasonalvarodiaz/projects/omaxef/omaxef-app
node server.js &

# 2. Start frontend (in another terminal)
npm start

# 3. Navigate to your app
# https://localhost:3001

# 4. Click "Login with Epic" or trigger OAuth flow
# You'll be redirected to Epic's login page

# 5. After login, you'll be redirected back to:
# https://localhost:3001/callback?code=AUTH_CODE&state=STATE

# 6. Your app exchanges the code for an access token
# Backend handles this at: POST /api/epic/token-exchange
```

**4. Expected Flow:**
```
User → Your App → Epic Login Page → Epic Redirects Back → Token Exchange → Patient Data
```

**5. Debugging:**
```bash
# Check backend logs
tail -f server.log

# Check for token exchange requests
curl -X POST http://localhost:4000/api/epic/token-exchange \
  -H "Content-Type: application/json" \
  -d '{"launch":"test_code","iss":"https://fhir.epic.com/interconnect-fhir-oauth"}'
```

---

## 🖼️ Launch Mode 2: Embedded (Requires Client Secret)

### What It Is
- Your app loads inside Epic Hyperspace as an iframe
- Epic automatically provides a launch token in the URL
- Your app decodes the launch token to get patient context
- Backend exchanges launch token for access token using client secret

### Configuration

**1. Epic App Registration Settings:**
```
Launch Type: Embedded (Provider-Facing or Patient-Facing)
Application: Hyperspace 2023 or higher
Launch URL: https://localhost:3001?launch={LAUNCH_TOKEN}&iss={ISS}
```

**2. Environment Variables Required:**
```bash
# .env.development - ADD THIS LINE
REACT_APP_EPIC_CLIENT_SECRET=your_secret_from_epic

# .env.production - ADD THIS LINE
REACT_APP_EPIC_CLIENT_SECRET=your_secret_from_epic
```

**3. Backend Setup (Already Configured):**
Your `server.js` already handles embedded mode at lines 46-100:
- ✅ Accepts launch token and issuer
- ✅ Uses Basic Auth with client secret
- ✅ Falls back to public client if no secret
- ✅ Returns access token and patient ID

**4. Testing Steps:**

```bash
# 1. Add client secret to .env.development
echo "REACT_APP_EPIC_CLIENT_SECRET=your_secret_here" >> .env.development

# 2. Restart backend to load new secret
pkill -f "node server.js"
node server.js &

# 3. Test embedded launch simulation
# Your app should handle URLs like:
# https://localhost:3001?launch=eyJhbGc...&iss=https://fhir.epic.com/interconnect-fhir-oauth

# 4. Test from Epic Hyperspace
# Configure your app in Epic's App Orchard
# Launch from within Epic's interface
```

**5. Expected Flow:**
```
Epic Hyperspace → Loads Your App in iframe → 
Launch Token Decoded → Backend Token Exchange → 
Access Token Retrieved → Patient Data Loaded
```

**6. Launch Token Decoder (Already Implemented):**
```javascript
// src/utils/launchTokenDecoder.js already handles:
- JWT decoding
- Patient ID extraction
- Launch context parsing
```

**7. Debugging Embedded Mode:**
```bash
# Check if launch parameters are received
# In browser console:
const params = new URLSearchParams(window.location.search);
console.log('Launch:', params.get('launch'));
console.log('ISS:', params.get('iss'));

# Test token exchange endpoint
curl -X POST http://localhost:4000/api/epic/token-exchange \
  -H "Content-Type: application/json" \
  -d '{
    "launch": "YOUR_LAUNCH_TOKEN",
    "iss": "https://fhir.epic.com/interconnect-fhir-oauth"
  }'
```

---

## 🔄 Quick Switch Between Modes

### Switch to External Browser (No Secret Needed):
1. Update Epic app registration to "External Browser"
2. Test immediately - no code changes needed

### Switch to Embedded (When Secret Arrives):
```bash
# 1. Add secret to .env
echo "REACT_APP_EPIC_CLIENT_SECRET=your_secret" >> .env.development

# 2. Restart backend
pkill -f "node server.js" && node server.js &

# 3. Update Epic app registration to "Embedded"
# 4. Test from Epic Hyperspace
```

---

## 🚀 Quick Test Commands

### Test External Browser Mode Now:
```bash
# Start services
npm start &
node server.js &

# Open browser to
https://localhost:3001

# Click "Login with Epic" button
# Follow OAuth flow
```

### Test Embedded Mode (After Secret):
```bash
# 1. Add secret
nano .env.development
# Add: REACT_APP_EPIC_CLIENT_SECRET=your_secret

# 2. Restart
pkill -f "node server.js" && node server.js &

# 3. Test launch URL
# https://localhost:3001?launch=TOKEN&iss=ISS_URL
```

---

## 🐛 Troubleshooting

### Issue: "No client secret - using public client mode"
**Solution:** Add `REACT_APP_EPIC_CLIENT_SECRET` to `.env.development`

### Issue: "Token exchange failed"
**Check:**
- Backend is running on port 4000
- Client ID is correct
- Redirect URI matches Epic registration
- Client secret is correct (for embedded mode)

### Issue: "CORS error"
**Solution:** Already configured in `server.js` line 7: `app.use(cors())`

### Issue: "Launch token not found"
**Check:**
- URL contains `?launch=...&iss=...`
- Launch token decoder is working: `src/utils/launchTokenDecoder.js`

### Issue: "Invalid redirect URI"
**Solution:** Ensure Epic registration matches:
- Development: `http://localhost:3001/callback` or `https://localhost:3001/callback`
- Production: `https://www.omaxef.com/callback`

---

## 📊 Feature Comparison

| Feature | External Browser | Embedded |
|---------|-----------------|----------|
| **Client Secret** | Optional | **Required** |
| **User Experience** | Redirect to Epic | Seamless iframe |
| **Setup Complexity** | Simple | Moderate |
| **Testing** | ✅ Can test now | ⏳ Need secret |
| **Production Ready** | ✅ Yes | ⏳ After secret |
| **Patient Context** | Manual selection | Automatic |
| **Launch from** | Your app | Epic Hyperspace |

---

## ✅ Current Status

**Ready to Test:**
- ✅ External Browser mode (no secret needed)
- ✅ Backend token exchange endpoint
- ✅ HTTPS certificates configured
- ✅ Launch token decoder ready

**Waiting On:**
- ⏳ Epic Client Secret for Embedded mode
- ⏳ Epic App Orchard registration approval

**Next Actions:**
1. **Test External Browser mode now** (works without secret)
2. Add client secret when received
3. Test Embedded mode from Epic Hyperspace
4. Deploy to production

---

## 📝 Production Deployment Checklist

### Before Going Live:
- [ ] Add client secret to `.env.production`
- [ ] Update production redirect URI in Epic registration
- [ ] Test both launch modes in Epic sandbox
- [ ] Verify HTTPS certificates for production domain
- [ ] Update `REACT_APP_REDIRECT_URI` to production URL
- [ ] Test token exchange with production credentials
- [ ] Enable Epic app in App Orchard
- [ ] Complete Epic security review

### Environment Variables for Production:
```bash
# .env.production
REACT_APP_EPIC_CLIENT_ID=your_production_client_id
REACT_APP_EPIC_CLIENT_SECRET=your_production_client_secret
REACT_APP_REDIRECT_URI=https://www.omaxef.com/callback
REACT_APP_EPIC_FHIR_BASE=https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4
REACT_APP_TOKEN_EXCHANGE_URL=https://api.omaxef.com/token-exchange
```

---

## 🔗 Resources

- **Epic Developer Documentation:** https://fhir.epic.com/Documentation
- **OAuth 2.0 Spec:** https://oauth.net/2/
- **SMART on FHIR:** http://docs.smarthealthit.org/
- **Your Backend Code:** `server.js` lines 46-100
- **Launch Token Decoder:** `src/utils/launchTokenDecoder.js`
- **Epic Auth Utilities:** `src/utils/epicAuth.js`

---

## 💡 Recommendations

1. **Start with External Browser mode** - Test your OAuth flow without needing the client secret
2. **Monitor backend logs** - Watch for token exchange requests and errors
3. **Use Epic's sandbox** - Test thoroughly before production
4. **Keep secrets secure** - Never commit `.env` files to git
5. **Test both modes** - Ensure your app works in both scenarios

---

**Last Updated:** November 10, 2025
**Status:** Ready for External Browser testing | Waiting on client secret for Embedded mode
