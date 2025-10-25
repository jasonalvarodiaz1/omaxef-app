// Canonical status constants for criteria evaluation
export const CriteriaStatus = {
  MET: 'met',
  NOT_MET: 'not_met',
  NOT_APPLICABLE: 'not_applicable',
  WARNING: 'warning'
};

/**
 * Normalize various status representations to canonical CriteriaStatus values
 * Handles legacy statuses like 'pass', 'yes', 'fail', 'no', etc.
 */
export function normalizeStatus(status) {
  if (!status) return CriteriaStatus.NOT_MET;
  
  const normalized = String(status).toLowerCase().trim();
  
  // Map various representations to canonical statuses
  switch (normalized) {
    case 'met':
    case 'pass':
    case 'yes':
    case 'approved':
    case 'true':
      return CriteriaStatus.MET;
    
    case 'not_met':
    case 'fail':
    case 'no':
    case 'denied':
    case 'false':
      return CriteriaStatus.NOT_MET;
    
    case 'not_applicable':
    case 'n/a':
    case 'na':
    case 'not applicable':
      return CriteriaStatus.NOT_APPLICABLE;
    
    case 'warning':
    case 'warn':
    case 'caution':
      return CriteriaStatus.WARNING;
    
    default:
      // If already a canonical status, return it
      if (Object.values(CriteriaStatus).includes(normalized)) {
        return normalized;
      }
      // Unknown status defaults to NOT_MET
      return CriteriaStatus.NOT_MET;
  }
}
