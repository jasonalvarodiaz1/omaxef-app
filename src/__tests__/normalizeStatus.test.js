import { normalizeStatus, CriteriaStatus } from '../constants';

describe('normalizeStatus', () => {
  test('normalizes "pass" to CriteriaStatus.MET', () => {
    expect(normalizeStatus('pass')).toBe(CriteriaStatus.MET);
  });

  test('normalizes "yes" to CriteriaStatus.MET', () => {
    expect(normalizeStatus('yes')).toBe(CriteriaStatus.MET);
  });

  test('normalizes "met" to CriteriaStatus.MET', () => {
    expect(normalizeStatus('met')).toBe(CriteriaStatus.MET);
  });

  test('normalizes "approved" to CriteriaStatus.MET', () => {
    expect(normalizeStatus('approved')).toBe(CriteriaStatus.MET);
  });

  test('normalizes "fail" to CriteriaStatus.NOT_MET', () => {
    expect(normalizeStatus('fail')).toBe(CriteriaStatus.NOT_MET);
  });

  test('normalizes "no" to CriteriaStatus.NOT_MET', () => {
    expect(normalizeStatus('no')).toBe(CriteriaStatus.NOT_MET);
  });

  test('normalizes "not_met" to CriteriaStatus.NOT_MET', () => {
    expect(normalizeStatus('not_met')).toBe(CriteriaStatus.NOT_MET);
  });

  test('normalizes "denied" to CriteriaStatus.NOT_MET', () => {
    expect(normalizeStatus('denied')).toBe(CriteriaStatus.NOT_MET);
  });

  test('normalizes "not_applicable" to CriteriaStatus.NOT_APPLICABLE', () => {
    expect(normalizeStatus('not_applicable')).toBe(CriteriaStatus.NOT_APPLICABLE);
  });

  test('normalizes "n/a" to CriteriaStatus.NOT_APPLICABLE', () => {
    expect(normalizeStatus('n/a')).toBe(CriteriaStatus.NOT_APPLICABLE);
  });

  test('normalizes "na" to CriteriaStatus.NOT_APPLICABLE', () => {
    expect(normalizeStatus('na')).toBe(CriteriaStatus.NOT_APPLICABLE);
  });

  test('normalizes "warning" to CriteriaStatus.WARNING', () => {
    expect(normalizeStatus('warning')).toBe(CriteriaStatus.WARNING);
  });

  test('normalizes "warn" to CriteriaStatus.WARNING', () => {
    expect(normalizeStatus('warn')).toBe(CriteriaStatus.WARNING);
  });

  test('handles case-insensitive input', () => {
    expect(normalizeStatus('PASS')).toBe(CriteriaStatus.MET);
    expect(normalizeStatus('Yes')).toBe(CriteriaStatus.MET);
    expect(normalizeStatus('FAIL')).toBe(CriteriaStatus.NOT_MET);
    expect(normalizeStatus('No')).toBe(CriteriaStatus.NOT_MET);
  });

  test('handles whitespace', () => {
    expect(normalizeStatus(' pass ')).toBe(CriteriaStatus.MET);
    expect(normalizeStatus(' fail ')).toBe(CriteriaStatus.NOT_MET);
  });

  test('returns NOT_MET for unknown status', () => {
    expect(normalizeStatus('unknown')).toBe(CriteriaStatus.NOT_MET);
    expect(normalizeStatus('invalid')).toBe(CriteriaStatus.NOT_MET);
  });

  test('returns NOT_MET for null/undefined', () => {
    expect(normalizeStatus(null)).toBe(CriteriaStatus.NOT_MET);
    expect(normalizeStatus(undefined)).toBe(CriteriaStatus.NOT_MET);
  });
});
