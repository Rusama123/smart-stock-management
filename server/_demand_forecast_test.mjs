/**
 * Quick unit tests for demand forecasting logic.
 * Run: node server/_demand_forecast_test.mjs
 */
import {
  buildDailySeries,
  buildDemandForecast,
} from './utils/demandForecast.js';

function makeSales(dailyQtys) {
  const today = new Date();
  today.setHours(12, 0, 0, 0);
  const sales = [];
  dailyQtys.forEach((qty, idx) => {
    if (qty <= 0) return;
    const d = new Date(today);
    d.setDate(d.getDate() - (dailyQtys.length - 1 - idx));
    sales.push({ date: d, quantity: qty });
  });
  return sales;
}

const item = {
  brandName: 'Panadol',
  genericName: 'Paracetamol',
  category: 'Pain Relievers',
  currentStock: 100,
  unitPrice: 220,
  unitCost: 200,
};

// Rising trend: low early, high recent
const risingSales = makeSales([
  ...Array(60).fill(1),
  ...Array(30).fill(2),
  ...Array(30).fill(4),
]);

const rising = buildDemandForecast(item, risingSales);
console.log('Rising trend test:', {
  trend: rising.trend,
  salesVelocity: rising.salesVelocity,
  forecastedDailyDemand: rising.forecastedDailyDemand,
  daysRemaining: rising.daysRemaining,
  suggestedReorderQty: rising.suggestedReorderQty,
});

// Weekend-heavy pattern
const weekendSales = [];
const today = new Date();
for (let i = 119; i >= 0; i--) {
  const d = new Date(today);
  d.setDate(d.getDate() - i);
  const dow = d.getDay();
  const qty = dow === 0 || dow === 6 ? 8 : 2;
  weekendSales.push({ date: d, quantity: qty });
}
const weekend = buildDemandForecast(item, weekendSales);
console.log('Weekend seasonality:', {
  seasonalityNotes: weekend.seasonalityNotes,
  forecastedDailyDemand: weekend.forecastedDailyDemand,
});

// No sales
const none = buildDemandForecast(item, []);
console.log('No sales:', {
  dataQuality: none.dataQuality,
  daysRemaining: none.daysRemaining,
  forecastedDailyDemand: none.forecastedDailyDemand,
});

// Low stock critical
const criticalItem = { ...item, currentStock: 10 };
const critical = buildDemandForecast(criticalItem, risingSales);
console.log('Critical reorder:', {
  needsReorder: critical.needsReorder,
  suggestedReorderQty: critical.suggestedReorderQty,
});

let passed = 0;
const assert = (cond, msg) => {
  if (cond) { passed++; console.log('✓', msg); }
  else console.error('✗', msg);
};

assert(rising.trend === 'rising', 'detects rising trend');
assert(rising.forecastedDailyDemand > rising.salesVelocity, 'forecast higher than flat avg when rising');
assert(weekend.seasonalityNotes.includes('Weekend'), 'detects weekend pattern');
assert(none.dataQuality === 'insufficient', 'insufficient data flagged');
assert(critical.needsReorder === true, 'critical stock triggers reorder');
assert(critical.suggestedReorderQty >= 20, 'min reorder qty respected');

console.log(`\n${passed}/6 assertions passed`);
