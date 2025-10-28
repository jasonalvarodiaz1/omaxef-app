export const glp1Drugs = [
  {
    id: "ozempic",
    name: "Ozempic",
    generic: "semaglutide",
    ndc: "0169-4133-12",
    coverageRules: [
      {
        insurance: "Medicare",
        isCovered: true,
        paRequired: true,
        paQuestions: [
          "Diagnosis of Type 2 Diabetes?",
          "Recent A1c value?",
        ],
        preferred: false,
        stepTherapy: false
      },
      {
        insurance: "Medicaid",
        isCovered: false,
        paRequired: false,
        paQuestions: [],
        preferred: false,
        stepTherapy: false
      },
      {
        insurance: "Blue Cross",
        isCovered: true,
        paRequired: false,
        paQuestions: [],
        preferred: true,
        stepTherapy: false
      }
    ]
  },
  {
    id: "trulicity",
    name: "Trulicity",
    generic: "dulaglutide",
    ndc: "0002-1433-80",
    coverageRules: [
      {
        insurance: "Medicare",
        isCovered: true,
        paRequired: false,
        paQuestions: [],
        preferred: false,
        stepTherapy: true
      },
      {
        insurance: "Medicaid",
        isCovered: true,
        paRequired: true,
        paQuestions: [
          "Diagnosis of Type 2 Diabetes?",
          "Previous use of metformin?"
        ],
        preferred: false,
        stepTherapy: false
      }
    ]
  },
  {
    id: "mounjaro",
    name: "Mounjaro",
    generic: "tirzepatide",
    ndc: "0002-1496-80",
    coverageRules: [
      {
        insurance: "Medicare",
        isCovered: false,
        paRequired: false,
        paQuestions: [],
        preferred: false,
        stepTherapy: false
      },
      {
        insurance: "Commercial",
        isCovered: true,
        paRequired: true,
        paQuestions: [
          "BMI over 30?",
          "Diagnosis of Type 2 Diabetes?"
        ],
        preferred: false,
        stepTherapy: false
      }
    ]
  },
  {
    id: "wegovy",
    name: "Wegovy",
    generic: "semaglutide",
    ndc: "0169-4517-01",
    coverageRules: [
      {
        insurance: "Medicare",
        isCovered: false,
        paRequired: false,
        paQuestions: [],
        preferred: false,
        stepTherapy: false,
        notes: "Medicare does not cover weight loss medications"
      },
      {
        insurance: "Medicaid",
        isCovered: false,
        paRequired: false,
        paQuestions: [],
        preferred: false,
        stepTherapy: false,
        notes: "Most Medicaid plans exclude weight loss medications"
      },
      {
        insurance: "Commercial",
        isCovered: true,
        paRequired: true,
        paQuestions: [
          "BMI ≥ 27 with weight-related comorbidity or BMI ≥ 30?",
          "Documentation of previous weight loss attempts?",
          "No contraindications to GLP-1 therapy?",
          "Patient consent obtained?"
        ],
        preferred: false,
        stepTherapy: false,
        notes: "Requires PA with BMI documentation and comorbidity assessment"
      },
      {
        insurance: "Blue Cross",
        isCovered: true,
        paRequired: true,
        paQuestions: [
          "BMI ≥ 27 with comorbidity or BMI ≥ 30?",
          "Clinical documentation of obesity management plan?",
          "A1C < 6.5% (to exclude diabetes)?",
          "Trial of lifestyle modifications?"
        ],
        preferred: false,
        stepTherapy: true,
        notes: "Step therapy may require trial of other weight loss medications first"
      }
    ]
  }
];