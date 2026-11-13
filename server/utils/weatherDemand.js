/**
 * Weather + Pakistan season/events → 30-day stock alerts.
 * Includes missing seasonal medicines with professional English advisories.
 */

export const HORIZON_DAYS = 30;

const RAMADAN_WINDOWS = [
  { start: '2024-03-11', end: '2024-04-09' },
  { start: '2025-03-01', end: '2025-03-30' },
  { start: '2026-02-18', end: '2026-03-19' },
  { start: '2027-02-08', end: '2027-03-09' },
];

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

/** Eid-ul-Fitr: ~3 days after Ramadan end; Eid-ul-Adha: ~70 days after Ramadan start */
function buildEidWindows() {
  const windows = [];
  for (const ramadan of RAMADAN_WINDOWS) {
    const fitrStart = new Date(ramadan.end);
    fitrStart.setDate(fitrStart.getDate() + 1);
    const fitrEnd = new Date(fitrStart);
    fitrEnd.setDate(fitrEnd.getDate() + 3);
    windows.push({
      type: 'eid_fitr',
      start: toDateKey(fitrStart),
      end: toDateKey(fitrEnd),
    });

    const adhaStart = new Date(ramadan.start);
    adhaStart.setDate(adhaStart.getDate() + 70);
    const adhaEnd = new Date(adhaStart);
    adhaEnd.setDate(adhaEnd.getDate() + 3);
    windows.push({
      type: 'eid_adha',
      start: toDateKey(adhaStart),
      end: toDateKey(adhaEnd),
    });
  }
  return windows;
}

const EID_WINDOWS = buildEidWindows();

const DEMAND_GROUPS = {
  ors_electrolytes: {
    keywords: [
      'ors', 'electrolyte', 'rehydration', 'oral rehydration', 'pedialyte',
      'electral', 'whisol', 'orsal', 'hydrate', 'zinc ors', 'nimkol', 'glucose-d',
      'glucose d', 'normal saline oral',
    ],
    categories: ['ors', 'electrolyte', 'rehydration'],
  },
  pain_fever: {
    keywords: [
      'paracetamol', 'acetaminophen', 'panadol', 'calpol', 'ibuprofen',
      'fever', 'analgesic', 'pain', 'disprin', 'aspirin', 'brufen', 'ponstan',
      'nuberol', 'febrol', 'pyrex', 'acetaminophen',
    ],
    categories: ['pain', 'fever', 'analgesic', 'pain relievers', 'nsaid'],
  },
  digestive: {
    keywords: [
      'digestive', 'antacid', 'omeprazole', 'gaviscon', 'laxative', 'diarrhea',
      'diarrhoea', 'entox', 'flagyl', 'imodium', 'risek', 'motilium', 'buscopan',
      'eno', 'digestine', 'castor', 'domperidone', 'probiotic', 'enterogermina',
    ],
    categories: ['digestive', 'gastro', 'antacid', 'gi'],
  },
  cold_flu: {
    keywords: [
      'cough', 'cold', 'flu', 'syrup', 'expectorant', 'decongestant', 'mucolite',
      'soscold', 'tixylix', 'benylin', 'strepsils', 'lozenge', 'phenylephrine',
      'pseudoephedrine', 'corex', 'hydryllin', 'aventyl',
    ],
    categories: ['cold', 'cough', 'flu', 'respiratory'],
  },
  vitamin_c: {
    keywords: [
      'vitamin c', 'ascorbic', 'cecon', 'redoxon', 'limcee', 'c-vit', 'citravite',
    ],
    categories: ['vitamins', 'supplements', 'vitamin'],
  },
  antibiotics: {
    keywords: [
      'antibiotic', 'amoxicillin', 'augmentin', 'azithromycin', 'ciprofloxacin',
      'cef', 'flagyl', 'metronidazole', 'erythromycin', 'clarithromycin',
    ],
    categories: ['antibiotics', 'antibiotic'],
  },
  juices_vitamins: {
    keywords: [
      'juice', 'vitamin', 'supplement', 'multivitamin', 'energy', 'glucose',
      'rooh afza', 'jam-e-shirin', 'ensure', 'glucovita',
    ],
    categories: ['vitamins', 'supplements', 'juice', 'nutrition'],
  },
  travel_firstaid: {
    keywords: [
      'travel', 'motion', 'sickness', 'dramamine', 'dimenhydrinate', 'gravinate',
      'bandage', 'first aid', 'plaster', 'antiseptic', 'betadine', 'savlon',
      'cotton', 'gauze',
    ],
    categories: ['first aid', 'bandage', 'travel', 'antiseptic'],
  },
  antifungal: {
    keywords: [
      'antifungal', 'clotrimazole', 'canesten', 'lamisil', 'terbinafine',
      'ketoconazole', 'nystatin', 'ringworm', 'athlete',
    ],
    categories: ['antifungal', 'dermatology', 'skin'],
  },
  mosquito_dengue: {
    keywords: [
      'mosquito', 'dengue', 'repellent', 'citronella', 'insect', 'coil',
      'mospel', 'off lotion',
    ],
    categories: ['repellent', 'insect', 'mosquito'],
  },
  antihistamine: {
    keywords: [
      'antihistamine', 'cetirizine', 'loratadine', 'fexofenadine', 'allegra',
      'xyzal', 'telfast', 'avile', 'pheniramine', 'piriton',
    ],
    categories: ['antihistamine', 'allergy'],
  },
  heat_skin: {
    keywords: [
      'prickly heat', 'calamine', 'heat rash', 'talcum', 'cooling powder',
      'burnol', 'sunburn', 'aloe vera', 'sunscreen', 'after sun',
    ],
    categories: ['dermatology', 'skin', 'sunscreen', 'topical'],
  },
  eye_care: {
    keywords: [
      'eye drop', 'eyedrop', 'artificial tear', 'refresh tears', 'lubricating eye',
      'optive', 'systane',
    ],
    categories: ['eye care', 'ophthalmic', 'eye'],
  },
};

