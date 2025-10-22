// Mock Epic FHIR Data for Testing (without needing real Epic login)

export const mockEpicPatientData = {
  patient: {
    resourceType: "Patient",
    id: "Tbt3KuCY0B5PSrJvCu2j-PlK.aiHsu2xUjUM8bWpetXoB",
    name: [{
      given: ["Camila"],
      family: "Lopez"
    }],
    gender: "female",
    birthDate: "1987-05-12"
  },
  
  conditions: {
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "Condition",
          id: "cond-1",
          code: {
            coding: [{
              code: "E11.9",
              display: "Type 2 diabetes mellitus without complications"
            }],
            text: "Type 2 Diabetes"
          },
          clinicalStatus: {
            coding: [{ code: "active" }]
          }
        }
      },
      {
        resource: {
          resourceType: "Condition",
          id: "cond-2",
          code: {
            coding: [{
              code: "E66.9",
              display: "Obesity, unspecified"
            }],
            text: "Obesity"
          },
          clinicalStatus: {
            coding: [{ code: "active" }]
          }
        }
      }
    ]
  },
  
  medications: {
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "MedicationRequest",
          id: "med-1",
          status: "active",
          medicationCodeableConcept: {
            coding: [{
              display: "Metformin 500 MG"
            }],
            text: "Metformin 500 MG Oral Tablet"
          },
          dosageInstruction: [{
            text: "Take 1 tablet twice daily",
            doseAndRate: [{
              doseQuantity: { value: 500 }
            }]
          }]
        }
      }
    ]
  },
  
  observations: {
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "Observation",
          id: "obs-1",
          code: {
            coding: [{ code: "4548-4", display: "Hemoglobin A1c" }],
            text: "HbA1c"
          },
          valueQuantity: {
            value: 7.2,
            unit: "%",
            code: "%"
          },
          effectiveDateTime: "2024-10-01"
        }
      },
      {
        resource: {
          resourceType: "Observation",
          id: "obs-2",
          code: {
            coding: [{ code: "39156-5", display: "BMI" }],
            text: "Body Mass Index"
          },
          valueQuantity: {
            value: 34.5,
            unit: "kg/m2"
          },
          effectiveDateTime: "2024-10-15"
        }
      },
      {
        resource: {
          resourceType: "Observation",
          id: "obs-3",
          code: {
            coding: [{ code: "29463-7", display: "Body Weight" }],
            text: "Weight"
          },
          valueQuantity: {
            value: 92,
            unit: "kg"
          },
          effectiveDateTime: "2024-10-15"
        }
      }
    ]
  },
  
  coverage: {
    resourceType: "Bundle",
    entry: [
      {
        resource: {
          resourceType: "Coverage",
          id: "cov-1",
          status: "active",
          type: {
            text: "Blue Cross Blue Shield PPO"
          },
          subscriberId: "12345678",
          payor: [{
            display: "Blue Cross Blue Shield"
          }]
        }
      }
    ]
  }
};

// Function to simulate Epic authentication with mock data
export const useMockEpicData = () => {
  // Store mock token
  sessionStorage.setItem('epic_access_token', 'mock_token_' + Date.now());
  sessionStorage.setItem('epic_patient_id', mockEpicPatientData.patient.id);
  sessionStorage.setItem('epic_token_expires', Date.now() + (3600 * 1000)); // 1 hour
  
  return mockEpicPatientData;
};
