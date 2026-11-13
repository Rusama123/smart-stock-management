/**
 * Statistical demand forecasting for pharmacy inventory.
 *
 * Methods used (no black-box ML — auditable formulas):
 * 1. Weighted moving average (recent days weighted higher)
 * 2. Day-of-week seasonality multipliers from historical sales
 * 3. Linear trend (14-day recent vs prior 14-day comparison)
 * 4. Calendar factors: flu-season months, Ramadan windows (Pakistan)
 * 5. Safety stock buffer on reorder suggestions
 */

const HISTORY_DAYS = 120;
const FORECAST_HORIZON_DAYS = 30;
const REORDER_THRESHOLD_DAYS = 10;
const MIN_REORDER_QTY = 20;
const SAFETY_STOCK_DAYS = 7;

/** Approximate Ramadan Gregorian windows (Pakistan) */
const RAMADAN_WINDOWS = [
  { start: '2024-03-11', end: '2024-04-09' },
  { start: '2025-03-01', end: '2025-03-30' },
  { start: '2026-02-18', end: '2026-03-19' },
  { start: '2027-02-08', end: '2027-03-09' },
];

const FLU_SEASON_MONTHS = [11, 12, 1, 2]; // Nov–Feb
const FLU_BOOST_CATEGORIES = [
  'pain relievers',
  'antibiotics',
  'cold',
  'cough',
  'fever',
  'vitamins',
  'supplements',
];

const RAMADAN_BOOST_CATEGORIES = [
  'digestive',
  'vitamins',
  'supplements',
  'pain relievers',
];

function toDateKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function isInRamadan(date) {
  const t = new Date(date).getTime();
  return RAMADAN_WINDOWS.some((w) => {
    const start = new Date(w.start).getTime();
    const end = new Date(w.end).getTime();
    return t >= start && t <= end;
  });
}

function categoryMatches(category, list) {
  if (!category) return false;
  const lower = category.toLowerCase();
  return list.some((c) => lower.includes(c));
}

/**
 * Build a dense daily sales series (last N days, zeros for no-sale days).
 */
export function buildDailySeries(salesRecords, historyDays = HISTORY_DAYS) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const byDay = {};
  salesRecords.forEach((sale) => {
    const key = toDateKey(sale.date);
    byDay[key] = (byDay[key] || 0) + (sale.quantity || 0);
  });

  const series = [];
  for (let i = historyDays - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = toDateKey(d);
    series.push({
      date: new Date(d),
      dateKey: key,
      dayOfWeek: d.getDay(),
      month: d.getMonth() + 1,
      quantity: byDay[key] || 0,
    });
  }
  return series;
}

/**
 * Weighted moving average — last 7 days ×3, days 8–14 ×2, days 15–30 ×1.
 */
function weightedMovingAverage(series) {
  const last30 = series.slice(-30);
  if (last30.length === 0) return 0;

  let weightedSum = 0;
  let totalWeight = 0;
  const len = last30.length;

  last30.forEach((day, idx) => {
    const daysFromEnd = len - idx;
    let weight = 1;
    if (daysFromEnd <= 7) weight = 3;
    else if (daysFromEnd <= 14) weight = 2;
    weightedSum += day.quantity * weight;
    totalWeight += weight;
  });

  return totalWeight > 0 ? weightedSum / totalWeight : 0;
}

/**
 * Day-of-week seasonality: multiplier per weekday vs overall average.
 */
function computeDowMultipliers(series) {
  const sums = Array(7).fill(0);
  const counts = Array(7).fill(0);
  let total = 0;

  series.forEach((day) => {
    sums[day.dayOfWeek] += day.quantity;
    counts[day.dayOfWeek] += 1;
    total += day.quantity;
  });

  const overallAvg = series.length > 0 ? total / series.length : 0;
  const multipliers = Array(7).fill(1);

  if (overallAvg <= 0) return multipliers;

  for (let d = 0; d < 7; d++) {
    const dowAvg = counts[d] > 0 ? sums[d] / counts[d] : overallAvg;
    multipliers[d] = Math.min(2, Math.max(0.5, dowAvg / overallAvg));
  }
  return multipliers;
}

/**
 * Trend: ratio of recent 14-day avg vs prior 14-day avg.
 */
