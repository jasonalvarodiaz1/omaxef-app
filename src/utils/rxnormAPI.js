/**
 * RxNorm API Integration for Drug Information
 * Provides standardized drug data to improve coverage determination accuracy
 */

const RXNORM_BASE_URL = 'https://rxnav.nlm.nih.gov/REST';

// Cache for API responses to reduce redundant calls
const rxnormCache = new Map();

/**
 * Health check for RxNorm API availability
 */
export async function checkRxNormHealth() {
  try {
    const response = await fetch(
      `${RXNORM_BASE_URL}/version.json`,
      { 
        method: 'GET',
        signal: AbortSignal.timeout(3000) // 3 second timeout
      }
    );
    return response.ok;
  } catch (error) {
    console.error('RxNorm health check failed:', error);
    return false;
  }
}

/**
 * Wrapper for safe RxNorm calls with fallback
 */
export async function safeRxNormCall(apiFunction, ...args) {
  try {
    const result = await apiFunction(...args);
    return { success: true, data: result };
  } catch (error) {
    console.error('RxNorm API call failed:', error);
    return { success: false, error: error.message };
  }
}

/**
 * Get RxCUI (RxNorm Concept Unique Identifier) for a drug name
 * @param {string} drugName - Name of the drug to search
 * @returns {Promise<Object>} RxCUI and related information
 */
export async function getRxCUI(drugName) {
  const cacheKey = `rxcui_${drugName.toLowerCase()}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${RXNORM_BASE_URL}/rxcui.json?name=${encodeURIComponent(drugName)}&search=2`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxNorm API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract RxCUI from response
    const rxcui = data.idGroup?.rxnormId?.[0];
    
    const result = {
      rxcui,
      drugName,
      found: !!rxcui
    };
    
    rxnormCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching RxCUI:', error);
    return { rxcui: null, drugName, found: false, error: error.message };
  }
}

/**
 * Get detailed drug properties including ingredients, strength, and form
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @returns {Promise<Object>} Detailed drug properties
 */
export async function getDrugProperties(rxcui) {
  if (!rxcui) return null;
  
  const cacheKey = `props_${rxcui}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${RXNORM_BASE_URL}/rxcui/${rxcui}/properties.json`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxNorm API error: ${response.status}`);
    }

    const data = await response.json();
    const props = data.properties;
    
    const result = {
      rxcui,
      name: props?.name,
      synonym: props?.synonym,
      tty: props?.tty, // Term type (e.g., SCD, SBD)
      language: props?.language,
      suppress: props?.suppress,
      umlscui: props?.umlscui
    };
    
    rxnormCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching drug properties:', error);
    return null;
  }
}

/**
 * Get drug strength and dosage form information
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @returns {Promise<Object>} Strength and form information
 */
export async function getDrugStrength(rxcui) {
  if (!rxcui) return null;
  
  const cacheKey = `strength_${rxcui}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${RXNORM_BASE_URL}/rxcui/${rxcui}/allrelated.json`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxNorm API error: ${response.status}`);
    }

    const data = await response.json();
    const allRelated = data.allRelatedGroup?.conceptGroup || [];
    
    // Find strength and dose form
    let strength = null;
    let doseForm = null;
    let ingredient = null;
    
    for (const group of allRelated) {
      if (group.tty === 'SCDF') {
        // Strength and dose form
        strength = group.conceptProperties?.[0]?.name;
      } else if (group.tty === 'DF') {
        // Dose form
        doseForm = group.conceptProperties?.[0]?.name;
      } else if (group.tty === 'IN') {
        // Ingredient
        ingredient = group.conceptProperties?.[0]?.name;
      }
    }
    
    const result = {
      rxcui,
      strength,
      doseForm,
      ingredient
    };
    
    rxnormCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching drug strength:', error);
    return null;
  }
}

/**
 * Get therapeutic drug classes from RxNorm/RxClass
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @returns {Promise<Array>} Therapeutic classes
 */
export async function getDrugClasses(rxcui) {
  if (!rxcui) return [];
  
  const cacheKey = `class_${rxcui}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `https://rxnav.nlm.nih.gov/REST/rxclass/class/byRxcui.json?rxcui=${rxcui}&relaSource=ATC`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxClass API error: ${response.status}`);
    }

    const data = await response.json();
    const classes = [];
    
    if (data.rxclassDrugInfoList?.rxclassDrugInfo) {
      for (const info of data.rxclassDrugInfoList.rxclassDrugInfo) {
        classes.push({
          classId: info.rxclassMinConceptItem?.classId,
          className: info.rxclassMinConceptItem?.className,
          classType: info.rxclassMinConceptItem?.classType
        });
      }
    }
    
    rxnormCache.set(cacheKey, classes);
    return classes;
  } catch (error) {
    console.error('Error fetching drug classes:', error);
    return [];
  }
}

