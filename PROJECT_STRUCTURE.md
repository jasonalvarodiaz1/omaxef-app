# FHIR Dashboard - Project Structure

## 📁 File Organization

```
src/
├── App.js                          # Main app with PatientProvider wrapper
├── index.js                        # Entry point
│
├── components/                     # UI Components
│   ├── PatientSidebar.js          # Patient selection & info sidebar
│   ├── PatientChart.js            # Patient demographics display
│   ├── TherapyModal.js            # Drug selection & therapy initiation
│   ├── CoverageDisplay.js         # Coverage info & PA criteria display
│   └── PAForm.js                  # Prior authorization form modal
│
├── context/                        # React Context
│   └── PatientContext.js          # Patient state management (eliminates prop drilling)
│
├── data/                           # Data Configuration
│   ├── patients.js                # Patient demographic & clinical data
│   ├── allDrugs.js                # Drug catalog
│   ├── drugCoverage.js            # Coverage rules & PA criteria by insurance
│   └── glp1Drugs.js               # Legacy GLP-1 specific data
│
├── utils/                          # Business Logic
│   ├── criteriaEvaluator.js       # PA criteria evaluation engine
│   └── coverageLogic.js           # Coverage lookup & criteria filtering
│
└── [test/config files]
```

---

## 🏗️ Architecture Patterns

### 1. **Context API for Global State**
- `PatientContext` manages patient selection
- Components use `usePatient()` hook instead of prop drilling
- Eliminates passing patient data through 3+ component levels

### 2. **Grouped State Objects**
- Related form fields grouped into `paFormData` object
- Reduces props from 11 individual fields to 1 object
- Easier to maintain and extend

### 3. **useEffect for Derived State**
- BMI auto-populated from patient data when patient changes
- Prevents stale data when switching patients

Example:
```javascript
useEffect(() => {
  if (selectedPatient?.vitals?.bmi) {
    setPaFormData(prev => ({ ...prev, bmi: selectedPatient.vitals.bmi.toString() }));
  }
}, [selectedPatient]);
```

### 4. **Separation of Concerns**
- **Components**: Presentation only
- **Utils**: Business logic (PA evaluation, coverage lookup)
- **Data**: Configuration (drug rules, patient info)
- **Context**: State management

---

## 🔧 Key Components

### **App.js**
- Wraps app in `PatientProvider`
- Manages therapy modal state
- Handles tab navigation (Summary/Medications/Results)

### **PatientContext.js**
- Provides: `selectedPatient`, `selectedPatientId`, `setSelectedPatientId`, `patients`, `patientSearch`, `setPatientSearch`
- Usage: `const { selectedPatient } = usePatient();`

### **criteriaEvaluator.js**
- `evaluateCriterion()`: Main evaluation dispatcher
- Individual evaluators: `evaluateAge()`, `evaluateBMI()`, `evaluateDoseProgression()`, etc.
- `calculateApprovalLikelihood()`: Smart PA approval scoring
- Returns structured results: `{status, value, displayValue, requirement, reason}`

### **coverageLogic.js**
- `getCoverageForDrug()`: Lookup coverage by insurance/drug
- `getApplicableCriteria()`: Filter criteria by dose phase & therapy history
- `evaluatePACriteriaDetailed()`: Wrapper for evaluator
- `getApprovalLikelihood()`: Export for UI

### **CoverageDisplay.js**
- Shows tier, copay, PA required status
- Lists applicable PA criteria with checkmarks/X's
- Displays actual values vs requirements
- Shows approval likelihood calculator with color-coded recommendations

### **PAForm.js**
- Dynamic form that only shows applicable criteria fields
- Uses `getApplicableCriteria()` to determine which fields to render
- Groups form data into single object for cleaner state management

---

## 🎯 Data Flow

1. **Patient Selection**: User selects patient → `PatientContext` updates → All components re-render with new patient
2. **Drug Lookup**: User searches drug → TherapyModal displays coverage → Calls `getCoverageForDrug()`
3. **Dose Selection**: User selects dose → `getApplicableCriteria()` filters criteria → CoverageDisplay shows relevant checks
4. **PA Evaluation**: For each criterion → `evaluateCriterion()` returns detailed result → UI shows ✓/✗ with explanations
5. **Approval Likelihood**: All criteria results → `calculateApprovalLikelihood()` → Shows percentage + action recommendation

---

## 🚀 Best Practices Implemented

✅ **Context API** for global state (no prop drilling)  
✅ **Grouped related state** (paFormData object)  
✅ **useEffect** for derived state synchronization  
✅ **Separation of concerns** (components vs logic vs data)  
✅ **Modular components** (single responsibility)  
✅ **Dynamic evaluation** (drug-agnostic PA criteria)  
✅ **Structured return values** (detailed evaluation results)  
✅ **Smart filtering** (continuation vs new therapy detection)  

---

## 📝 Recent Enhancements

### Approval Likelihood Calculator
- Detects critical failures (age, BMI, dose progression)
- Calculates percentage of criteria met
- Returns color-coded confidence levels
- Provides actionable recommendations ("Proceed" vs "Do not submit")

### Continuation Detection
- Identifies when patient is already on requested dose
- Skips maintenance/weight loss criteria for continuations
- Only checks basic eligibility (age, BMI, dose progression)

### Dose Phase System
- Classifies doses as starting/titration/maintenance
- Applies different criteria based on phase
- Validates dose progression sequencing

---

## 🎨 UI Framework

- **Tailwind CSS** for styling (Epic-inspired medical UI)
- **React functional components** with hooks
- **Conditional rendering** for dynamic forms
- **Color-coded feedback** (green ✓, red ✗, orange N/A)

---

## 🔄 State Management Strategy

| State Type | Location | Access Method |
|------------|----------|---------------|
| Patient selection | `PatientContext` | `usePatient()` hook |
| Tab navigation | `App.js` | Local state |
| Drug selection | `App.js` | Props to TherapyModal |
| PA form data | `App.js` | Grouped `paFormData` object |
| Modal visibility | `App.js` | Local state |

---

## 📚 Next Steps (Potential)

- [ ] Add TypeScript for type safety
- [ ] Create custom hooks folder (`useTherapyForm`, `usePACriteria`)
- [ ] Add unit tests for criteria evaluators
- [ ] Implement error boundaries
- [ ] Add loading states for async operations
- [ ] Create a drug context if drug selection becomes complex
