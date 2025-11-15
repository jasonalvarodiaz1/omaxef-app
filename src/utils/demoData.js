export const getDemoPatientData = () => {
  return {
    id: 'DEMO-001',
    name: 'John Smith',
    age: 52,
    gender: 'Male',
    insurance: 'Medicare Part D',
    diagnosis: [
      'Type 2 Diabetes (E11.9)',
      'Obesity (E66.9)',
      'Hypertension (I10)',
      'Hyperlipidemia (E78.5)'
    ],
    vitals: {
      height: { value: 70, units: 'in' },
      weight: { value: 240, units: 'lbs' },
      bmi: 34.4
    },
    labs: {
      a1c: { value: 8.2, units: '%', date: '2025-10-15' },
      glucose: { value: 165, units: 'mg/dL', date: '2025-10-15' },
      creatinine: { value: 1.1, units: 'mg/dL', date: '2025-10-15' }
    },
    medications: [
      { name: 'Metformin', dose: '1000 mg', sig: 'Take 1 tablet twice daily' },
      { name: 'Lisinopril', dose: '10 mg', sig: 'Take 1 tablet daily' },
      { name: 'Atorvastatin', dose: '20 mg', sig: 'Take 1 tablet at bedtime' }
    ],
    allergies: ['Penicillin', 'Sulfa drugs'],
    clinicalNotes: {
      hasWeightProgram: true,
      baselineWeight: { value: 250, units: 'lbs', date: '2025-08-01' },
      currentWeight: { value: 240, units: 'lbs', date: '2025-11-01' },
      weightLossPercentage: 4.0,
      monthsOnMaintenanceDose: 0,
      priorTherapies: ['Saxenda (discontinued due to side effects)']
    },
    therapyHistory: [
      {
        medication: 'Saxenda',
        startDate: '2024-05-01',
        endDate: '2024-08-15',
        reason: 'Discontinued - GI side effects',
        maxDose: '1.8 mg',
        outcome: 'Weight loss: 8 lbs, discontinued due to nausea'
      }
    ]
  };
};

export const getDemoPatients = () => {
  return [
    getDemoPatientData(),
    {
      id: 'DEMO-002',
      name: 'Sarah Johnson',
      age: 38,
      gender: 'Female',
      insurance: 'Aetna PPO',
      diagnosis: ['Type 2 Diabetes (E11.9)', 'Obesity (E66.01)'],
      vitals: {
        height: { value: 64, units: 'in' },
        weight: { value: 195, units: 'lbs' },
        bmi: 33.5
      },
      labs: {
        a1c: { value: 7.5, units: '%', date: '2025-10-20' }
      },
      medications: [
        { name: 'Metformin', dose: '500 mg', sig: 'Take 1 tablet twice daily' }
      ],
      allergies: [],
      clinicalNotes: {
        hasWeightProgram: false,
        baselineWeight: { value: 195, units: 'lbs', date: '2025-09-01' },
        currentWeight: { value: 195, units: 'lbs', date: '2025-11-01' },
        weightLossPercentage: 0,
        monthsOnMaintenanceDose: 0,
        priorTherapies: []
      },
      therapyHistory: []
    }
  ];
};
