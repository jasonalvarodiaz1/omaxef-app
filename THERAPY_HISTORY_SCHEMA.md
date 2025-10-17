# Therapy History Data Structure

## 📋 Complete Schema

The `therapyHistory` array tracks comprehensive medication history including clinical outcomes and administrative details.

```javascript
therapyHistory: [
  {
    // Drug identification
    drug: "Wegovy",
    startDate: "2024-04-01",
    
    // Dose progression tracking
    doses: [
      {
        value: "0.25 mg",
        startDate: "2024-04-01",
        endDate: "2024-05-01",
        phase: "starting"  // starting | titration | maintenance
      },
      {
        value: "0.5 mg",
        startDate: "2024-05-01",
        endDate: "2024-06-01",
        phase: "titration"
      },
      {
        value: "1 mg",
        startDate: "2024-06-01",
        endDate: "2024-07-01",
        phase: "titration"
      },
      {
        value: "1.7 mg",
        startDate: "2024-07-01",
        endDate: "2024-08-01",
        phase: "titration"
      },
      {
        value: "2.4 mg",
        startDate: "2024-08-01",
        endDate: null,  // null = current dose
        phase: "maintenance"
      }
    ],
    
    // Current status
    currentDose: "2.4 mg",
    status: "active",  // active | discontinued | completed
    
    // Clinical outcomes
    responseToTherapy: "partial",  // excellent | good | partial | poor | none
    weightAtStart: { value: 103, units: "kg" },
    currentWeight: { value: 98, units: "kg" },
    weightLossAchieved: 4.9,  // percentage
    
    // Administrative tracking (NEW)
    initialApprovalDate: "2024-04-01",
    lastRefillDate: "2024-10-01",
    nextRefillDue: "2024-11-01",
    paStatus: "approved",  // approved | pending | denied | expired
    paExpirationDate: "2025-04-01",  // Many PAs expire after 1 year
    prescribingProvider: "Dr. Smith",
    pharmacy: "CVS Pharmacy #1234"
  }
]
```

---

## 🎯 Field Descriptions

### **Clinical Tracking**

| Field | Type | Purpose | Used By |
|-------|------|---------|---------|
| `drug` | string | Medication name | Dose progression validator |
| `startDate` | date string | Therapy start date | Duration calculations |
| `doses` | array | Complete dose history | Phase detection, progression validation |
| `currentDose` | string | Active dose | Continuation vs progression logic |
| `status` | enum | Therapy status | Active medication checks |
| `responseToTherapy` | enum | Clinical response | Outcome tracking |
| `weightAtStart` | object | Baseline weight | Weight loss calculations |
| `currentWeight` | object | Current weight | Weight loss calculations |
| `weightLossAchieved` | number | % weight loss | PA criteria evaluation |

### **Administrative Tracking** (NEW)

| Field | Type | Purpose | Business Value |
|-------|------|---------|----------------|
| `initialApprovalDate` | date string | Original PA approval | Renewal tracking |
| `lastRefillDate` | date string | Most recent fill | Adherence monitoring |
| `nextRefillDue` | date string | Expected refill date | Proactive outreach |
| `paStatus` | enum | Current PA status | Refill eligibility |
| `paExpirationDate` | date string | When PA expires | Renewal alerts |
| `prescribingProvider` | string | Ordering physician | Care coordination |
| `pharmacy` | string | Dispensing pharmacy | Refill tracking |

---

## 🔧 How It's Used in Code

### **Dose Progression Validation** (`criteriaEvaluator.js`)

```javascript
function evaluateDoseProgression(patient, drug, requestedDose, drugName, doseInfo) {
  // Finds therapy history for this drug
  const drugHistory = patient.therapyHistory?.find(h => h.drug === drugName);
  
  // Checks if patient is already on the dose (continuation)
  if (requestedDose === drugHistory.currentDose) {
    return { status: 'met', reason: 'Continuing current dose' };
  }
  
  // Validates sequential progression through dose schedule
  // Prevents skipping doses or going backwards
}
```

### **Continuation Detection** (`coverageLogic.js`)

```javascript
export function getApplicableCriteria(drug, dose, patient, drugName) {
  const drugHistory = patient?.therapyHistory?.find(h => h.drug === drugName);
  const isContinuation = drugHistory && drugHistory.currentDose === dose && drugHistory.status === "active";
  
  // For continuations, skip maintenance time and weight loss criteria
  if (isContinuation) {
    applicableTypes = applicableTypes.filter(type => 
      ['age', 'bmi', 'doseProgression'].includes(type)
    );
  }
}
```

---

## 💡 Future Enhancements

### **PA Renewal Alerts**
```javascript
function needsPARenewal(therapyHistory) {
  const therapy = therapyHistory[0];
  const expirationDate = new Date(therapy.paExpirationDate);
  const today = new Date();
  const daysUntilExpiration = (expirationDate - today) / (1000 * 60 * 60 * 24);
  
  if (daysUntilExpiration <= 30) {
    return {
      alert: true,
      message: `PA expires in ${daysUntilExpiration} days. Submit renewal request.`,
      urgency: daysUntilExpiration <= 7 ? 'high' : 'medium'
    };
  }
  return { alert: false };
}
```