/**
 * Curated Pakistan seasonal medicine catalog.
 * Each entry is checked against pharmacy inventory; missing → alert.
 * `usedFor` is shown in the Action column (English use description).
 */
export const SEASONAL_MEDICINE_CATALOG = [
  // —— Summer / monsoon essentials ——
  {
    id: 'ors_electral',
    name: 'ORS / Electral',
    genericHint: 'Oral rehydration salts',
    usedFor: 'Used for dehydration and heat-related fluid loss',
    seasons: ['summer', 'monsoon', 'ramadan'],
    keywords: ['ors', 'electral', 'electrolyte', 'rehydration', 'nimkol', 'whisol', 'pedialyte', 'orsal'],
    categories: ['ors', 'electrolyte', 'rehydration'],
    demandGroup: 'ors_electrolytes',
    suggestedDaily: 2,
  },
  {
    id: 'glucose_d',
    name: 'Glucose-D / Energy sachets',
    genericHint: 'Glucose with electrolytes',
    usedFor: 'Used for energy replacement and mild dehydration in hot weather',
    seasons: ['summer', 'monsoon', 'ramadan'],
    keywords: ['glucose-d', 'glucose d', 'glucovita', 'energy sachet', 'glucose'],
    categories: ['ors', 'electrolyte', 'nutrition'],
    demandGroup: 'ors_electrolytes',
    suggestedDaily: 1.5,
  },
  {
    id: 'paracetamol',
    name: 'Paracetamol / Panadol',
    genericHint: 'Paracetamol',
    usedFor: 'Used for fever, headaches, and heat-related body aches',
    seasons: ['summer', 'winter', 'monsoon', 'ramadan'],
    keywords: ['paracetamol', 'panadol', 'acetaminophen', 'calpol', 'febrol', 'pyrex'],
    categories: ['pain', 'fever', 'analgesic', 'pain relievers'],
    demandGroup: 'pain_fever',
    suggestedDaily: 3,
  },
  {
    id: 'ibuprofen',
    name: 'Ibuprofen / Brufen',
    genericHint: 'Ibuprofen',
    usedFor: 'Used for inflammation, pain, and fever when paracetamol alone is insufficient',
    seasons: ['summer', 'winter', 'monsoon'],
    keywords: ['ibuprofen', 'brufen', 'nsaid', 'nuberol'],
    categories: ['pain', 'fever', 'analgesic', 'nsaid'],
    demandGroup: 'pain_fever',
    suggestedDaily: 1.5,
  },
  {
    id: 'antacid',
    name: 'Antacid / Digestive',
    genericHint: 'Antacid',
    usedFor: 'Used for acidity, heartburn, and indigestion common in hot weather',
    seasons: ['summer', 'ramadan', 'monsoon'],
    keywords: ['antacid', 'gaviscon', 'omeprazole', 'risek', 'eno', 'digestine', 'motilium'],
    categories: ['digestive', 'gastro', 'antacid', 'gi'],
    demandGroup: 'digestive',
    suggestedDaily: 1.5,
  },
  {
    id: 'anti_diarrheal',
    name: 'Anti-diarrheal',
    genericHint: 'Loperamide / anti-diarrheal',
    usedFor: 'Used for acute diarrhea and summer food-borne stomach upset',
    seasons: ['summer', 'monsoon'],
    keywords: ['diarrhea', 'diarrhoea', 'imodium', 'entox', 'loperamide'],
    categories: ['digestive', 'gastro', 'gi'],
    demandGroup: 'digestive',
    suggestedDaily: 1,
  },
  {
    id: 'flagyl_gi',
    name: 'Metronidazole / Flagyl',
    genericHint: 'Metronidazole',
    usedFor: 'Used for intestinal infections and amebic dysentery (prescription as required)',
    seasons: ['summer', 'monsoon'],
    keywords: ['flagyl', 'metronidazole', 'amebic', 'dysentery'],
    categories: ['antibiotics', 'digestive', 'gi'],
    demandGroup: 'digestive',
    suggestedDaily: 0.8,
  },
  {
    id: 'zinc_diarrhea',
    name: 'Zinc sulfate (diarrhea)',
    genericHint: 'Zinc sulfate',
    usedFor: 'Used with ORS to shorten diarrhea duration, especially in children',
    seasons: ['summer', 'monsoon'],
    keywords: ['zinc sulfate', 'zinc ors', 'zinc tablet', 'zinc syrup'],
    categories: ['ors', 'supplements', 'vitamins'],
    demandGroup: 'ors_electrolytes',
    suggestedDaily: 1,
  },
  {
    id: 'probiotic',
    name: 'Probiotic / Enterogermina',
    genericHint: 'Probiotic',
    usedFor: 'Used to restore gut flora after diarrhea or antibiotic use',
    seasons: ['summer', 'monsoon'],
    keywords: ['probiotic', 'enterogermina', 'lactobacillus', 'saccharomyces'],
    categories: ['digestive', 'gastro', 'gi'],
    demandGroup: 'digestive',
    suggestedDaily: 1,
  },
  {
    id: 'anti_nausea',
    name: 'Anti-nausea / Domperidone',
    genericHint: 'Domperidone / Motilium',
    usedFor: 'Used for nausea, vomiting, and heat-related stomach discomfort',
    seasons: ['summer', 'monsoon', 'ramadan'],
    keywords: ['domperidone', 'motilium', 'antiemetic', 'vomit'],
    categories: ['digestive', 'gastro', 'gi'],
    demandGroup: 'digestive',
    suggestedDaily: 1,
  },
  {
    id: 'prickly_heat',
    name: 'Prickly heat / Calamine',
    genericHint: 'Calamine / cooling powder',
    usedFor: 'Used for heat rash, prickly heat, and mild summer skin irritation',
    seasons: ['summer'],
    keywords: ['prickly heat', 'calamine', 'heat rash', 'cooling powder', 'talcum'],
    categories: ['dermatology', 'skin', 'topical'],
    demandGroup: 'heat_skin',
    suggestedDaily: 1.2,
  },
  {
    id: 'sunscreen',
    name: 'Sunscreen / After-sun',
    genericHint: 'Sunscreen SPF',
    usedFor: 'Used for UV protection and relief of mild sunburn',
    seasons: ['summer'],
    keywords: ['sunscreen', 'sun block', 'sunblock', 'after sun', 'aloe vera gel', 'sunburn'],
    categories: ['dermatology', 'skin', 'sunscreen'],
    demandGroup: 'heat_skin',
    suggestedDaily: 0.8,
  },
  {
    id: 'burn_cream',
    name: 'Burn cream / Burnol',
    genericHint: 'Antiseptic burn cream',
    usedFor: 'Used for minor burns and heat-related skin injury',
    seasons: ['summer'],
    keywords: ['burnol', 'burn cream', 'silver sulfadiazine', 'burn ointment'],
    categories: ['dermatology', 'skin', 'first aid'],
    demandGroup: 'heat_skin',
    suggestedDaily: 0.5,
  },
  {
    id: 'eye_drops_summer',
    name: 'Lubricating eye drops',
    genericHint: 'Artificial tears',
    usedFor: 'Used for dry, dusty, or irritated eyes in hot and windy weather',
    seasons: ['summer', 'monsoon'],
    keywords: ['eye drop', 'eyedrop', 'artificial tear', 'refresh tears', 'systane', 'optive'],
    categories: ['eye care', 'ophthalmic', 'eye'],
    demandGroup: 'eye_care',
    suggestedDaily: 0.8,
  },
  {
    id: 'oral_saline',
    name: 'Normal saline (nasal / wound)',
    genericHint: 'Normal saline',
    usedFor: 'Used for nasal irrigation, wound cleaning, and dust-related irritation',
    seasons: ['summer', 'monsoon'],
    keywords: ['normal saline', 'saline solution', 'nasal saline', 'nacl 0.9'],
    categories: ['first aid', 'antiseptic'],
    demandGroup: 'travel_firstaid',
    suggestedDaily: 0.6,
  },
  {
    id: 'hand_antiseptic',
    name: 'Antiseptic / Savlon / Betadine',
    genericHint: 'Antiseptic',
    usedFor: 'Used for wound cleaning and hygiene during monsoon infections',
    seasons: ['summer', 'monsoon'],
    keywords: ['savlon', 'betadine', 'antiseptic', 'povidone', 'hand sanitizer'],
    categories: ['first aid', 'antiseptic'],
    demandGroup: 'travel_firstaid',
    suggestedDaily: 0.8,
  },
  {
    id: 'cough_cold',
    name: 'Cough / Cold syrup',
    genericHint: 'Cough & cold',
    usedFor: 'Used for cough, cold, and seasonal respiratory symptoms',
    seasons: ['winter', 'monsoon'],
    keywords: ['cough', 'cold', 'flu', 'mucolite', 'soscold', 'tixylix', 'benylin', 'corex', 'hydryllin'],
    categories: ['cold', 'cough', 'flu', 'respiratory'],
    demandGroup: 'cold_flu',
    suggestedDaily: 2,
  },
  {
    id: 'vitamin_c',
    name: 'Vitamin C',
    genericHint: 'Ascorbic acid',
    usedFor: 'Used for immune support during seasonal changes and infections',
    seasons: ['winter', 'ramadan', 'monsoon', 'summer'],
    keywords: ['vitamin c', 'ascorbic', 'redoxon', 'cecon', 'limcee'],
    categories: ['vitamins', 'supplements', 'vitamin'],
    demandGroup: 'vitamin_c',
    suggestedDaily: 1.5,
  },
  {
    id: 'antihistamine',
    name: 'Antihistamine',
    genericHint: 'Cetirizine / loratadine',
    usedFor: 'Used for allergies, dust sensitivity, and monsoon-related itching',
    seasons: ['winter', 'monsoon', 'summer'],
    keywords: ['antihistamine', 'cetirizine', 'loratadine', 'allegra', 'fexofenadine', 'avile'],
    categories: ['antihistamine', 'allergy'],
    demandGroup: 'antihistamine',
    suggestedDaily: 1,
  },
  {
    id: 'antibiotics_mild',
    name: 'Common antibiotics',
    genericHint: 'Amoxicillin / azithromycin',
    usedFor: 'Used for bacterial infections when prescribed by a clinician',
    seasons: ['winter', 'monsoon'],
    keywords: ['amoxicillin', 'augmentin', 'azithromycin', 'ciprofloxacin', 'antibiotic'],
    categories: ['antibiotics', 'antibiotic'],
    demandGroup: 'antibiotics',
    suggestedDaily: 1,
  },
  {
    id: 'antifungal',
    name: 'Antifungal cream',
    genericHint: 'Clotrimazole / terbinafine',
    usedFor: 'Used for fungal skin infections common in humid monsoon weather',
    seasons: ['monsoon', 'summer'],
    keywords: ['antifungal', 'clotrimazole', 'canesten', 'lamisil', 'terbinafine'],
    categories: ['antifungal', 'dermatology', 'skin'],
    demandGroup: 'antifungal',
    suggestedDaily: 0.8,
  },
  {
    id: 'mosquito_repellent',
    name: 'Mosquito / dengue OTC',
    genericHint: 'Insect repellent',
    usedFor: 'Used to reduce mosquito bites and dengue-season exposure risk',
    seasons: ['monsoon', 'summer'],
    keywords: ['mosquito', 'repellent', 'dengue', 'mospel', 'citronella'],
    categories: ['repellent', 'insect', 'mosquito'],
    demandGroup: 'mosquito_dengue',
    suggestedDaily: 0.5,
  },
  {
    id: 'juices_vitamins',
    name: 'Juices / Multivitamins',
    genericHint: 'Multivitamin / energy drink',
    usedFor: 'Used for hydration support and vitamin intake during fasting and heat',
    seasons: ['ramadan', 'summer'],
    keywords: ['juice', 'multivitamin', 'rooh afza', 'glucose', 'jam-e-shirin', 'vitamin'],
    categories: ['vitamins', 'supplements', 'juice', 'nutrition'],
    demandGroup: 'juices_vitamins',
    suggestedDaily: 2,
  },
  {
    id: 'travel_sickness',
    name: 'Travel sickness (Gravinate)',
    genericHint: 'Dimenhydrinate',
    usedFor: 'Used for motion sickness and travel-related nausea',
    seasons: ['eid'],
    keywords: ['gravinate', 'dimenhydrinate', 'dramamine', 'motion', 'travel sickness'],
    categories: ['travel', 'first aid'],
    demandGroup: 'travel_firstaid',
    suggestedDaily: 1,
  },
  {
    id: 'first_aid',
    name: 'First-aid / Bandages',
    genericHint: 'Bandage / first-aid',
    usedFor: 'Used for minor cuts, travel injuries, and emergency wound care',
    seasons: ['eid', 'summer'],
    keywords: ['bandage', 'plaster', 'first aid', 'gauze', 'cotton wool'],
    categories: ['first aid', 'bandage', 'antiseptic'],
    demandGroup: 'travel_firstaid',
    suggestedDaily: 0.8,
  },
];

