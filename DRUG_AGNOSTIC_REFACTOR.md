# Drug-Agnostic Refactor - Summary

## Overview
The system has been refactored to be completely **drug-agnostic**. You can now add new drugs (Ozempic, Mounjaro, Zepbound, etc.) without changing any code - just by updating the configuration in `drugCoverage.js`.

## Latest Enhancement: Dose Phase Classification
Added sophisticated dose scheduling with **3 phases** (starting, titration, maintenance) for accurate PA criteria evaluation:

```javascript
doseSchedule: [
  { value: "0.25 mg", phase: "starting", duration: "Month 1" },
  { value: "0.5 mg", phase: "titration", duration: "Month 2" },
  { value: "1 mg", phase: "titration", duration: "Month 3" },
  { value: "1.7 mg", phase: "titration", duration: "Month 4" },
  { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
]
```

This allows different PA criteria for starting vs titration vs maintenance doses!

## What Changed

### 1. Data Structure in `drugCoverage.js`
Each drug now has:

```javascript
{
  covered: true,
  tier: "Tier 2 - Preferred Brand",
  copay: "$60",
  paRequired: true,
  stepTherapy: false,
  preferred: true,
  doseSchedule: [                    // NEW: Enhanced dose classification
    { value: "0.25 mg", phase: "starting", duration: "Month 1" },
    { value: "0.5 mg", phase: "titration", duration: "Month 2" },
    { value: "1 mg", phase: "titration", duration: "Month 3" },
    { value: "1.7 mg", phase: "titration", duration: "Month 4" },
    { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
  ],
  paCriteria: [
    { 
      rule: "Patient is 18 years or older", 
      type: "age",           // Structured type
      minAge: 18             // Structured data
    },
    { 
      rule: "Lost at least 5% of baseline body weight", 
      type: "weightLoss", 
      minPercentage: 5 
    },
    // ... more criteria
  ],
  evaluationRules: {          // NEW: Phase-based criteria evaluation
    starting: ["age", "bmi", "weightProgram", "documentation"],
    titration: ["age", "bmi", "weightProgram", "documentation"],
    maintenance: ["age", "bmi", "weightProgram", "maintenance", "weightLoss", "weightMaintained", "documentation"]
  }
}
```

### 2. Key Changes to Files

#### `src/data/drugCoverage.js`
- **Added `doseSchedule` array**: Defines dose phase (starting/titration/maintenance) with duration timeline
- **Added `type` to each criterion**: Structured type field (age, bmi, maintenance, weightLoss, etc.)
- **Added structured data**: minAge, minPercentage for programmatic evaluation
- **Added `evaluationRules`**: Specifies which criteria types apply to each phase (starting/titration/maintenance)

#### `src/utils/coverageLogic.js`
- **Enhanced `getDoseInfo(drug, dose)`**: Returns phase classification (starting/titration/maintenance) and duration
- **Removed text-based criterion detection**: Now uses structured `criterion.type`
- **Added `getApplicableCriteria(drug, dose)`**: Filters criteria based on dose phase and evaluationRules
- **Updated `evaluatePACriteria(patient, drug, dose, criterion)`**: Now uses switch statement on criterion.type

#### `src/components/TherapyModal.js`
- **Enhanced dose dropdown**: Shows dose with phase and timeline ("0.25 mg - Month 1 (starting)")
- **Uses doseSchedule**: Displays enhanced dose information if available
- **Backward compatible**: Falls back to simple doses array if doseSchedule not present

#### `src/components/CoverageDisplay.js`
- **Removed hardcoded filtering**: Now uses `getApplicableCriteria()` to get relevant criteria
- **Phase-aware**: Automatically shows correct criteria based on dose phase
- **Simplified status evaluation**: No more special cases, all logic in coverageLogic.js

#### `src/components/PAForm.js`
- **Removed hardcoded dose checks**: Now uses `getApplicableCriteria()` to determine which fields to show
- **Dynamic field display**: Shows maintenance/weight loss fields only if applicable for the dose phase
- **Drug-agnostic**: Works for any drug without code changes

## How to Add a New Drug

### Example: Adding Mounjaro with PA criteria and dose schedule

1. **Add drug to `allDrugs.js`** (if not already there):
```javascript
{
  id: "mounjaro",
  name: "Mounjaro",
  generic: "tirzepatide",
  class: "GLP-1",
  doses: ["2.5 mg", "5 mg", "7.5 mg", "10 mg", "12.5 mg", "15 mg"]
}
```

