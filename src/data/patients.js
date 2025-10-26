export const patients = [
  {
    id: "p1",
    name: "Maria Gomez",
    insurance: "Medicare Part D",
    age: 72,
    gender: "female",
    diagnosis: ["Type 2 Diabetes", "Hypertension", "Dyslipidemia", "Obesity"],
    allergies: ["Penicillin", "Sulfa drugs"],
    vitals: {
      height: { value: 160, units: "cm" },
      weight: { value: 82, units: "kg" },
      bmi: 32.0
    },
    labs: {
      a1c: { value: 8.2, units: "%", date: "2024-09-15" },
      egfr: { value: 80, units: "mL/min/1.73m²", date: "2024-09-15" },
      creatinine: { value: 1.1, units: "mg/dL", date: "2024-09-15" },
      cholesterol: { value: 210, units: "mg/dL", date: "2024-09-15" },
      hdl: { value: 45, units: "mg/dL", date: "2024-09-15" },
      ldl: { value: 130, units: "mg/dL", date: "2024-09-15" }
    },
    medications: [
      {
        name: "Metformin",
        dose: "1000 mg",
        sig: "Take 1 tablet by mouth twice daily"
      },
      {
        name: "Lisinopril",
        dose: "20 mg",
        sig: "Take 1 tablet by mouth once daily"
      },
      {
        name: "Atorvastatin",
        dose: "40 mg",
        sig: "Take 1 tablet by mouth at bedtime"
      }
    ],
    clinicalNotes: {
      hasWeightProgram: true,
      baselineWeight: { value: 82, units: "kg", date: "2024-07-01" },
      currentWeight: { value: 82, units: "kg", date: "2024-10-01" },
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: [] // Never been on GLP-1
  },
  {
    id: "p2",
    name: "James Lee",
    insurance: "Medicaid",
    age: 58,
    gender: "male",
    diagnosis: ["Type 2 Diabetes", "Hypertension", "Obesity"],
    allergies: [],
    vitals: {
      height: { value: 173, units: "cm" },
      weight: { value: 87, units: "kg" },
      bmi: 29.0
    },
    labs: {
      a1c: { value: 7.0, units: "%", date: "2024-09-20" },
      egfr: { value: 75, units: "mL/min/1.73m²", date: "2024-09-20" },
      creatinine: { value: 1.0, units: "mg/dL", date: "2024-09-20" },
      cholesterol: { value: 195, units: "mg/dL", date: "2024-09-20" },
      hdl: { value: 50, units: "mg/dL", date: "2024-09-20" },
      ldl: { value: 120, units: "mg/dL", date: "2024-09-20" }
    },
    medications: [
      {
        name: "Metformin",
        dose: "500 mg",
        sig: "Take 1 tablet by mouth twice daily"
      },
      {
        name: "Empagliflozin",
        dose: "25 mg",
        sig: "Take 1 tablet by mouth once daily"
      },
      {
        name: "Amlodipine",
        dose: "10 mg",
        sig: "Take 1 tablet by mouth once daily"
      }
    ],
    clinicalNotes: {
      hasWeightProgram: true,
      baselineWeight: { value: 87, units: "kg", date: "2024-08-01" },
      currentWeight: { value: 87, units: "kg", date: "2024-10-01" },
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: [] // Never been on GLP-1
  },
  {
    id: "p3",
    name: "Ella Smith",
    insurance: "CVS Health (Aetna)",
    age: 44,
    gender: "female",
    diagnosis: ["Generalized Anxiety Disorder"],
    allergies: ["None"],
    vitals: {
      height: { value: 165, units: "cm" },
      weight: { value: 76, units: "kg" },
      bmi: 28.0
    },
    labs: {
      a1c: { value: 5.2, units: "%", date: "2024-09-10" },
      tsh: { value: 1.8, units: "mIU/L", date: "2024-09-10" },
      cholesterol: { value: 170, units: "mg/dL", date: "2024-09-10" },
      hdl: { value: 60, units: "mg/dL", date: "2024-09-10" },
      ldl: { value: 90, units: "mg/dL", date: "2024-09-10" }
    },
    medications: [
      {
        name: "Sertraline",
        dose: "50 mg",
        sig: "Take 1 tablet by mouth once daily"
      },
      {
        name: "Alprazolam",
        dose: "0.5 mg",
        sig: "Take 1 tablet by mouth as needed for anxiety"
      }
    ],
    clinicalNotes: {
      hasWeightProgram: false,
      baselineWeight: { value: 76, units: "kg", date: "2024-06-01" },
      currentWeight: { value: 76, units: "kg", date: "2024-10-01" },
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: [] // Never been on GLP-1
  },
  {
    id: "p4",
    name: "Andre Patel",
    insurance: "CVS Health (Aetna)",
    age: 61,
    gender: "male",
    diagnosis: ["Type 2 Diabetes", "Dyslipidemia", "Obesity"],
    allergies: ["Aspirin"],
    vitals: {
      height: { value: 175, units: "cm" },
      weight: { value: 104, units: "kg" },
      bmi: 34.0
    },
    labs: {
      a1c: { value: 6.5, units: "%", date: "2024-10-01" },
      egfr: { value: 85, units: "mL/min/1.73m²", date: "2024-10-01" },
      creatinine: { value: 0.9, units: "mg/dL", date: "2024-10-01" },
      cholesterol: { value: 205, units: "mg/dL", date: "2024-10-01" },
      hdl: { value: 48, units: "mg/dL", date: "2024-10-01" },
      ldl: { value: 125, units: "mg/dL", date: "2024-10-01" }
    },
    medications: [
      {
        name: "Metformin",
        dose: "1000 mg",
        sig: "Take 1 tablet by mouth twice daily"
      },
      {
        name: "Canagliflozin",
        dose: "300 mg",
        sig: "Take 1 tablet by mouth once daily before breakfast"
      },
      {
        name: "Simvastatin",
        dose: "20 mg",
        sig: "Take 1 tablet by mouth at bedtime"
      }
    ],
    clinicalNotes: {
      hasWeightProgram: true,
      baselineWeight: { value: 104, units: "kg", date: "2024-07-01" },
      currentWeight: { value: 104, units: "kg", date: "2024-10-01" },
      weightLossPercentage: 0,
      monthsOnMaintenanceDose: 0
    },
    therapyHistory: [] // GLP-1 NAIVE - Never been on any GLP-1
  },
  {
    id: "p5",
    name: "Sarah Johnson",
    insurance: "CVS Health (Aetna)",
    age: 52,
    gender: "female",
    diagnosis: ["Type 2 Diabetes", "Hypertension", "Obesity"],
    allergies: [],
    vitals: {
      height: { value: 168, units: "cm" },
      weight: { value: 98, units: "kg" },
      bmi: 34.7
    },
    labs: {
      a1c: { value: 7.8, units: "%", date: "2024-10-01" },
      egfr: { value: 82, units: "mL/min/1.73m²", date: "2024-10-01" },
      creatinine: { value: 1.0, units: "mg/dL", date: "2024-10-01" },
      cholesterol: { value: 198, units: "mg/dL", date: "2024-10-01" },
      hdl: { value: 52, units: "mg/dL", date: "2024-10-01" },
      ldl: { value: 118, units: "mg/dL", date: "2024-10-01" }
    },
    medications: [
      {
        name: "Metformin",
        dose: "1000 mg",
        sig: "Take 1 tablet by mouth twice daily"
      },
      {
        name: "Lisinopril",
        dose: "10 mg",
        sig: "Take 1 tablet by mouth once daily"
      },
      {
        name: "Wegovy",
        dose: "2.4 mg",
        sig: "Inject 2.4 mg subcutaneously once weekly"
      }
    ],
    clinicalNotes: {
      hasWeightProgram: true,
      baselineWeight: { value: 103, units: "kg", date: "2024-04-01" },
      currentWeight: { value: 98, units: "kg", date: "2024-10-01" },
      initialWeightLossPercentage: 5.8,  // Peak weight loss (6kg from 103kg)
      currentWeightLossPercentage: 4.9,   // Current sustained weight loss
      weightMaintenanceMonths: 2,
      weightLossPercentage: 4.9,
      monthsOnMaintenanceDose: 2
    },
    therapyHistory: [
      {
        drug: "Wegovy",
        startDate: "2024-04-01",
        doses: [
          { value: "0.25 mg", startDate: "2024-04-01", endDate: "2024-05-01", phase: "starting" },
          { value: "0.5 mg", startDate: "2024-05-01", endDate: "2024-06-01", phase: "titration" },
          { value: "1 mg", startDate: "2024-06-01", endDate: "2024-07-01", phase: "titration" },
          { value: "1.7 mg", startDate: "2024-07-01", endDate: "2024-08-01", phase: "titration" },
          { value: "2.4 mg", startDate: "2024-08-01", endDate: null, phase: "maintenance" }
        ],
        currentDose: "2.4 mg",
        status: "active",
        responseToTherapy: "partial",
        weightAtStart: { value: 103, units: "kg" },
        currentWeight: { value: 98, units: "kg" },
        weightLossAchieved: 4.9,
        initialApprovalDate: "2024-04-01",
        lastRefillDate: "2024-10-01",
        nextRefillDue: "2024-11-01",
        paStatus: "approved",
        paExpirationDate: "2025-04-01",  // PA expires - needs reauth
        prescribingProvider: "Dr. Smith",
        pharmacy: "CVS Pharmacy #1234"
      }
    ]
  }
];