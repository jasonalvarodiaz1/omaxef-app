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
  }
];