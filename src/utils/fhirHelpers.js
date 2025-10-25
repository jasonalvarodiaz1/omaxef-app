// Safe helpers to read FHIR resources (Observation/CodeableConcept)
// Use these instead of accessing .code/.value directly to avoid runtime errors
export function getCodings(resource) {
  return resource?.code?.coding || [];
}

/**
 * Returns true if resource contains the given code.
 * code may be a simple code like '39156-5' or a system|code like 'http://loinc.org|39156-5'
 */
export function codeMatches(resource, code) {
  if (!resource || !code) return false;
  const codings = getCodings(resource);
  const [maybeSystem, maybeCode] = code.includes('|') ? code.split('|') : [null, code];
  return codings.some(c => {
    if (maybeSystem) {
      return (c.system === maybeSystem && c.code === maybeCode);
    }
    // match by code or by full "system|code" string
    return c.code === maybeCode || `${c.system}|${c.code}` === code;
  });
}

/**
 * Returns numeric value from Observation (valueQuantity.value or value)
 */
export function getObservationNumericValue(obs) {
  if (!obs) return null;
  if (obs.valueQuantity && typeof obs.valueQuantity.value !== 'undefined') {
    return Number(obs.valueQuantity.value);
  }
  if (typeof obs.value === 'number') return obs.value;
  if (obs.valueString && !Number.isNaN(Number(obs.valueString))) return Number(obs.valueString);
  return null;
}

/**
 * Find latest observation with matching code from an array of obs
 */
export function findLatestObservationByCode(obsArray = [], code) {
  if (!Array.isArray(obsArray) || obsArray.length === 0) return null;
  const matches = obsArray.filter(o => codeMatches(o, code));
  if (matches.length === 0) return null;
  matches.sort((a, b) => {
    const ta = Date.parse(a.effectiveDateTime || a.meta?.lastUpdated || 0) || 0;
    const tb = Date.parse(b.effectiveDateTime || b.meta?.lastUpdated || 0) || 0;
    return tb - ta;
  });
  return matches[0];
}