function isInWindow(date, windows) {
  const t = new Date(date).getTime();
  return windows.some((w) => {
    const start = new Date(w.start).getTime();
    const end = new Date(w.end).getTime();
    return t >= start && t <= end;
  });
}

function getActiveEid(date) {
  const t = new Date(date).getTime();
  return EID_WINDOWS.find((w) => {
    const start = new Date(w.start).getTime();
    const end = new Date(w.end).getTime();
    return t >= start && t <= end;
  }) || null;
}

/**
 * Resolve Pakistan season id(s) for catalog filtering.
 */
export function resolvePakistanSeason(referenceDate = new Date(), weather = {}) {
  const month = referenceDate.getMonth() + 1;
  const seasons = [];

  if (month >= 4 && month <= 9) seasons.push('summer');
  if (month === 12 || month <= 2) seasons.push('winter');
  if (month >= 7 && month <= 10) seasons.push('monsoon');
  if (month === 3 || month === 11) {
    if (!seasons.includes('summer') && !seasons.includes('winter')) {
      seasons.push(month === 3 ? 'spring' : 'autumn');
    }
  }

  if (weather.season === 'summer' && !seasons.includes('summer')) seasons.push('summer');
  if (weather.season === 'winter' && !seasons.includes('winter')) seasons.push('winter');
  if (weather.season === 'monsoon' && !seasons.includes('monsoon')) seasons.push('monsoon');

  if (isInWindow(referenceDate, RAMADAN_WINDOWS)) seasons.push('ramadan');
  if (getActiveEid(referenceDate)) seasons.push('eid');

  let primary = 'mild';
  if (seasons.includes('ramadan')) primary = 'ramadan';
  else if (seasons.includes('eid')) primary = 'eid';
  else if (seasons.includes('summer') && (month >= 5 && month <= 8)) primary = 'summer';
  else if (seasons.includes('winter')) primary = 'winter';
  else if (seasons.includes('monsoon')) primary = 'monsoon';
  else if (seasons.includes('summer')) primary = 'summer';

  return { primary, active: [...new Set(seasons)] };
}

