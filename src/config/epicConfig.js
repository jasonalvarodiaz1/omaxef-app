export const epicConfig = {
  iss: 'https://fhir.epic.com/interconnect-fhir-oauth/api/FHIR/R4',
  clientId: 'e12f6559-dcee-4201-881e-90fc41978ef3',
  redirectUri: 'http://localhost:3000/callback', // Ensure this matches exactly
  scope: 'openid fhirUser user/Patient.read user/Coverage.read user/Observation.read user/Condition.read user/MedicationRequest.read user/MedicationStatement.read user/AllergyIntolerance.read user/DiagnosticReport.read user/Procedure.read user/DocumentReference.read user/Encounter.read user/CarePlan.read user/Immunization.read user/Goal.read user/ServiceRequest.read user/FamilyMemberHistory.read user/CareTeam.read user/Medication.read',
  authorizeUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/authorize',
  tokenUrl: 'https://fhir.epic.com/interconnect-fhir-oauth/oauth2/token'
};