function computeTrendFactor(series) {
  const last28 = series.slice(-28);
  if (last28.length < 14) return 1;

  const recent = last28.slice(-14);
  const prior = last28.slice(0, 14);

  const recentAvg = recent.reduce((s, d) => s + d.quantity, 0) / 14;
  const priorAvg = prior.reduce((s, d) => s + d.quantity, 0) / 14;

  if (priorAvg <= 0 && recentAvg <= 0) return 1;
  if (priorAvg <= 0) return 1.15;

  const ratio = recentAvg / priorAvg;
  return Math.min(1.5, Math.max(0.6, ratio));
}

function getTrendLabel(trendFactor) {
  if (trendFactor >= 1.1) return 'rising';
  if (trendFactor <= 0.9) return 'falling';
  return 'stable';
}

/**
 * Month-of-year factor from historical same-month performance.
 */
function computeMonthFactor(series, referenceDate = new Date()) {
  const month = referenceDate.getMonth() + 1;
  const monthDays = series.filter((d) => d.month === month);
  if (monthDays.length < 7) return 1;

  const monthAvg = monthDays.reduce((s, d) => s + d.quantity, 0) / monthDays.length;
  const overallAvg = series.reduce((s, d) => s + d.quantity, 0) / series.length;

  if (overallAvg <= 0) return 1;
  return Math.min(1.4, Math.max(0.7, monthAvg / overallAvg));
}

function getCalendarFactor(category, referenceDate = new Date()) {
  let factor = 1;
  const month = referenceDate.getMonth() + 1;

  if (FLU_SEASON_MONTHS.includes(month) && categoryMatches(category, FLU_BOOST_CATEGORIES)) {
    factor *= 1.08;
  }
  if (isInRamadan(referenceDate) && categoryMatches(category, RAMADAN_BOOST_CATEGORIES)) {
    factor *= 1.12;
  }
  return factor;
}

function describeSeasonality(dowMultipliers, category, referenceDate) {
  const notes = [];
  const weekendAvg = (dowMultipliers[0] + dowMultipliers[6]) / 2;
  const weekdayAvg = (dowMultipliers[1] + dowMultipliers[2] + dowMultipliers[3] + dowMultipliers[4] + dowMultipliers[5]) / 6;

  if (weekendAvg > weekdayAvg * 1.15) {
    notes.push('Weekend sales typically higher');
  } else if (weekdayAvg > weekendAvg * 1.15) {
    notes.push('Weekday sales typically higher');
  }

  if (FLU_SEASON_MONTHS.includes(referenceDate.getMonth() + 1) && categoryMatches(category, FLU_BOOST_CATEGORIES)) {
    notes.push('Flu-season demand uplift applied');
  }
  if (isInRamadan(referenceDate) && categoryMatches(category, RAMADAN_BOOST_CATEGORIES)) {
    notes.push('Ramadan demand uplift applied');
  }

  return notes.length > 0 ? notes.join('; ') : 'No strong seasonal pattern detected';
}

/**
 * Forecast daily demand for a specific future day offset (0 = today).
 */
function forecastDayDemand(baseWma, trendFactor, calendarFactor, monthFactor, dowMultipliers, offsetDays, referenceDate) {
  const future = new Date(referenceDate);
  future.setDate(future.getDate() + offsetDays);
  const dow = future.getDay();
  const dowMult = dowMultipliers[dow] || 1;
  const ramadanMult = isInRamadan(future) ? 1.05 : 1;
  return baseWma * trendFactor * calendarFactor * monthFactor * dowMult * ramadanMult;
}

/**
 * Simulate days until stockout using forecasted daily demand.
 */
function simulateDaysUntilStockout(currentStock, baseWma, trendFactor, calendarFactor, monthFactor, dowMultipliers, referenceDate) {
  if (currentStock <= 0) return 0;
  if (baseWma <= 0) return 999;

  let stock = currentStock;
  let days = 0;
  const maxSim = 365;

  while (stock > 0 && days < maxSim) {
    const demand = forecastDayDemand(baseWma, trendFactor, calendarFactor, monthFactor, dowMultipliers, days, referenceDate);
    stock -= Math.max(demand, 0);
    days += 1;
    if (demand <= 0) break;
  }

  if (stock > 0) return 999;
  return days;
}

