import { createContext, useContext, useState } from 'react';
import { patients as initialPatients } from '../data/patients';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients] = useState(initialPatients);
  
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  return (
    <PatientContext.Provider value={{ 
      selectedPatient, 
      selectedPatientId,
      setSelectedPatientId,
      patients,
      patientSearch,
      setPatientSearch
    }}>
      {children}
    </PatientContext.Provider>
  );
}

export function usePatient() {
  const context = useContext(PatientContext);
  if (!context) {
    throw new Error('usePatient must be used within a PatientProvider');
  }
  return context;
}