/**
 * Get interaction information for combinations like GLP-1/GIP
 * @param {string} rxcui - RxNorm Concept Unique Identifier
 * @returns {Promise<Object>} Interaction and combination information
 */
export async function getDrugInteractions(rxcui) {
  if (!rxcui) return null;
  
  const cacheKey = `interactions_${rxcui}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    const response = await fetch(
      `${RXNORM_BASE_URL}/interaction/interaction.json?rxcui=${rxcui}`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxNorm Interaction API error: ${response.status}`);
    }

    const data = await response.json();
    const interactions = [];
    
    if (data.interactionTypeGroup) {
      for (const group of data.interactionTypeGroup) {
        for (const interaction of group.interactionType || []) {
          interactions.push({
            severity: interaction.severity,
            description: interaction.description,
            interactingDrug: interaction.interactionPair?.[0]?.interactionConcept?.[1]?.sourceConceptItem?.name
          });
        }
      }
    }
    
    const result = {
      rxcui,
      hasInteractions: interactions.length > 0,
      interactions
    };
    
    rxnormCache.set(cacheKey, result);
    return result;
  } catch (error) {
    console.error('Error fetching drug interactions:', error);
    return { rxcui, hasInteractions: false, interactions: [] };
  }
}

/**
 * Get available dose forms and strengths for a drug
 * @param {string} drugName - Generic drug name
 * @returns {Promise<Array>} Available formulations
 */
export async function getAvailableFormulations(drugName) {
  const cacheKey = `formulations_${drugName.toLowerCase()}`;
  
  if (rxnormCache.has(cacheKey)) {
    return rxnormCache.get(cacheKey);
  }

  try {
    // First get the ingredient
    const response = await fetch(
      `${RXNORM_BASE_URL}/drugs.json?name=${encodeURIComponent(drugName)}`,
      {
        signal: AbortSignal.timeout(5000) // 5 second timeout
      }
    );
    
    if (!response.ok) {
      throw new Error(`RxNorm API error: ${response.status}`);
    }

    const data = await response.json();
    const drugs = data.drugGroup?.conceptGroup || [];
    const formulations = [];
    
    for (const group of drugs) {
      if (group.tty === 'SCD' || group.tty === 'SBD') {
        // Semantic Clinical Drug or Semantic Branded Drug
        for (const prop of group.conceptProperties || []) {
          // Parse strength from name
          const strengthMatch = prop.name.match(/(\d+\.?\d*\s*(mg|mcg|ml))/i);
          
          formulations.push({
            rxcui: prop.rxcui,
            name: prop.name,
            strength: strengthMatch ? strengthMatch[1] : null,
            type: group.tty,
            synonym: prop.synonym
          });
        }
      }
    }
    
    rxnormCache.set(cacheKey, formulations);
    return formulations;
  } catch (error) {
    console.error('Error fetching formulations:', error);
    return [];
  }
}

/**
 * Normalize drug name and dose using RxNorm
 * @param {string} drugName - Input drug name
 * @param {string} dose - Input dose
 * @returns {Promise<Object>} Normalized drug information
 */
export async function normalizeDrugAndDose(drugName, dose) {
  try {
    // Get RxCUI for the drug
    const rxcuiData = await getRxCUI(drugName);
    
    if (!rxcuiData.found) {
      // Try brand name mappings
      const brandMappings = {
        'Wegovy': 'semaglutide',
        'Ozempic': 'semaglutide',
        'Zepbound': 'tirzepatide',
        'Mounjaro': 'tirzepatide',
        'Saxenda': 'liraglutide',
        'Victoza': 'liraglutide',
        'Contrave': 'bupropion/naltrexone',
        'Qsymia': 'phentermine/topiramate'
      };
      
      const genericName = brandMappings[drugName];
      if (genericName) {
        const genericRxcui = await getRxCUI(genericName);
        if (genericRxcui.found) {
          rxcuiData.rxcui = genericRxcui.rxcui;
          rxcuiData.found = true;
          rxcuiData.genericName = genericName;
        }
      }
    }
    
    if (!rxcuiData.found) {
      return {
        normalized: false,
        drugName,
        dose,
        error: 'Drug not found in RxNorm'
      };
    }
    
    // Get drug properties and strength
    const [properties, strength, classes] = await Promise.all([
      getDrugProperties(rxcuiData.rxcui),
      getDrugStrength(rxcuiData.rxcui),
      getDrugClasses(rxcuiData.rxcui)
    ]);
    
    // Normalize dose format
    const normalizedDose = normalizeDoseFormat(dose, strength?.strength);
    
    return {
      normalized: true,
      rxcui: rxcuiData.rxcui,
      drugName: properties?.name || drugName,
      genericName: rxcuiData.genericName || strength?.ingredient,
      dose: normalizedDose,
      originalDose: dose,
      strength: strength?.strength,
      doseForm: strength?.doseForm,
      therapeuticClasses: classes,
      isGLP1: classes.some(c => 
        c.className?.toLowerCase().includes('glp-1') ||
        c.className?.toLowerCase().includes('glucagon-like peptide')
      ),
      isGIP: classes.some(c => 
        c.className?.toLowerCase().includes('gip') ||
        c.className?.toLowerCase().includes('glucose-dependent insulinotropic')
      )
    };
  } catch (error) {
    console.error('Error normalizing drug and dose:', error);
    return {
      normalized: false,
      drugName,
      dose,
      error: error.message
    };
  }
}

