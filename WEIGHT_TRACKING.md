# Weight Loss vs Weight Maintenance Criteria

## Overview
The system distinguishes between two different weight-related PA criteria:

### 1. Weight Loss Achievement (`weightLoss`)
**Purpose**: Verify patient achieved initial weight loss goal  
**Use Case**: Prove therapy effectiveness for dose escalation or renewal

**Data Field**: `clinicalNotes.initialWeightLossPercentage`
- Tracks **peak weight loss** achieved during therapy
- Example: Patient lost 6kg (5.8%) at their best point

**Evaluation Logic**:
```javascript
function evaluateWeightLoss(patient, criterion, doseInfo) {
  const percentage = patient.clinicalNotes?.initialWeightLossPercentage || 0;
  const required = criterion.minPercentage || 5;
  const met = percentage >= required;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'weightLoss',
    reason: met
      ? `Patient achieved ${percentage}% weight loss from baseline`
      : `Patient only achieved ${percentage}% weight loss (requires ${required}%)`
  };
}
```

### 2. Weight Maintenance (`weightMaintained`)
**Purpose**: Verify patient sustained weight loss over time  
**Use Case**: Prove continued therapy benefit for ongoing authorization

**Data Fields**:
- `clinicalNotes.currentWeightLossPercentage`: Current sustained weight loss
- `clinicalNotes.weightMaintenanceMonths`: Duration maintaining current weight

**Evaluation Logic**:
```javascript
function evaluateWeightMaintained(patient, criterion, doseInfo) {
  const currentPercentage = patient.clinicalNotes?.currentWeightLossPercentage || 0;
  const maintenanceDuration = patient.clinicalNotes?.weightMaintenanceMonths || 0;
  const required = criterion.minPercentage || 5;
  const requiredDuration = criterion.minMonths || 3;
  
  const met = currentPercentage >= required && maintenanceDuration >= requiredDuration;
  
  return {
    status: met ? 'met' : 'not_met',
    criterionType: 'weightMaintained',
    reason: met
      ? `Patient has maintained ${currentPercentage}% weight loss for ${maintenanceDuration} months`
      : `Patient weight loss is ${currentPercentage}% for ${maintenanceDuration} months (requires ${required}% for ${requiredDuration}+ months)`
  };
}
```

## Real-World Example

**Sarah Johnson's Weight Journey:**

| Date | Event | Weight | Weight Loss |
|------|-------|--------|-------------|
| Apr 1, 2024 | Started Wegovy 0.25mg | 103 kg | 0% (baseline) |
| Jul 1, 2024 | Best result achieved | 97 kg | **5.8%** (peak) |
| Aug 1, 2024 | Reached maintenance dose | 98 kg | 4.9% |
| Oct 1, 2024 | Current visit | 98 kg | **4.9%** (sustained) |

**Data Model:**
```javascript
clinicalNotes: {
  baselineWeight: { value: 103, units: "kg", date: "2024-04-01" },
  currentWeight: { value: 98, units: "kg", date: "2024-10-01" },
  initialWeightLossPercentage: 5.8,  // Peak achievement
  currentWeightLossPercentage: 4.9,   // Currently sustained
  weightMaintenanceMonths: 2          // Stable for 2 months
}
```

**PA Criteria Evaluation:**
- ✅ **Weight Loss**: Met (5.8% > 5% requirement)
- ❌ **Weight Maintained**: Not Met (4.9% sustained for only 2 months, requires 3+ months)

## Clinical Rationale

### Why Track Both?

1. **Initial Achievement** proves therapy works
   - Justifies dose escalation
   - Documents clinical response
   - Required for step therapy completion

2. **Sustained Maintenance** proves ongoing benefit
   - Justifies continued therapy
   - Demonstrates adherence
   - Required for PA renewals

### Common Payer Requirements

**Commercial Insurance** (Aetna, BCBS):
- Initial PA: 5% weight loss achievement
- Renewal: 5% weight maintained for 3+ months

**Medicare Part D**:
- Not typically covered for weight loss alone
- May require diabetes diagnosis + A1C improvement

**Medicaid** (varies by state):
- Often requires both achievement AND maintenance
- May require documented weight management program

## Implementation Notes

### Backward Compatibility
The system maintains `weightLossPercentage` for compatibility:
```javascript
// New code checks both fields
const percentage = patient.clinicalNotes?.initialWeightLossPercentage || 
                   patient.clinicalNotes?.weightLossPercentage || 0;
```

### Future Enhancements

1. **Weight Trajectory Tracking**
   ```javascript
   weightHistory: [
     { date: "2024-04-01", weight: 103, percentage: 0 },
     { date: "2024-05-01", weight: 101, percentage: 1.9 },
     { date: "2024-06-01", weight: 99, percentage: 3.9 },
     { date: "2024-07-01", weight: 97, percentage: 5.8 },  // Peak
     { date: "2024-08-01", weight: 98, percentage: 4.9 },
     { date: "2024-10-01", weight: 98, percentage: 4.9 }   // Stable
   ]
   ```

2. **Automatic Maintenance Detection**
   - Calculate maintenance duration from weight history
   - Alert when weight regain occurs (>2% increase)
   - Flag patients at risk of losing PA eligibility

3. **Visual Weight Charts**
   - Graph weight loss trajectory
   - Highlight maintenance periods
   - Show PA requirement thresholds

## Testing Scenarios

### Scenario 1: Initial Success
- Patient achieves 6% weight loss
- ✅ Qualifies for dose escalation
- ✅ Meets initial PA criteria

### Scenario 2: Maintenance Challenge
- Patient achieved 6% initially
- Currently at 4.5% (regained some weight)
- ✅ Still qualifies if within maintenance window
- ⚠️ May need intervention to prevent further regain

### Scenario 3: Sustained Success
- Patient achieved 7% weight loss
- Maintained 6.5% for 6 months
- ✅ Excellent candidate for PA renewal
- ✅ Strong evidence of therapy benefit

### Scenario 4: Weight Regain
- Patient achieved 5% initially
- Currently at 1% (significant regain)
- ❌ May not qualify for renewal
- 🔔 Requires clinical review and possible intervention
