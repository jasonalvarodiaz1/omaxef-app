// Real-world PA criteria for major insurance plans
// Based on 2024-2025 formulary requirements

export const drugCoverage = {
  "CVS Health (Aetna)": {
    "Wegovy": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$75-150",
      paRequired: true,
      stepTherapy: false,
      preferred: false,
      preferredAlternative: "Consider lifestyle modification first",
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "titration", duration: "Month 2" },
        { value: "1 mg", phase: "titration", duration: "Month 3" },
        { value: "1.7 mg", phase: "titration", duration: "Month 4" },
        { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
      ],
      
      paCriteria: [
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "BMI ≥30 kg/m², OR BMI ≥27 kg/m² with at least one weight-related comorbidity (Type 2 Diabetes, Hypertension, Dyslipidemia, Obstructive Sleep Apnea, Cardiovascular Disease)", 
          type: "bmi",
          critical: true
        },
        { 
          rule: "Documented participation in intensive behavioral therapy (IBT) or comprehensive lifestyle modification program for at least 3-6 months with minimal weight loss (<5%)", 
          type: "lifestyleModification",
          requiredDuration: 3,
          critical: true
        },
        { 
          rule: "Trial and documented failure (or intolerance/contraindication) of at least 2 conventional weight management strategies (e.g., diet modification, exercise program, behavioral counseling)", 
          type: "priorTherapies",
          minTrials: 2,
          critical: true
        },
        { 
          rule: "No contraindications: pregnancy, planning pregnancy, breastfeeding, personal/family history of medullary thyroid carcinoma (MTC), Multiple Endocrine Neoplasia syndrome type 2 (MEN 2), pancreatitis", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "Prescriber is an obesity specialist, endocrinologist, or provider experienced in weight management", 
          type: "prescriberQualification"
        },
        { 
          rule: "For CONTINUATION (doses >0.5 mg): Patient achieved ≥5% weight loss from baseline within first 12-16 weeks at maximum tolerated dose", 
          type: "weightLoss", 
          minPercentage: 5,
          timeframe: "12-16 weeks"
        },
        { 
          rule: "For MAINTENANCE (2.4 mg): Patient has maintained weight loss and continues lifestyle modifications", 
          type: "weightMaintained", 
          minPercentage: 5
        },
        { 
          rule: "Chart documentation includes: baseline weight, height, BMI, comorbidities, prior weight loss attempts with dates and outcomes, lifestyle modification plan", 
          type: "documentation"
        }
      ],
      
      evaluationRules: {
        starting: ["age", "bmi", "lifestyleModification", "priorTherapies", "contraindications", "prescriberQualification", "documentation"],
        titration: ["age", "bmi", "contraindications", "documentation"],
        maintenance: ["age", "bmi", "contraindications", "weightLoss", "weightMaintained", "documentation"]
      },
      
      reauthorizationRequired: "Every 6-12 months",
      note: "Aetna typically covers Wegovy with strict PA requirements. Denial rate is high (~40-60%) if criteria not met perfectly. Appeal success rate: ~30%."
    },
    
    "Ozempic": {
      covered: true,
      tier: "Tier 2 - Preferred Brand",
      copay: "$50-75",
      paRequired: true,
      stepTherapy: true,
      preferred: true,
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "maintenance", duration: "Month 2+" },
        { value: "1 mg", phase: "maintenance", duration: "If needed" },
        { value: "2 mg", phase: "maintenance", duration: "If needed" }
      ],
      
      paCriteria: [
        { 
          rule: "Patient has diagnosis of Type 2 Diabetes Mellitus (ICD-10: E11.x)", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "A1C ≥7% (or ≥8% for some plans) despite current therapy", 
          type: "labValue",
          labName: "A1C",
          minValue: 7.0,
          critical: true
        },
        { 
          rule: "Trial and failure (inadequate response or intolerance) of Metformin for at least 3 months (unless contraindicated)", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Documented cardiovascular disease (CVD) OR high cardiovascular risk (10-year ASCVD risk ≥10%) for CV indication", 
          type: "cvdRisk"
        },
        { 
          rule: "No contraindications: personal/family history of medullary thyroid carcinoma, MEN 2, pancreatitis, severe gastroparesis", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C reduction of ≥0.5% OR significant clinical benefit (weight loss, CV improvement) within 3-6 months", 
          type: "efficacy"
        },
        { 
          rule: "Chart documentation includes: diabetes diagnosis with ICD-10 code, baseline and current A1C, prior therapies tried with dates, CV risk assessment", 
          type: "documentation"
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "age", "labValue", "stepTherapy", "contraindications", "documentation"],
        maintenance: ["diagnosis", "age", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      note: "Preferred for Type 2 Diabetes. NOT approved for weight loss alone - will be denied if used off-label. Step therapy with metformin required."
    },
    
    "Mounjaro": {
      covered: true,
      tier: "Tier 2 - Preferred Brand",
      copay: "$50-75",
      paRequired: true,
      stepTherapy: true,
      preferred: true,
      
      doseSchedule: [
        { value: "2.5 mg", phase: "starting", duration: "Month 1" },
        { value: "5 mg", phase: "titration", duration: "Month 2" },
        { value: "7.5 mg", phase: "maintenance", duration: "Month 3+" },
        { value: "10 mg", phase: "maintenance", duration: "If needed" },
        { value: "12.5 mg", phase: "maintenance", duration: "If needed" },
        { value: "15 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Patient has diagnosis of Type 2 Diabetes Mellitus (ICD-10: E11.x)", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "A1C ≥7% despite current therapy", 
          type: "labValue",
          labName: "A1C",
          minValue: 7.0,
          critical: true
        },
        { 
          rule: "Trial and failure of Metformin AND one other diabetes medication (sulfonylurea, DPP-4 inhibitor, SGLT2 inhibitor) for at least 3 months each", 
          type: "stepTherapy",
          requiredMedications: ["Metformin", "Other diabetes med"],
          minDuration: 3,
          critical: true
        },
        { 
          rule: "No contraindications: personal/family history of medullary thyroid carcinoma, MEN 2, history of pancreatitis", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C reduction of ≥0.5% OR weight loss ≥3% within 3-6 months", 
          type: "efficacy"
        },
        { 
          rule: "Chart documentation includes: diabetes diagnosis, baseline A1C, prior medications with trial dates and outcomes, current weight", 
          type: "documentation"
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "age", "labValue", "stepTherapy", "contraindications", "documentation"],
        titration: ["diagnosis", "age", "contraindications", "documentation"],
        maintenance: ["diagnosis", "age", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      note: "Preferred for Type 2 Diabetes with excellent coverage. Requires step therapy. NOT approved for weight loss alone."
    },
    
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "NOT COVERED by most Aetna plans as of 2024. May require medical exception appeal. Consider Wegovy as alternative."
    }
  },
  
  "UnitedHealthcare PPO": {
    "Wegovy": {
      covered: true,
      tier: "Tier 4 - Specialty",
      copay: "$100-200 or 25-33% coinsurance",
      paRequired: true,
      stepTherapy: false,
      preferred: false,
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "titration", duration: "Month 2" },
        { value: "1 mg", phase: "titration", duration: "Month 3" },
        { value: "1.7 mg", phase: "titration", duration: "Month 4" },
        { value: "2.4 mg", phase: "maintenance", duration: "Month 5+" }
      ],
      
      paCriteria: [
        { 
          rule: "Patient is 18 years or older (12+ for pediatric indication)", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "BMI ≥30 kg/m² (adults) OR BMI ≥27 kg/m² with ≥1 weight-related comorbidity OR BMI ≥95th percentile for age/sex (pediatric)", 
          type: "bmi",
          critical: true
        },
        { 
          rule: "Documented participation in comprehensive lifestyle intervention program (diet, exercise, behavioral counseling) for ≥6 months with <5% weight loss", 
          type: "lifestyleModification",
          requiredDuration: 6,
          maxWeightLoss: 5,
          critical: true
        },
        { 
          rule: "Trial of at least 2 other weight loss medications OR documented contraindication/intolerance to alternatives (Phentermine, Contrave, Orlistat)", 
          type: "priorTherapies",
          minTrials: 2,
          critical: true
        },
        { 
          rule: "Prescriber must be Board Certified in Endocrinology, Bariatrics, or Internal Medicine with documented obesity management experience", 
          type: "prescriberQualification",
          critical: true
        },
        { 
          rule: "No contraindications: pregnancy, breastfeeding, MTC history, MEN 2, severe GI disease, diabetic retinopathy complications", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION (after 16 weeks): ≥5% weight loss from baseline OR significant improvement in weight-related comorbidities", 
          type: "weightLoss", 
          minPercentage: 5,
          timeframe: "16 weeks"
        },
        { 
          rule: "For MAINTENANCE: Continued weight loss or maintenance of weight loss with ongoing lifestyle modifications", 
          type: "weightMaintained", 
          minPercentage: 5
        },
        { 
          rule: "Comprehensive chart documentation: baseline vitals, BMI chart, comorbidities with ICD-10 codes, lifestyle program details with dates, prior medication trials with outcomes, treatment plan", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["age", "bmi", "lifestyleModification", "priorTherapies", "prescriberQualification", "contraindications", "documentation"],
        titration: ["age", "bmi", "contraindications", "documentation"],
        maintenance: ["age", "bmi", "contraindications", "weightLoss", "weightMaintained", "documentation"]
      },
      
      reauthorizationRequired: "Every 6 months initially, then annually",
      quantityLimits: "4 pens per 28 days",
      note: "UHC has VERY strict PA criteria. High denial rate (~50-70%). Requires specialty pharmacy. Appeals often needed. Document EVERYTHING."
    },
    
    "Ozempic": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$75-100",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      preferredAlternative: "Trulicity, Victoza",
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "maintenance", duration: "Month 2+" },
        { value: "1 mg", phase: "maintenance", duration: "If needed" },
        { value: "2 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Diagnosis of Type 2 Diabetes Mellitus with documented ICD-10 code (E11.x)", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "A1C ≥8% (UHC requires higher threshold) within past 90 days", 
          type: "labValue",
          labName: "A1C",
          minValue: 8.0,
          critical: true
        },
        { 
          rule: "Trial and inadequate response to Metformin (max tolerated dose) for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial and inadequate response to ONE additional oral agent (sulfonylurea, DPP-4i, SGLT2i, TZD) for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Second oral agent",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of preferred GLP-1 (Trulicity or Victoza) OR documented contraindication/intolerance", 
          type: "stepTherapy",
          preferredAlternatives: ["Trulicity", "Victoza"],
          critical: true
        },
        { 
          rule: "No contraindications: MTC, MEN 2, severe renal impairment (eGFR <30), pancreatitis", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C improvement ≥1% OR reduction to <8% within 6 months", 
          type: "efficacy"
        },
        { 
          rule: "Chart notes with diabetes diagnosis, baseline and follow-up A1C values, prior medication list with dates and doses, adherence documentation", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "age", "labValue", "stepTherapy", "contraindications", "documentation"],
        maintenance: ["diagnosis", "age", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      quantityLimits: "2 pens per 28 days",
      note: "Non-preferred - MUST try Trulicity/Victoza first. Very strict step therapy. Off-label use for weight loss will be DENIED."
    },
    
    "Mounjaro": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$75-100",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      
      doseSchedule: [
        { value: "2.5 mg", phase: "starting", duration: "Month 1" },
        { value: "5 mg", phase: "titration", duration: "Month 2" },
        { value: "7.5 mg", phase: "maintenance", duration: "Month 3+" },
        { value: "10 mg", phase: "maintenance", duration: "If needed" },
        { value: "12.5 mg", phase: "maintenance", duration: "If needed" },
        { value: "15 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Diagnosis of Type 2 Diabetes Mellitus (ICD-10: E11.x)", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "A1C ≥8% within past 90 days", 
          type: "labValue",
          labName: "A1C",
          minValue: 8.0,
          critical: true
        },
        { 
          rule: "Trial of Metformin at maximum tolerated dose for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of at least 2 other oral diabetes medications OR 1 oral + 1 GLP-1 agonist for ≥3 months each", 
          type: "stepTherapy",
          minTrials: 2,
          minDuration: 3,
          critical: true
        },
        { 
          rule: "No contraindications: MTC, MEN 2, pancreatitis history, severe GI disease", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C reduction ≥1% OR A1C <8% within 6 months", 
          type: "efficacy"
        },
        { 
          rule: "Complete documentation of diabetes diagnosis, baseline labs, medication trials with outcomes", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "age", "labValue", "stepTherapy", "contraindications", "documentation"],
        titration: ["diagnosis", "age", "contraindications", "documentation"],
        maintenance: ["diagnosis", "age", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      quantityLimits: "4 pens per 28 days",
      note: "Requires extensive step therapy. High denial rate if step therapy not documented properly."
    },
    
    "Zepbound": {
      covered: true,
      tier: "Tier 4 - Specialty",
      copay: "$150-250 or 30-40% coinsurance",
      paRequired: true,
      stepTherapy: false,
      preferred: false,
      
      doseSchedule: [
        { value: "2.5 mg", phase: "starting", duration: "Month 1" },
        { value: "5 mg", phase: "titration", duration: "Month 2" },
        { value: "7.5 mg", phase: "titration", duration: "Month 3" },
        { value: "10 mg", phase: "maintenance", duration: "Month 4+" },
        { value: "12.5 mg", phase: "maintenance", duration: "If needed" },
        { value: "15 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Patient is 18 years or older", 
          type: "age", 
          minAge: 18,
          critical: true
        },
        { 
          rule: "BMI ≥30 kg/m² OR BMI ≥27 kg/m² with weight-related comorbidity", 
          type: "bmi",
          critical: true
        },
        { 
          rule: "Documented 6-month lifestyle modification program with <5% weight loss", 
          type: "lifestyleModification",
          requiredDuration: 6,
          critical: true
        },
        { 
          rule: "Trial of Wegovy OR documented contraindication/intolerance", 
          type: "priorTherapies",
          preferredAlternative: "Wegovy",
          critical: true
        },
        { 
          rule: "Prescriber specialization in obesity/endocrinology", 
          type: "prescriberQualification",
          critical: true
        },
        { 
          rule: "No contraindications: pregnancy, MTC, MEN 2, pancreatitis", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: ≥5% weight loss within 16 weeks", 
          type: "weightLoss", 
          minPercentage: 5,
          timeframe: "16 weeks"
        },
        { 
          rule: "Comprehensive documentation required", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["age", "bmi", "lifestyleModification", "priorTherapies", "prescriberQualification", "contraindications", "documentation"],
        titration: ["age", "bmi", "contraindications", "documentation"],
        maintenance: ["age", "bmi", "contraindications", "weightLoss", "documentation"]
      },
      
      reauthorizationRequired: "Every 6 months",
      quantityLimits: "4 pens per 28 days",
      note: "NEW medication - coverage is limited. Must try Wegovy first. Very expensive. High denial rate. Consider manufacturer copay assistance."
    }
  },
  
  "Medicare Part D": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "NOT COVERED - Medicare Part D explicitly excludes weight loss medications per federal law. Patient must pay out-of-pocket (~$1,300-1,500/month) or use manufacturer assistance."
    },
    
    "Ozempic": {
      covered: true,
      tier: "Tier 3 - Preferred Brand",
      copay: "$47-100 (during initial coverage), $0-8 (after coverage gap)",
      paRequired: true,
      stepTherapy: true,
      preferred: true,
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "maintenance", duration: "Month 2+" },
        { value: "1 mg", phase: "maintenance", duration: "If needed" },
        { value: "2 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Documented diagnosis of Type 2 Diabetes Mellitus", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Medicare beneficiary (age 65+ OR disability)", 
          type: "age", 
          minAge: 65
        },
        { 
          rule: "A1C ≥7.5% despite current therapy", 
          type: "labValue",
          labName: "A1C",
          minValue: 7.5,
          critical: true
        },
        { 
          rule: "Trial of Metformin for ≥3 months (unless contraindicated due to renal function)", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of at least 1 sulfonylurea for ≥3 months (unless contraindicated)", 
          type: "stepTherapy",
          requiredMedication: "Sulfonylurea",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "No contraindications: eGFR <30, MTC, MEN 2", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C improvement OR CV benefit within 6 months", 
          type: "efficacy"
        },
        { 
          rule: "Documentation of diabetes diagnosis code, labs, prior medication trials", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "labValue", "stepTherapy", "contraindications", "documentation"],
        maintenance: ["diagnosis", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Annual",
      note: "ONLY covered for Type 2 Diabetes - NOT for weight loss. Off-label use will be denied. Must meet step therapy requirements."
    },
    
    "Mounjaro": {
      covered: true,
      tier: "Tier 3 - Non-Preferred Brand",
      copay: "$47-100",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      preferredAlternative: "Ozempic, Trulicity",
      
      doseSchedule: [
        { value: "2.5 mg", phase: "starting", duration: "Month 1" },
        { value: "5 mg", phase: "titration", duration: "Month 2" },
        { value: "7.5 mg", phase: "maintenance", duration: "Month 3+" },
        { value: "10 mg", phase: "maintenance", duration: "If needed" },
        { value: "12.5 mg", phase: "maintenance", duration: "If needed" },
        { value: "15 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Type 2 Diabetes diagnosis", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "A1C ≥8% within past 90 days", 
          type: "labValue",
          labName: "A1C",
          minValue: 8.0,
          critical: true
        },
        { 
          rule: "Trial of Metformin for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of sulfonylurea for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Sulfonylurea",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of preferred GLP-1 (Ozempic, Trulicity, or Victoza) OR contraindication", 
          type: "stepTherapy",
          preferredAlternatives: ["Ozempic", "Trulicity", "Victoza"],
          critical: true
        },
        { 
          rule: "No contraindications: eGFR <30, pancreatitis, MTC, MEN 2", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C reduction ≥1%", 
          type: "efficacy"
        },
        { 
          rule: "Complete medication trial documentation", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "labValue", "stepTherapy", "contraindications", "documentation"],
        titration: ["diagnosis", "contraindications", "documentation"],
        maintenance: ["diagnosis", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Annual",
      note: "Non-preferred - must fail Ozempic or other GLP-1 first. Medicare requires extensive step therapy documentation."
    },
    
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "NOT COVERED - Indicated for weight loss only. Medicare Part D does not cover weight loss medications. Patient must pay out-of-pocket."
    }
  },
  
  "UnitedHealthcare Medicare Advantage": {
    "Wegovy": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "NOT COVERED - Weight loss medications excluded from Medicare coverage by federal law. Some MA plans MAY cover as supplemental benefit - check specific plan."
    },
    
    "Ozempic": {
      covered: true,
      tier: "Tier 3 - Preferred Specialty",
      copay: "$47 (Tier 3) or $0 (if Extra Help/LIS)",
      paRequired: true,
      stepTherapy: true,
      preferred: true,
      
      doseSchedule: [
        { value: "0.25 mg", phase: "starting", duration: "Month 1" },
        { value: "0.5 mg", phase: "maintenance", duration: "Month 2+" },
        { value: "1 mg", phase: "maintenance", duration: "If needed" },
        { value: "2 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Type 2 Diabetes Mellitus diagnosis with ICD-10 code", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "Medicare Advantage beneficiary (age 65+ OR disabled)", 
          type: "age"
        },
        { 
          rule: "A1C ≥8% within past 3 months", 
          type: "labValue",
          labName: "A1C",
          minValue: 8.0,
          critical: true
        },
        { 
          rule: "Trial of Metformin (max dose or max tolerated) for ≥90 days", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of 1 additional oral agent (sulfonylurea, DPP-4i, or SGLT2i) for ≥90 days", 
          type: "stepTherapy",
          minTrials: 1,
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Documented cardiovascular disease OR CV risk factors for CV indication", 
          type: "cvdRisk"
        },
        { 
          rule: "No contraindications: eGFR <30, gastroparesis, MTC, MEN 2", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: Clinical improvement (A1C reduction ≥0.5% OR CV benefit)", 
          type: "efficacy"
        },
        { 
          rule: "Documentation: diabetes diagnosis, baseline A1C, medication trial log with dates/doses/outcomes", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "labValue", "stepTherapy", "contraindications", "documentation"],
        maintenance: ["diagnosis", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      quantityLimits: "2 pens per 28 days",
      note: "Preferred GLP-1 for Medicare Advantage. Coverage better than traditional Medicare Part D. Still requires step therapy. NO coverage for weight loss."
    },
    
    "Mounjaro": {
      covered: true,
      tier: "Tier 4 - Non-Preferred Specialty",
      copay: "$100 or 33% coinsurance",
      paRequired: true,
      stepTherapy: true,
      preferred: false,
      preferredAlternative: "Ozempic",
      
      doseSchedule: [
        { value: "2.5 mg", phase: "starting", duration: "Month 1" },
        { value: "5 mg", phase: "titration", duration: "Month 2" },
        { value: "7.5 mg", phase: "maintenance", duration: "Month 3+" },
        { value: "10 mg", phase: "maintenance", duration: "If needed" },
        { value: "12.5 mg", phase: "maintenance", duration: "If needed" },
        { value: "15 mg", phase: "maintenance", duration: "Max dose" }
      ],
      
      paCriteria: [
        { 
          rule: "Type 2 Diabetes diagnosis", 
          type: "diagnosis",
          requiredDiagnosis: "Type 2 Diabetes",
          critical: true
        },
        { 
          rule: "A1C ≥8% within 90 days", 
          type: "labValue",
          labName: "A1C",
          minValue: 8.0,
          critical: true
        },
        { 
          rule: "Trial of Metformin for ≥3 months", 
          type: "stepTherapy",
          requiredMedication: "Metformin",
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of at least 2 other oral agents for ≥3 months each", 
          type: "stepTherapy",
          minTrials: 2,
          minDuration: 3,
          critical: true
        },
        { 
          rule: "Trial of preferred GLP-1 (Ozempic) for ≥3 months OR documented intolerance/contraindication", 
          type: "stepTherapy",
          preferredAlternatives: ["Ozempic"],
          minDuration: 3,
          critical: true
        },
        { 
          rule: "No contraindications: severe renal impairment, pancreatitis, MTC", 
          type: "contraindications",
          critical: true
        },
        { 
          rule: "For CONTINUATION: A1C improvement ≥1% within 6 months", 
          type: "efficacy"
        },
        { 
          rule: "Extensive documentation of all prior therapies with outcomes", 
          type: "documentation",
          critical: true
        }
      ],
      
      evaluationRules: {
        starting: ["diagnosis", "labValue", "stepTherapy", "contraindications", "documentation"],
        titration: ["diagnosis", "contraindications", "documentation"],
        maintenance: ["diagnosis", "contraindications", "efficacy", "documentation"]
      },
      
      reauthorizationRequired: "Every 12 months",
      quantityLimits: "4 pens per 28 days",
      note: "Non-preferred - MUST fail Ozempic first. Very strict step therapy. Higher copay. Appeals often necessary."
    },
    
    "Zepbound": {
      covered: false,
      tier: "Not Covered",
      copay: "N/A",
      paRequired: false,
      stepTherapy: false,
      preferred: false,
      note: "NOT COVERED - Weight loss indication not covered by Medicare. Patient pays out-of-pocket (~$1,000+/month)."
    }
  }
};