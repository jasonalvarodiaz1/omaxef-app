export const drugCoverage = {
  "CVS Health (Aetna)": {
    "Wegovy": {
      covered: true,
      tier: "Tier 2 - Preferred Brand",
      copay: "$60",
      paRequired: true,
      stepTherapy: false,
      preferred: true,
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "titration", duration: "Month 2" },
        { value: "1 mg", phase: "titration", duration: "Month 3" },
        { value: "1.7 mg", phase: "titration", duration: "Month 4" },
        { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
      ],
      paCriteria: [
        { rule: "Patient is 18 years or older", type: "age", minAge: 18 },
        { rule: "Patient has completed prior dose in titration schedule (not required for starting dose)", type: "doseProgression" },
        { rule: "Completed at least 3 months of therapy at a stable maintenance dose (not required for starting dose)", type: "maintenance" },
        { rule: "Lost at least 5% of baseline body weight (not required for starting dose)", type: "weightLoss", minPercentage: 5 },
        { rule: "Maintained initial 5% weight loss (not required for starting dose)", type: "weightMaintained", minPercentage: 5 },
        { rule: "Participated in a comprehensive weight management program", type: "weightProgram" },
        { rule: "BMI ≥ 30, or BMI ≥ 27 with comorbidity (hypertension, diabetes, dyslipidemia)", type: "bmi" },
        { rule: "Documentation of chart note or supporting evidence", type: "documentation" }
      ],
      evaluationRules: {
        starting: ["age", "bmi", "weightProgram", "doseProgression", "documentation"],
        titration: ["age", "bmi", "weightProgram", "doseProgression", "documentation"],
        maintenance: ["age", "bmi", "weightProgram", "doseProgression", "maintenance", "weightLoss", "weightMaintained", "documentation"]
      },
      note: "Preferred weight loss agent, PA required."
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 2 - Preferred Brand",
      copay: "$60",
      paRequired: true,
      stepTherapy: false,
      preferred: true,
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "titration", duration: "Month 2-4" },
        { value: "1 mg", phase: "maintenance", duration: "Month 5+" },
        { value: "2 mg", phase: "maintenance", duration: "Month 5+ (if needed)" }
      ],
      paCriteria: [
        { rule: "Patient is 18 years or older", type: "age", minAge: 18 },
        { rule: "Patient has completed prior dose in titration schedule (not required for starting dose)", type: "doseProgression" },
        { rule: "Completed at least 3 months of therapy at a stable maintenance dose (not required for starting dose)", type: "maintenance" },
        { rule: "Lost at least 5% of baseline body weight (not required for starting dose)", type: "weightLoss", minPercentage: 5 },
        { rule: "Maintained initial 5% weight loss (not required for starting dose)", type: "weightMaintained", minPercentage: 5 },
        { rule: "Participated in a comprehensive weight management program", type: "weightProgram" },
        { rule: "BMI ≥ 30, or BMI ≥ 27 with comorbidity (hypertension, diabetes, dyslipidemia)", type: "bmi" },
        { rule: "Documentation of chart note or supporting evidence", type: "documentation" }
      ],
      evaluationRules: {
        starting: ["age", "bmi", "weightProgram", "doseProgression", "documentation"],
        titration: ["age", "bmi", "weightProgram", "doseProgression", "documentation"],
        maintenance: ["age", "bmi", "weightProgram", "doseProgression", "maintenance", "weightLoss", "weightMaintained", "documentation"]
      },
      note: "Preferred weight loss agent, PA required."
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered."
    }
  },
  "Medicare": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Medicare"
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Medicare"
    },
    "Trulicity": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$60",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      note: "Non-preferred GLP-1 for Medicare patients"
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$20",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Medicare patients"
    },
    "Mounjaro": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$20",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Medicare patients"
    }
  },
  "Medicaid": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Medicaid"
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Medicaid"
    },
    "Trulicity": {
      covered: true,
      tier: "Tier 2 - Non-Preferred Brand",
      copay: "$40",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      note: "Non-preferred GLP-1 for Medicaid"
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$10",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Medicaid"
    },
    "Mounjaro": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$10",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Medicaid"
    }
  },
  "Blue Cross": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Blue Cross"
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Blue Cross"
    },
    "Trulicity": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$70",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      preferredAlternative: "Ozempic",
      note: "Non-preferred GLP-1. Preferred: Ozempic."
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 2 - Preferred Brand",
      copay: "$25",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Blue Cross"
    },
    "Mounjaro": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$70",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      preferredAlternative: "Ozempic",
      note: "Non-preferred GLP-1. Preferred: Ozempic."
    }
  },
  "Commercial": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Commercial"
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by Commercial"
    },
    "Trulicity": {
      covered: true,
      tier: "Tier 2 - Non-Preferred Brand",
      copay: "$50",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      note: "Non-preferred GLP-1 for Commercial plans"
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$15",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Commercial plans"
    },
    "Mounjaro": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$15",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 for Commercial plans"
    }
  },
  "UnitedHealthcare PPO": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by UnitedHealthcare PPO"
    },
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "Not covered by UnitedHealthcare PPO"
    },
    "Trulicity": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$75",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      note: "Non-preferred GLP-1 agonist"
    },
    "Ozempic": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$30",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 agonist - first-line option"
    },
    "Mounjaro": {
      covered: true,
      tier: "Tier 1 - Preferred Brand",
      copay: "$30",
      paRequired: false,
      stepTherapy: false,
      preferred: true,
      note: "Preferred GLP-1 agonist - first-line option"
    }
  }
};