2. **Add drug to `drugCoverage.js`**:
```javascript
"CVS Health (Aetna)": {
  "Mounjaro": {
    covered: true,
    tier: "Tier 2 - Preferred Brand",
    copay: "$60",
    paRequired: true,
    stepTherapy: false,
    preferred: true,
    doseSchedule: [  // Define dose phases and timeline
      { value: "2.5 mg", phase: "starting", duration: "Month 1-4" },
      { value: "5 mg", phase: "titration", duration: "Month 5-8" },
      { value: "7.5 mg", phase: "titration", duration: "Month 9-12" },
      { value: "10 mg", phase: "maintenance", duration: "Month 13+" },
      { value: "12.5 mg", phase: "maintenance", duration: "Month 13+ (if needed)" },
      { value: "15 mg", phase: "maintenance", duration: "Month 13+ (max dose)" }
    ],
    paCriteria: [
      { rule: "Patient is 18 years or older", type: "age", minAge: 18 },
      { rule: "Completed at least 3 months of therapy at a stable maintenance dose (not required for starting dose)", type: "maintenance" },
      { rule: "Lost at least 5% of baseline body weight (not required for starting dose)", type: "weightLoss", minPercentage: 5 },
      { rule: "Maintained initial 5% weight loss (not required for starting dose)", type: "weightMaintained", minPercentage: 5 },
      { rule: "Participated in a comprehensive weight management program", type: "weightProgram" },
      { rule: "BMI ≥ 30, or BMI ≥ 27 with comorbidity (hypertension, diabetes, dyslipidemia)", type: "bmi" },
      { rule: "Documentation of chart note or supporting evidence", type: "documentation" }
    ],
    evaluationRules: {
      starting: ["age", "bmi", "weightProgram", "documentation"],
      titration: ["age", "bmi", "weightProgram", "documentation"],
      maintenance: ["age", "bmi", "weightProgram", "maintenance", "weightLoss", "weightMaintained", "documentation"]
    },
    note: "Preferred weight loss agent, PA required."
  }
}
```

That's it! No code changes needed.

## Supported Criterion Types

The system currently supports these criterion types:

- **`age`**: Requires `minAge` parameter
- **`bmi`**: Evaluates BMI ≥30 or BMI ≥27 with comorbidity
- **`maintenance`**: Checks maintenance dose requirements
- **`weightLoss`**: Requires `minPercentage` parameter
- **`weightMaintained`**: Requires `minPercentage` parameter
- **`weightProgram`**: Checks weight management program participation
- **`documentation`**: Documentation requirement

## Benefits

1. ✅ **No code changes needed** to add new drugs
2. ✅ **Flexible dose phases**: Each drug can define starting/titration/maintenance phases
3. ✅ **Customizable criteria**: Different drugs can have different PA criteria per phase
4. ✅ **Timeline visibility**: Shows expected duration for each dose in UI
5. ✅ **Automatic UI updates**: Coverage display and PA form automatically adjust based on configuration
6. ✅ **Scalable**: Easy to add Ozempic, Mounjaro, Zepbound, and future drugs
7. ✅ **Maintainable**: All drug-specific logic in one place (drugCoverage.js)
8. ✅ **Clinically accurate**: Matches real-world dose titration schedules

## Testing

To verify the refactor works:

1. Select a patient (e.g., Andre Patel)
2. Select Wegovy with "0.25 mg - Month 1 (starting)" dose → Should see 4 PA criteria (age, BMI, weight program, documentation)
3. Select Wegovy with "1 mg - Month 3 (titration)" dose → Should still see 4 PA criteria (titration uses same rules as starting)
4. Select Wegovy with "2.4 mg - Month 5+ (maintenance)" dose → Should see 7 PA criteria (all criteria including maintenance and weight loss)
5. Try Ozempic → Should work identically with its own dose schedule
6. PA form should hide/show fields dynamically based on dose phase
7. Dose dropdown should show enhanced information with timeline and phase

## Future Enhancements

Potential improvements:
- Add more criterion types (e.g., prior authorization history, formulary restrictions)
- Support for drug-specific evaluation logic
- Different evaluation rules per insurance carrier
- Dose escalation warnings based on timeline
- Automatic dose suggestions based on patient's therapy duration
