import { createContext, useContext, useState } from 'react';
import { patients as initialPatients } from '../data/patients';

const PatientContext = createContext();

export function PatientProvider({ children }) {
  const [selectedPatientId, setSelectedPatientId] = useState("");
  const [patientSearch, setPatientSearch] = useState("");
  const [patients, setPatients] = useState(initialPatients);
  
  const selectedPatient = patients.find(p => p.id === selectedPatientId);
  
  const addEpicPatient = (epicPatient) => {
    const existingPatient = patients.find(p => p.id === epicPatient.id);
    
    if (existingPatient) {
      setPatients(prev => prev.map(p => 
        p.id === epicPatient.id ? epicPatient : p
      ));
    } else {
      setPatients(prev => [...prev, epicPatient]);
    }
    
    setSelectedPatientId(epicPatient.id);
  };
  
  return (
    <PatientContext.Provider value={{ 
      selectedPatient, 
      selectedPatientId,
      setSelectedPatientId,
      patients,
      patientSearch,
      setPatientSearch,
      addEpicPatient
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