export function getPakistanNationalContext(referenceDate = new Date(), weather = {}) {
  const { primary, active } = resolvePakistanSeason(referenceDate, weather);
  const month = referenceDate.getMonth() + 1;

  const seasonLabels = {
    summer: 'Pakistan summer heat',
    winter: 'Pakistan winter / flu season',
    monsoon: 'Monsoon / humid season',
    ramadan: 'Ramadan',
    eid: 'Eid travel season',
    spring: 'Spring transition',
    autumn: 'Autumn transition',
    mild: 'Mild season',
  };

  let planningNote = `Plan seasonal medicines for the next ${HORIZON_DAYS} days.`;
  if (primary === 'summer') {
    planningNote = `Pakistan-wide summer heat — expect elevated demand for ORS, electrolytes, and fever medicines over the next ${HORIZON_DAYS} days.`;
  } else if (primary === 'winter') {
    planningNote = `Pakistan-wide cold season — keep cough, cold, Vitamin C, and fever medicines stocked for the next ${HORIZON_DAYS} days.`;
  } else if (primary === 'monsoon') {
    planningNote = 'Monsoon — cold/flu, antifungal, and mosquito-related OTC demand may rise.';
  } else if (primary === 'ramadan') {
    planningNote = 'Ramadan — digestive aids, juices/ORS, and vitamins typically see higher demand.';
  } else if (primary === 'eid') {
    planningNote = 'Eid — keep travel-sickness and first-aid supplies ready.';
  }

  return {
    country: 'Pakistan',
    season: primary,
    seasonLabel: seasonLabels[primary] || primary,
    activeSeasons: active,
    month,
    planningHorizonDays: HORIZON_DAYS,
    planningNote,
    majorCities: ['Lahore', 'Karachi', 'Islamabad', 'Peshawar', 'Quetta'],
  };
}