function computeDataQuality(series) {
  const daysWithSales = series.filter((d) => d.quantity > 0).length;
  if (daysWithSales >= 30) return 'high';
  if (daysWithSales >= 14) return 'medium';
  if (daysWithSales >= 3) return 'low';
  return 'insufficient';
}

/**
 * Main forecast builder for one inventory item.
 */
export function buildDemandForecast(item, salesRecords, referenceDate = new Date()) {
  const series = buildDailySeries(salesRecords, HISTORY_DAYS);
  const totalSold30 = series.slice(-30).reduce((s, d) => s + d.quantity, 0);
  const salesVelocity = parseFloat((totalSold30 / 30).toFixed(3));

  const baseWma = weightedMovingAverage(series);
  const dowMultipliers = computeDowMultipliers(series);
  const trendFactor = computeTrendFactor(series);
  const monthFactor = computeMonthFactor(series, referenceDate);
  const calendarFactor = getCalendarFactor(item.category, referenceDate);
  const trend = getTrendLabel(trendFactor);
  const dataQuality = computeDataQuality(series);

  let forecastedDailyDemand = 0;
  for (let i = 0; i < 7; i++) {
    forecastedDailyDemand += forecastDayDemand(baseWma, trendFactor, calendarFactor, monthFactor, dowMultipliers, i, referenceDate);
  }
  forecastedDailyDemand = parseFloat((forecastedDailyDemand / 7).toFixed(3));

  let forecasted30DayDemand = 0;
  for (let i = 0; i < FORECAST_HORIZON_DAYS; i++) {
    forecasted30DayDemand += forecastDayDemand(baseWma, trendFactor, calendarFactor, monthFactor, dowMultipliers, i, referenceDate);
  }
  forecasted30DayDemand = Math.ceil(forecasted30DayDemand);

  const forecastedWeeklyDemand = parseFloat((forecastedDailyDemand * 7).toFixed(1));

  const daysRemainingFlat = salesVelocity > 0
    ? parseFloat((item.currentStock / salesVelocity).toFixed(1))
    : item.currentStock === 0 ? 0 : 999;

  const daysRemaining = simulateDaysUntilStockout(
    item.currentStock,
    baseWma,
    trendFactor,
    calendarFactor,
    monthFactor,
    dowMultipliers,
    referenceDate
  );

  const effectiveDaysRemaining = daysRemaining === 999 ? daysRemainingFlat : parseFloat(daysRemaining.toFixed(1));

  const needsReorder = effectiveDaysRemaining <= REORDER_THRESHOLD_DAYS && item.currentStock >= 0;
  const safetyStock = Math.ceil(forecastedDailyDemand * SAFETY_STOCK_DAYS);
  const suggestedReorderQty = needsReorder
    ? Math.max(MIN_REORDER_QTY, forecasted30DayDemand + safetyStock - item.currentStock)
    : 0;

  const forecastDiffersFromFlat = salesVelocity > 0
    && Math.abs(forecastedDailyDemand - salesVelocity) / salesVelocity > 0.15;

  const seasonalityNotes = describeSeasonality(dowMultipliers, item.category, referenceDate);

  const confidence = dataQuality === 'high' ? 'high' : dataQuality === 'medium' ? 'medium' : 'low';

  return {
    salesVelocity,
    forecastedDailyDemand,
    forecastedWeeklyDemand,
    forecasted30DayDemand,
    trend,
    trendFactor: parseFloat(trendFactor.toFixed(2)),
    dataQuality,
    confidence,
    seasonalityNotes,
    daysRemaining: effectiveDaysRemaining,
    daysRemainingFlat,
    needsReorder,
    suggestedReorderQty: Math.max(0, suggestedReorderQty),
    forecastDiffersFromFlat,
    forecastMethod: 'WMA + DOW seasonality + trend + calendar factors',
  };
}

/**
 * Group raw Sale documents by inventoryId for batch processing.
 */
export function groupSalesByInventory(salesLogs) {
  const map = {};
  salesLogs.forEach((sale) => {
    const invId = sale.inventoryId?.toString();
    if (!invId) return;
    if (!map[invId]) map[invId] = [];
    map[invId].push(sale);
  });
  return map;
}