### **Adherence Tracking**
```javascript
function calculateAdherence(therapyHistory) {
  const therapy = therapyHistory[0];
  const expectedRefills = getExpectedRefills(therapy.startDate);
  const actualRefills = therapy.doses.length;
  
  return {
    adherenceRate: (actualRefills / expectedRefills) * 100,
    missedRefills: expectedRefills - actualRefills
  };
}
```

### **Refill Reminder System**
```javascript
function getRefillReminders(patients) {
  return patients
    .filter(p => p.therapyHistory?.length > 0)
    .map(p => {
      const therapy = p.therapyHistory[0];
      const nextDue = new Date(therapy.nextRefillDue);
      const today = new Date();
      const daysUntilDue = (nextDue - today) / (1000 * 60 * 60 * 24);
      
      if (daysUntilDue <= 7 && daysUntilDue >= 0) {
        return {
          patient: p.name,
          drug: therapy.drug,
          dueDate: therapy.nextRefillDue,
          pharmacy: therapy.pharmacy
        };
      }
    })
    .filter(Boolean);
}
```

---

## 📊 Example Scenarios

### **Scenario 1: Drug-Naive Patient**
```javascript
{
  therapyHistory: []  // Empty - never been on this medication
}
// System allows starting dose only
```

### **Scenario 2: Active Patient (Sarah Johnson)**
```javascript
{
  therapyHistory: [{
    drug: "Wegovy",
    currentDose: "2.4 mg",
    status: "active",
    paStatus: "approved",
    paExpirationDate: "2025-04-01"
  }]
}
// System allows continuation of 2.4mg OR progression to higher dose
// Skips maintenance criteria for continuation
```

### **Scenario 3: Patient with Expired PA**
```javascript
{
  therapyHistory: [{
    drug: "Wegovy",
    currentDose: "2.4 mg",
    status: "active",
    paStatus: "expired",  // ⚠️ PA expired
    paExpirationDate: "2024-09-01"
  }]
}
// System alerts: "PA expired. Submit renewal before next refill."
```

### **Scenario 4: Discontinued Therapy**
```javascript
{
  therapyHistory: [{
    drug: "Wegovy",
    currentDose: "1.7 mg",
    status: "discontinued",  // Stopped therapy
    responseToTherapy: "poor"
  }]
}
// System treats as new start if reinitiating
// Requires starting dose again
```

---

## 🚀 Integration Points

### **Current Features Using This Data:**
1. ✅ Dose progression validation
2. ✅ Continuation detection
3. ✅ Weight loss tracking
4. ✅ Phase-based criteria filtering
5. ✅ Active medication checks

### **Potential Features (With New Fields):**
6. ⏳ PA renewal alerts (30 days before expiration)
7. ⏳ Refill reminders (7 days before due)
8. ⏳ Adherence monitoring dashboard
9. ⏳ Pharmacy integration (auto-refill requests)
10. ⏳ Provider notifications (PA expirations)

---

## 📝 Adding New Therapy History

### **Template for New Entry:**
```javascript
{
  drug: "[Drug Name]",
  startDate: "[YYYY-MM-DD]",
  doses: [
    { 
      value: "[dose]", 
      startDate: "[YYYY-MM-DD]", 
      endDate: "[YYYY-MM-DD or null]", 
      phase: "starting|titration|maintenance" 
    }
  ],
  currentDose: "[current dose]",
  status: "active",
  responseToTherapy: "excellent|good|partial|poor|none",
  weightAtStart: { value: [number], units: "kg" },
  currentWeight: { value: [number], units: "kg" },
  weightLossAchieved: [percentage],
  initialApprovalDate: "[YYYY-MM-DD]",
  lastRefillDate: "[YYYY-MM-DD]",
  nextRefillDue: "[YYYY-MM-DD]",
  paStatus: "approved|pending|denied|expired",
  paExpirationDate: "[YYYY-MM-DD]",
  prescribingProvider: "[Provider name]",
  pharmacy: "[Pharmacy name and ID]"
}
```

---

## 🎯 Benefits of Enhanced Structure

| Benefit | Clinical Value | Administrative Value |
|---------|----------------|---------------------|
| **Dose tracking** | Validates safe progression | Ensures protocol compliance |
| **Weight outcomes** | Measures therapy efficacy | Supports PA approval |
| **PA status** | Prevents denied claims | Reduces billing rejections |
| **Refill dates** | Improves adherence | Enables proactive outreach |
| **Provider info** | Facilitates care coordination | Speeds PA processing |
| **Pharmacy data** | Streamlines refills | Reduces patient friction |

---

**Result:** Best-in-class therapy tracking combining clinical outcomes with administrative efficiency! 🎉
