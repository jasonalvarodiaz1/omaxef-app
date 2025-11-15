import React from 'react';

const MedicationSelector = ({ onMedicationSelect, selectedMedication, selectedDose }) => {
  const medications = [
    { name: 'Wegovy', doses: ['0.25 mg', '0.5 mg', '1 mg', '1.7 mg', '2.4 mg'] },
    { name: 'Ozempic', doses: ['0.25 mg', '0.5 mg', '1 mg', '2 mg'] },
    { name: 'Mounjaro', doses: ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg'] },
    { name: 'Saxenda', doses: ['0.6 mg', '1.2 mg', '1.8 mg', '2.4 mg', '3 mg'] },
    { name: 'Zepbound', doses: ['2.5 mg', '5 mg', '7.5 mg', '10 mg', '12.5 mg', '15 mg'] }
  ];

  const handleMedicationChange = (e) => {
    const medName = e.target.value;
    const med = medications.find(m => m.name === medName);
    if (med && med.doses.length > 0) {
      onMedicationSelect(medName, med.doses[0]);
    }
  };

  const handleDoseChange = (e) => {
    const dose = e.target.value;
    onMedicationSelect(selectedMedication, dose);
  };

  const selectedMed = medications.find(m => m.name === selectedMedication);

  return (
    <div className="medication-selector">
      <h3>Select Medication</h3>
      
      <div className="form-group">
        <label htmlFor="medication">Medication:</label>
        <select 
          id="medication"
          value={selectedMedication}
          onChange={handleMedicationChange}
          className="form-control"
        >
          <option value="">Select a medication...</option>
          {medications.map(med => (
            <option key={med.name} value={med.name}>
              {med.name}
            </option>
          ))}
        </select>
      </div>

      {selectedMedication && selectedMed && (
        <div className="form-group">
          <label htmlFor="dose">Dose:</label>
          <select 
            id="dose"
            value={selectedDose}
            onChange={handleDoseChange}
            className="form-control"
          >
            {selectedMed.doses.map(dose => (
              <option key={dose} value={dose}>
                {dose}
              </option>
            ))}
          </select>
        </div>
      )}
    </div>
  );
};

export default MedicationSelector;
