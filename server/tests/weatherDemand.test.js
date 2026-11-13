import assert from 'node:assert/strict';
import {
  computeWeatherMultiplier,
  matchDemandGroups,
  buildWeatherStockAlerts,
  buildWeatherAlertNarrative,
  resolvePriority,
  getCalendarEventNotes,
  getPakistanNationalContext,
  HORIZON_DAYS,
} from '../utils/weatherDemand.js';
import { getPakistanSeasonalFallback } from '../services/weatherService.js';
import { containsNonEnglishNarrative } from '../services/geminiService.js';

function testHeatOrsUplift() {
  const item = {
    brandName: 'Electral ORS',
    genericName: 'Oral Rehydration Salts',
    category: 'ORS',
  };
  const weather = { temp: 41, humidity: 55, conditionMain: 'Clear', season: 'summer' };
  const { multiplier, reasons, groups } = computeWeatherMultiplier(item, weather, new Date('2026-07-10'));

  assert.ok(groups.includes('ors_electrolytes'));
  assert.ok(multiplier >= 1.5, `expected heat ORS multiplier >= 1.5, got ${multiplier}`);
  assert.ok(reasons.some((r) => /heat|humidity|rehydration|ors/i.test(r)));
}

function testWinterColdFluUplift() {
  const item = {
    brandName: 'Soscold',
    genericName: 'Cold & Flu Syrup',
    category: 'Cough & Cold',
  };
  const weather = { temp: 12, humidity: 60, conditionMain: 'Clouds', season: 'winter' };
  const { multiplier, groups } = computeWeatherMultiplier(item, weather, new Date('2026-01-15'));

  assert.ok(groups.includes('cold_flu'));
  assert.ok(multiplier >= 1.35, `expected winter cold/flu uplift, got ${multiplier}`);
}

function testMissingSeasonalMedicineAlert() {
  const items = [
    {
      _id: 'only-cream',
      brandName: 'Random Cream',
      genericName: 'Moisturizer',
      category: 'Skincare',
      currentStock: 50,
      forecastedDailyDemand: 1,
    },
  ];
  const weather = { temp: 40, humidity: 50, conditionMain: 'Clear', season: 'summer' };
  const { alerts, missingSeasonalMedicines, horizonDays } = buildWeatherStockAlerts(
    items,
    weather,
    new Date('2026-07-10')
  );

  assert.equal(horizonDays, 30);
  assert.ok(missingSeasonalMedicines.length > 0, 'expected missing seasonal medicines');
  const orsMissing = alerts.find((a) => a.type === 'missing' && /ors/i.test(a.brandName));
  assert.ok(orsMissing, 'ORS should be flagged as missing in summer');
  assert.ok(/not in stock/i.test(orsMissing.message || orsMissing.reasons.join(' ')));
  assert.ok(/dehydration|heat-related fluid loss/i.test(orsMissing.usedFor || ''));
  assert.ok(orsMissing.predictedNeed30Days > 0);
  assert.equal(orsMissing.orderQty, orsMissing.predictedNeed30Days);
}

function testReorderUses30DayHorizon() {
  const items = [
    {
      _id: '1',
      brandName: 'Panadol',
      genericName: 'Paracetamol',
      category: 'Pain Relievers',
      currentStock: 5,
      forecastedDailyDemand: 2,
      salesVelocity: 2,
    },
  ];
  const weather = { temp: 40, humidity: 50, conditionMain: 'Clear', season: 'summer' };
  const { alerts } = buildWeatherStockAlerts(items, weather, new Date('2026-07-10'));

  const panadol = alerts.find((a) => a.brandName === 'Panadol' && a.type === 'reorder');
  assert.ok(panadol, 'Panadol should appear as reorder alert');
  assert.ok(panadol.predictedNeed30Days >= HORIZON_DAYS, '30-day need should be substantial');
  assert.equal(panadol.orderQty, Math.max(0, panadol.predictedNeed30Days - 5));
  assert.ok(['critical', 'high', 'normal'].includes(panadol.priority));
}

