#!/bin/bash

# Production security dependencies installation script
# Run this after copying the new security files

echo "🔒 Installing production security dependencies..."

# Install Node.js dependencies
npm install --save express-rate-limit@^7.4.1
npm install --save helmet@^8.0.0
npm install --save winston@^3.17.0
npm install --save @azure/keyvault-secrets@^4.9.0
npm install --save @azure/identity@^4.6.0

# Development dependencies
npm install --save-dev @types/express-rate-limit@^6.0.0

echo "✅ Dependencies installed"
echo ""
echo "📋 Next steps:"
echo "1. Copy .env.example to .env and configure your values"
echo "2. Generate TOKEN_EXCHANGE_API_KEY: openssl rand -hex 32"
echo "3. Review SECURITY_CHECKLIST.md"
echo "4. Run: npm start (development mode)"
echo ""
echo "⚠️  IMPORTANT: Do NOT deploy to production until all CRITICAL BLOCKERS are complete!"