// Canonical status enum and normalizers for criteria results
// Add this file and import from other modules (coverageEvaluator, criteriaEvaluator, coverageLogic, tests, etc.)

export const CriteriaStatus = {
  MET: 'MET',
  NOT_MET: 'NOT_MET',
  NOT_APPLICABLE: 'NOT_APPLICABLE',
  WARNING: 'WARNING'
};

/**
 * Normalize a status-like value into one of the CriteriaStatus values.
 * Accepts strings (case-insensitive, trimmed) and gracefully handles null/undefined.
 */
export function normalizeStatus(input) {
  if (input === null || input === undefined) return CriteriaStatus.NOT_MET;

  const s = String(input).trim().toLowerCase();

  const MET = new Set(['pass', 'yes', 'met', 'approved', 'true']);
  const NOT_MET = new Set(['fail', 'no', 'not_met', 'denied', 'false']);
  const NOT_APPLICABLE = new Set(['not_applicable', 'n/a', 'na']);
  const WARNING = new Set(['warning', 'warn']);

  if (MET.has(s)) return CriteriaStatus.MET;
  if (NOT_MET.has(s)) return CriteriaStatus.NOT_MET;
  if (NOT_APPLICABLE.has(s)) return CriteriaStatus.NOT_APPLICABLE;
  if (WARNING.has(s)) return CriteriaStatus.WARNING;

  // default for unknown/invalid values per tests
  return CriteriaStatus.NOT_MET;
}

/**
 * Normalize a criteria result object in-place (returns new object).
 * If the object has a `status` property, this will be normalized.
 */
export function normalizeResult(result) {
  if (!result || typeof result !== 'object') return result;
  return {
    ...result,
    status: normalizeStatus(result.status),
  };
}

/**
 * Normalize an array of result objects (returns new array)
 */
export function normalizeResults(results = []) {
  return results.map(normalizeResult);
}