export function getCalendarEventNotes(referenceDate = new Date()) {
  const notes = [];
  const month = referenceDate.getMonth() + 1;

  if (isInWindow(referenceDate, RAMADAN_WINDOWS)) {
    notes.push({
      id: 'ramadan',
      label: 'Ramadan',
      detail: 'Iftar/sehri period — higher demand for juices, digestive aids, and vitamins.',
    });
  }

  const eid = getActiveEid(referenceDate);
  if (eid) {
    notes.push({
      id: eid.type,
      label: eid.type === 'eid_fitr' ? 'Eid-ul-Fitr' : 'Eid-ul-Adha',
      detail: 'Travel and gatherings — uplift in travel-sickness and first-aid needs.',
    });
  }

  if (month >= 4 && month <= 9) {
    notes.push({
      id: 'summer',
      label: 'Summer heat (PK)',
      detail: 'Pakistan summer — ORS, electrolytes, and fever medicines typically rise.',
    });
  }
  if (month === 12 || month <= 2) {
    notes.push({
      id: 'winter',
      label: 'Winter (PK)',
      detail: 'Cold season — cough, cold, flu, and vitamin C demand usually increases.',
    });
  }
  if (month >= 7 && month <= 10) {
    notes.push({
      id: 'monsoon',
      label: 'Monsoon (PK)',
      detail: 'Humidity/rain — cold/flu, antifungal, and mosquito OTC demand.',
    });
  }

  return notes;
}