function testPriorityLevels() {
  assert.equal(resolvePriority(20, 20, 0), 'critical');
  assert.equal(resolvePriority(15, 20, 5), 'critical');
  assert.equal(resolvePriority(8, 20, 12), 'high');
  assert.equal(resolvePriority(3, 20, 17), 'normal');
  assert.equal(resolvePriority(0, 10, 20), 'none');
}

function testMatchGroups() {
  const groups = matchDemandGroups({
    brandName: 'Redoxon',
    genericName: 'Vitamin C',
    category: 'Vitamins',
  });
  assert.ok(groups.includes('vitamin_c') || groups.includes('juices_vitamins'));
}

function testSeasonalFallbackAndEvents() {
  const summer = getPakistanSeasonalFallback(new Date('2026-07-01'));
  assert.ok(summer.temp >= 35);
  assert.equal(summer.source, 'seasonal_fallback');

  const notes = getCalendarEventNotes(new Date('2026-07-01'));
  assert.ok(notes.some((n) => n.id === 'summer'));
}

function testNationalContextInAlerts() {
  const { nationalContext, pakistanSeason } = buildWeatherStockAlerts(
    [],
    { temp: 39, humidity: 55, season: 'summer' },
    new Date('2026-07-10')
  );
  assert.equal(nationalContext.country, 'Pakistan');
  assert.ok(pakistanSeason.active.includes('summer'));
  assert.equal(nationalContext.planningHorizonDays, 30);
}

function testEnglishOnlyWeatherNarratives() {
  const nationalContext = getPakistanNationalContext(
    new Date('2026-07-10'),
    { temp: 40, season: 'summer' }
  );
  assert.match(
    nationalContext.planningNote,
    /Pakistan-wide summer heat — expect elevated demand for ORS, electrolytes, and fever medicines over the next 30 days/
  );
  assert.equal(containsNonEnglishNarrative(nationalContext.planningNote), false);

  const narrative = buildWeatherAlertNarrative({
    weather: { temp: 40, condition: 'Hot' },
    eventNotes: [
      { label: 'Summer heat (PK)' },
      { label: 'Monsoon (PK)' },
    ],
    alerts: [
      { type: 'missing', brandName: 'ORS / Electral' },
      { type: 'missing', brandName: 'Cough / Cold syrup' },
      { type: 'missing', brandName: 'Antihistamine' },
      { type: 'missing', brandName: 'Vitamin C' },
      { type: 'missing', brandName: 'Antifungal cream' },
      { type: 'reorder', brandName: 'Disprin', orderQty: 12 },
    ],
    city: 'Lahore',
    nationalContext,
    horizonDays: 30,
  });

  assert.match(narrative, /5 seasonal medicines are not in stock/);
  assert.match(narrative, /order recommended/);
  assert.match(narrative, /1 item is low for the next 30 days \(Disprin\)/);
  assert.equal(containsNonEnglishNarrative(narrative), false);
  assert.doesNotMatch(narrative, /garmi|aglay|mein nahi|order kar|tez rehti|stock mein/i);
}

function testRejectsRomanUrduNarratives() {
  assert.equal(
    containsNonEnglishNarrative(
      'Pakistan-wide garmi — aglay 30 din ORS, electrolytes aur fever medicines ki demand tez rehti hai.'
    ),
    true
  );
  assert.equal(
    containsNonEnglishNarrative(
      '5 seasonal medicine(s) stock mein nahi (ORS) — order kar do.'
    ),
    true
  );
  assert.equal(
    containsNonEnglishNarrative(
      'Lahore: 40°C, Hot. 5 seasonal medicines are not in stock (ORS) — order recommended.'
    ),
    false
  );
}

function run() {
  testHeatOrsUplift();
  testWinterColdFluUplift();
  testMissingSeasonalMedicineAlert();
  testReorderUses30DayHorizon();
  testPriorityLevels();
  testMatchGroups();
  testSeasonalFallbackAndEvents();
  testNationalContextInAlerts();
  testEnglishOnlyWeatherNarratives();
  testRejectsRomanUrduNarratives();
  console.log('Weather demand tests passed.');
}

run();