/**
 * Normalize dose format for consistent comparison
 * @param {string} dose - Input dose string
 * @param {string} referenceStrength - Reference strength from RxNorm
 * @returns {string} Normalized dose string
 */
function normalizeDoseFormat(dose, referenceStrength) {
  if (!dose) return dose;
  
  // Remove extra spaces and standardize units
  let normalized = dose.trim().toLowerCase();
  
  // Standardize separators
  normalized = normalized.replace(/\s+/g, ' ');
  
  // Standardize units
  normalized = normalized.replace(/mcg/gi, 'mcg');
  normalized = normalized.replace(/mg/gi, 'mg');
  normalized = normalized.replace(/ml/gi, 'mL');
  
  // Extract numeric value
  const numericMatch = normalized.match(/(\d+\.?\d*)/);
  const unitMatch = normalized.match(/(mg|mcg|ml)/i);
  
  if (numericMatch && unitMatch) {
    return `${numericMatch[1]} ${unitMatch[1]}`;
  }
  
  return dose;
}

/**
 * Get FDA approval status and indications
 * Note: This would typically require FDA Orange Book API integration
 * For now, returns mock data based on known approvals
 */
export async function getFDAApprovalInfo(drugName, indication = 'weight management') {
  // This is a simplified version - in production, integrate with FDA Orange Book API
  const approvals = {
    'semaglutide': {
      'weight management': {
        approved: true,
        brandName: 'Wegovy',
        approvalDate: '2021-06-04',
        maxDose: '2.4 mg weekly'
      },
      'diabetes': {
        approved: true,
        brandName: 'Ozempic',
        approvalDate: '2017-12-05',
        maxDose: '2 mg weekly'
      }
    },
    'tirzepatide': {
      'weight management': {
        approved: true,
        brandName: 'Zepbound',
        approvalDate: '2023-11-08',
        maxDose: '15 mg weekly'
      },
      'diabetes': {
        approved: true,
        brandName: 'Mounjaro',
        approvalDate: '2022-05-13',
        maxDose: '15 mg weekly'
      }
    },
    'liraglutide': {
      'weight management': {
        approved: true,
        brandName: 'Saxenda',
        approvalDate: '2014-12-23',
        maxDose: '3 mg daily'
      },
      'diabetes': {
        approved: true,
        brandName: 'Victoza',
        approvalDate: '2010-01-25',
        maxDose: '1.8 mg daily'
      }
    },
    'bupropion/naltrexone': {
      'weight management': {
        approved: true,
        brandName: 'Contrave',
        approvalDate: '2014-09-10',
        maxDose: '32 mg/360 mg daily'
      }
    },
    'phentermine/topiramate': {
      'weight management': {
        approved: true,
        brandName: 'Qsymia',
        approvalDate: '2012-07-17',
        maxDose: '15 mg/92 mg daily'
      }
    }
  };
  
  const genericName = await getGenericName(drugName);
  const drugApprovals = approvals[genericName?.toLowerCase()];
  
  if (drugApprovals && drugApprovals[indication]) {
    return {
      approved: true,
      ...drugApprovals[indication]
    };
  }
  
  return {
    approved: false,
    indication,
    drugName
  };
}

/**
 * Get generic name from brand name
 * @param {string} brandName - Brand name of drug
 * @returns {Promise<string>} Generic name
 */
async function getGenericName(brandName) {
  const brandToGeneric = {
    'Wegovy': 'semaglutide',
    'Ozempic': 'semaglutide',
    'Zepbound': 'tirzepatide',
    'Mounjaro': 'tirzepatide',
    'Saxenda': 'liraglutide',
    'Victoza': 'liraglutide',
    'Contrave': 'bupropion/naltrexone',
    'Qsymia': 'phentermine/topiramate'
  };
  
  return brandToGeneric[brandName] || brandName;
}

/**
 * Clear the cache (useful for testing or memory management)
 */
export function clearRxNormCache() {
  rxnormCache.clear();
}

// Export all functions
export default {
  getRxCUI,
  getDrugProperties,
  getDrugStrength,
  getDrugClasses,
  getDrugInteractions,
  getAvailableFormulations,
  normalizeDrugAndDose,
  getFDAApprovalInfo,
  clearRxNormCache
};