function itemHaystack(item = {}) {
  return [
    item.brandName,
    item.genericName,
    item.category,
  ].filter(Boolean).join(' ').toLowerCase();
}

function matchesKeywords(haystack, keywords = [], categories = []) {
  const byKeyword = keywords.some((k) => haystack.includes(String(k).toLowerCase()));
  const byCategory = categories.some((c) => haystack.includes(String(c).toLowerCase()));
  return byKeyword || byCategory;
}

export function matchDemandGroups(item = {}) {
  const haystack = itemHaystack(item);
  const matched = [];
  for (const [groupId, def] of Object.entries(DEMAND_GROUPS)) {
    if (matchesKeywords(haystack, def.keywords, def.categories)) matched.push(groupId);
  }
  return matched;
}

export function findInventoryMatch(items = [], catalogEntry) {
  const matches = [];
  for (const item of items) {
    const haystack = itemHaystack(item);
    if (matchesKeywords(haystack, catalogEntry.keywords, catalogEntry.categories)) {
      matches.push(item);
    }
  }
  return matches;
}

export function computeWeatherMultiplier(item, weather = {}, referenceDate = new Date()) {
  const groups = matchDemandGroups(item);
  if (groups.length === 0) {
    return { multiplier: 1, reasons: [], groups: [] };
  }

  const temp = Number(weather.temp);
  const humidity = Number(weather.humidity);
  const conditionMain = String(weather.conditionMain || weather.condition || '').toLowerCase();
  const month = referenceDate.getMonth() + 1;
  const reasons = [];
  let multiplier = 1;

  const isHeat = (Number.isFinite(temp) && temp >= 35)
    || weather.season === 'summer'
    || (month >= 4 && month <= 9);
  const isHighHumidity = Number.isFinite(humidity) && humidity >= 65;
  const isCold = (Number.isFinite(temp) && temp <= 18)
    || weather.season === 'winter'
    || month === 12
    || month <= 2;
  const isRain = ['rain', 'drizzle', 'thunderstorm'].some((c) => conditionMain.includes(c))
    || weather.season === 'monsoon'
    || (month >= 7 && month <= 10);

  const has = (...ids) => ids.some((id) => groups.includes(id));

  if (isHeat || isHighHumidity) {
    if (has('ors_electrolytes')) {
      multiplier = Math.max(multiplier, 1.55);
      reasons.push(isHeat ? 'Heat — ORS/electrolytes high demand' : 'Humidity — rehydration uplift');
    }
    if (has('pain_fever')) {
      multiplier = Math.max(multiplier, 1.35);
      reasons.push('Heat/fever — pain & fever medicines uplift');
    }
    if (has('digestive')) {
      multiplier = Math.max(multiplier, 1.25);
      reasons.push('Heat — digestive aids uplift');
    }
    if (has('heat_skin')) {
      multiplier = Math.max(multiplier, 1.3);
      reasons.push('Heat — skin / sun-care uplift');
    }
    if (has('eye_care')) {
      multiplier = Math.max(multiplier, 1.2);
      reasons.push('Heat/dust — eye-care uplift');
    }
  }

  if (isCold) {
    if (has('cold_flu')) {
      multiplier = Math.max(multiplier, 1.4);
      reasons.push('Cold season — cough & cold uplift');
    }
    if (has('vitamin_c') || has('juices_vitamins')) {
      multiplier = Math.max(multiplier, 1.25);
      reasons.push('Winter — vitamin C / supplements uplift');
    }
    if (has('antibiotics')) {
      multiplier = Math.max(multiplier, 1.15);
      reasons.push('Winter — mild antibiotics uplift');
    }
    if (has('pain_fever')) {
      multiplier = Math.max(multiplier, 1.2);
      reasons.push('Winter — fever medicines uplift');
    }
    if (has('antihistamine')) {
      multiplier = Math.max(multiplier, 1.2);
      reasons.push('Winter — allergy / antihistamine uplift');
    }
  }

  if (isRain) {
    if (has('cold_flu')) {
      multiplier = Math.max(multiplier, 1.25);
      reasons.push('Monsoon/rain — cold/flu uplift');
    }
    if (has('antifungal')) {
      multiplier = Math.max(multiplier, 1.3);
      reasons.push('Monsoon — antifungal uplift');
    }
    if (has('mosquito_dengue')) {
      multiplier = Math.max(multiplier, 1.35);
      reasons.push('Monsoon — mosquito/dengue OTC uplift');
    }
  }

  if (isInWindow(referenceDate, RAMADAN_WINDOWS)) {
    if (has('juices_vitamins') || has('vitamin_c')) {
      multiplier = Math.max(multiplier, 1.35);
      reasons.push('Ramadan — juices/vitamins uplift');
    }
    if (has('digestive')) {
      multiplier = Math.max(multiplier, 1.3);
      reasons.push('Ramadan — digestive aids uplift');
    }
    if (has('ors_electrolytes')) {
      multiplier = Math.max(multiplier, 1.2);
      reasons.push('Ramadan — ORS uplift');
    }
  }

  if (getActiveEid(referenceDate)) {
    if (has('travel_firstaid')) {
      multiplier = Math.max(multiplier, 1.25);
      reasons.push('Eid — travel sickness / first-aid uplift');
    }
  }

  return {
    multiplier: parseFloat(multiplier.toFixed(3)),
    reasons: [...new Set(reasons)],
    groups,
  };
}

