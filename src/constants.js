// Canonical status enum and normalizers for criteria results
// Add this file and import from other modules (coverageEvaluator, criteriaEvaluator, coverageLogic, tests, etc.)

export const CriteriaStatus = {
  MET: 'met',
  NOT_MET: 'not_met',
  WARNING: 'warning',
  NOT_APPLICABLE: 'not_applicable',
};

// Map many legacy/alternate strings to canonical statuses.
// Extend this map if you encounter other synonyms in the codebase.
export const STATUS_MAP = {
  pass: CriteriaStatus.MET,
  fail: CriteriaStatus.NOT_MET,
  met: CriteriaStatus.MET,
  not_met: CriteriaStatus.NOT_MET,
  warning: CriteriaStatus.WARNING,
  'not_applicable': CriteriaStatus.NOT_APPLICABLE,
  yes: CriteriaStatus.MET,
  no: CriteriaStatus.NOT_MET,
  na: CriteriaStatus.NOT_APPLICABLE,
  n_a: CriteriaStatus.NOT_APPLICABLE,
};

/**
 * Normalize a single status string into the canonical CriteriaStatus value.
 * Returns null for falsy inputs.
 */
export function normalizeStatus(s) {
  if (s === undefined || s === null) return null;
  const key = String(s).trim().toLowerCase();
  return STATUS_MAP[key] || String(s);
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