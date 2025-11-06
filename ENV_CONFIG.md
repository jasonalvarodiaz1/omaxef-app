# Environment Configuration Guide

## RxNorm Integration Settings

The application now supports optional RxNorm API integration for enhanced drug information.

### Environment Variables

#### `REACT_APP_USE_RXNORM`
- **Type:** Boolean (true/false)
- **Default:** false
- **Description:** Enables RxNorm API integration for drug lookups
- **Recommendation:** Start with `false` and enable after thorough testing

#### `REACT_APP_RXNORM_CACHE_DURATION`
- **Type:** Number (milliseconds)
- **Development:** 3600000 (1 hour)
- **Production:** 7200000 (2 hours)
- **Description:** How long to cache RxNorm API responses
- **Purpose:** Reduces API calls and improves performance

#### `REACT_APP_FALLBACK_TO_LOCAL`
- **Type:** Boolean (true/false)
- **Default:** true
- **Description:** Fall back to local drug data if RxNorm API fails
- **Recommendation:** Keep `true` for reliability

## Setup Instructions

### Development
```bash
cp .env.template .env.development
# Edit .env.development with your development settings
```

### Production
```bash
cp .env.template .env.production
# Edit .env.production with your production settings
# Set REACT_APP_USE_RXNORM=false initially
# Update URLs to production endpoints
```

### Local Testing
```bash
cp .env.template .env
# Edit .env with your local settings
```

## Configuration Values by Environment

| Variable | Development | Production |
|----------|------------|------------|
| `REACT_APP_USE_RXNORM` | false | false (until tested) |
| `REACT_APP_RXNORM_CACHE_DURATION` | 3600000 | 7200000 |
| `REACT_APP_FALLBACK_TO_LOCAL` | true | true |

## Testing RxNorm Integration

1. **Start with disabled:** Keep `REACT_APP_USE_RXNORM=false` initially
2. **Enable UI toggle:** Use the "RxNorm Enhanced Mode (Beta)" checkbox in the UI
3. **Test with real data:** Verify drug lookups work correctly
4. **Monitor errors:** Check console for API failures
5. **Verify fallback:** Ensure local data works when API fails
6. **Enable by default:** After testing, set `REACT_APP_USE_RXNORM=true`

## Security Notes

- Never commit actual API keys or credentials
- Use `.env.template` as a reference
- Keep `.env`, `.env.development`, and `.env.production` in `.gitignore`
- Rotate credentials regularly
- Use different credentials for dev/staging/prod environments