export function resolvePriority(orderQty, predictedNeed, currentStock) {
  if (orderQty <= 0) return 'none';
  if (currentStock <= 0) return 'critical';
  const coverage = predictedNeed > 0 ? currentStock / predictedNeed : 1;
  if (coverage < 0.35 || orderQty >= predictedNeed * 0.7) return 'critical';
  if (coverage < 0.7 || orderQty >= 10) return 'high';
  return 'normal';
}

/**
 * Build 30-day weather/season alerts including missing catalog medicines.
 */
export function buildWeatherStockAlerts(items = [], weather = {}, referenceDate = new Date()) {
  const eventNotes = getCalendarEventNotes(referenceDate);
  const pakistanSeason = resolvePakistanSeason(referenceDate, weather);
  const nationalContext = getPakistanNationalContext(referenceDate, weather);
  const alerts = [];
  const missingSeasonalMedicines = [];
  const seenItemIds = new Set();

  const activeCatalog = SEASONAL_MEDICINE_CATALOG.filter((entry) =>
    entry.seasons.some((s) => pakistanSeason.active.includes(s))
  );

  for (const entry of activeCatalog) {
    const matches = findInventoryMatch(items, entry);
    const { multiplier, reasons } = computeWeatherMultiplier(
      {
        brandName: entry.name,
        genericName: entry.keywords[0],
        category: entry.categories[0],
      },
      weather,
      referenceDate
    );

    if (matches.length === 0) {
      const suggestedDaily = entry.suggestedDaily * Math.max(multiplier, 1.15);
      const predictedNeed30Days = Math.ceil(suggestedDaily * HORIZON_DAYS);
      const alert = {
        _id: `missing:${entry.id}`,
        type: 'missing',
        catalogId: entry.id,
        brandName: entry.name,
        genericName: entry.genericHint || entry.name,
        category: 'Seasonal essential',
        usedFor: entry.usedFor,
        currentStock: 0,
        forecastedDailyDemand: 0,
        weatherMultiplier: multiplier,
        adjustedDailyDemand: parseFloat(suggestedDaily.toFixed(3)),
        predictedNeed30Days,
        predictedNeed7Days: Math.ceil(suggestedDaily * 7),
        orderQty: predictedNeed30Days,
        priority: 'critical',
        reasons: [
          'Not in stock — seasonal essential for current conditions',
          ...reasons.slice(0, 1),
        ],
        demandGroups: entry.demandGroup ? [entry.demandGroup] : [],
        message: `${entry.name} is not in stock`,
      };
      alerts.push(alert);
      missingSeasonalMedicines.push({
        id: entry.id,
        name: entry.name,
        usedFor: entry.usedFor,
        message: alert.message,
        suggestedOrderQty: predictedNeed30Days,
        seasons: entry.seasons.filter((s) => pakistanSeason.active.includes(s)),
      });
      continue;
    }

    for (const item of matches) {
      const itemId = String(item._id);
      if (seenItemIds.has(itemId)) continue;
      seenItemIds.add(itemId);

      const itemMult = computeWeatherMultiplier(item, weather, referenceDate);
      const baseDaily = Math.max(
        0,
        Number(item.forecastedDailyDemand ?? item.salesVelocity ?? 0)
      );
      const effectiveDaily = baseDaily > 0
        ? baseDaily
        : entry.suggestedDaily;
      const adjustedDaily = effectiveDaily * Math.max(itemMult.multiplier, 1);
      const predictedNeed30Days = Math.ceil(adjustedDaily * HORIZON_DAYS);
      const currentStock = Math.max(0, Number(item.currentStock) || 0);
      const orderQty = Math.max(0, predictedNeed30Days - currentStock);

      if (orderQty <= 0) {
        continue;
      }

      const priority = resolvePriority(orderQty, predictedNeed30Days, currentStock);
      alerts.push({
        _id: item._id,
        type: 'reorder',
        catalogId: entry.id,
        brandName: item.brandName,
        genericName: item.genericName,
        category: item.category,
        usedFor: entry.usedFor,
        currentStock,
        forecastedDailyDemand: parseFloat(baseDaily.toFixed(3)),
        weatherMultiplier: itemMult.multiplier,
        adjustedDailyDemand: parseFloat(adjustedDaily.toFixed(3)),
        predictedNeed30Days,
        predictedNeed7Days: Math.ceil(adjustedDaily * 7),
        orderQty,
        priority: priority === 'none' ? 'normal' : priority,
        reasons: itemMult.reasons.length
          ? itemMult.reasons
          : [`Stock below predicted need for the next ${HORIZON_DAYS} days`],
        demandGroups: itemMult.groups,
        message: `${item.brandName}: low stock — order ${orderQty} more for ${HORIZON_DAYS} days`,
      });
    }
  }

  for (const item of items) {
    const itemId = String(item._id);
    if (seenItemIds.has(itemId)) continue;

    const { multiplier, reasons, groups } = computeWeatherMultiplier(item, weather, referenceDate);
    if (groups.length === 0 || (multiplier <= 1.05 && reasons.length === 0)) continue;

    const baseDaily = Math.max(
      0,
      Number(item.forecastedDailyDemand ?? item.salesVelocity ?? 0)
    );
    const effectiveDaily = baseDaily > 0 ? baseDaily : 0.5;
    const adjustedDaily = effectiveDaily * multiplier;
    const predictedNeed30Days = Math.ceil(adjustedDaily * HORIZON_DAYS);
    const currentStock = Math.max(0, Number(item.currentStock) || 0);
    const orderQty = Math.max(0, predictedNeed30Days - currentStock);

    if (orderQty <= 0) continue;

    const priority = resolvePriority(orderQty, predictedNeed30Days, currentStock);
    if (priority === 'none') continue;

    seenItemIds.add(itemId);
    alerts.push({
      _id: item._id,
      type: 'reorder',
      catalogId: null,
      brandName: item.brandName,
      genericName: item.genericName,
      category: item.category,
      usedFor: reasons[0] || 'Seasonal demand uplift based on weather conditions',
      currentStock,
      forecastedDailyDemand: parseFloat(baseDaily.toFixed(3)),
      weatherMultiplier: multiplier,
      adjustedDailyDemand: parseFloat(adjustedDaily.toFixed(3)),
      predictedNeed30Days,
      predictedNeed7Days: Math.ceil(adjustedDaily * 7),
      orderQty,
      priority,
      reasons,
      demandGroups: groups,
      message: `${item.brandName}: order ${orderQty} more for next ${HORIZON_DAYS} days`,
    });
  }

  const priorityOrder = { critical: 0, high: 1, normal: 2 };
  const typeOrder = { missing: 0, reorder: 1, ok: 2 };
  alerts.sort((a, b) => {
    const t = (typeOrder[a.type] ?? 9) - (typeOrder[b.type] ?? 9);
    if (t !== 0) return t;
    const p = (priorityOrder[a.priority] ?? 9) - (priorityOrder[b.priority] ?? 9);
    if (p !== 0) return p;
    return b.orderQty - a.orderQty;
  });

  return {
    alerts,
    eventNotes,
    missingSeasonalMedicines,
    pakistanSeason,
    nationalContext,
    horizonDays: HORIZON_DAYS,
  };
}

export function buildWeatherAlertNarrative({
  weather,
  eventNotes,
  alerts,
  city,
  nationalContext,
  horizonDays = HORIZON_DAYS,
}) {
  const temp = weather?.temp != null ? `${weather.temp}°C` : 'N/A';
  const condition = weather?.condition || weather?.description || 'seasonal conditions';
  const seasonBit = nationalContext?.seasonLabel
    ? ` ${nationalContext.seasonLabel}.`
    : '';
  const events = eventNotes.map((e) => e.label).join(', ');
  const eventBit = events ? ` Active: ${events}.` : '';

  const missing = alerts.filter((a) => a.type === 'missing');
  const reorder = alerts.filter((a) => a.type === 'reorder' && a.orderQty > 0);

  if (missing.length === 0 && reorder.length === 0) {
    return `${city || 'Pakistan'}: ${temp}, ${condition}.${seasonBit}${eventBit} Seasonal stock looks adequate for the next ${horizonDays} days.`;
  }

  const parts = [];
  if (missing.length > 0) {
    const names = missing.slice(0, 3).map((a) => a.brandName).join(', ');
    const medPhrase = missing.length === 1
      ? '1 seasonal medicine is not in stock'
      : `${missing.length} seasonal medicines are not in stock`;
    parts.push(`${medPhrase} (${names}) — order recommended`);
  }
  if (reorder.length > 0) {
    const names = reorder.slice(0, 3).map((a) => a.brandName).join(', ');
    const itemPhrase = reorder.length === 1
      ? `1 item is low for the next ${horizonDays} days`
      : `${reorder.length} items are low for the next ${horizonDays} days`;
    parts.push(`${itemPhrase} (${names})`);
  }

  return `${city || 'Pakistan'}: ${temp}, ${condition}.${seasonBit}${eventBit} ${parts.join('. ')}.`;
}
