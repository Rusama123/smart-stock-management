import axios from 'axios';

const GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
const GEMINI_TIMEOUT_MS = Math.max(1000, Number(process.env.GEMINI_TIMEOUT_MS || 4500));

function extractJsonFromText(text = '') {
  const cleaned = String(text || '').trim();
  if (!cleaned) return null;

  const fenced = cleaned.match(/```json\s*([\s\S]*?)```/i) || cleaned.match(/```\s*([\s\S]*?)```/i);
  const candidate = fenced ? fenced[1].trim() : cleaned;

  const firstBrace = candidate.indexOf('{');
  const lastBrace = candidate.lastIndexOf('}');
  if (firstBrace === -1 || lastBrace === -1 || lastBrace <= firstBrace) {
    return null;
  }

  const jsonSlice = candidate.slice(firstBrace, lastBrace + 1);
  try {
    return JSON.parse(jsonSlice);
  } catch (_err) {
    return null;
  }
}

function sanitizeString(value, maxLen = 320) {
  const text = String(value ?? '').trim();
  if (!text || text === 'undefined' || text === 'null') return '';
  return text.slice(0, maxLen);
}

/** Detect Urdu script or common Roman Urdu pharmacy-advisory slang. */
export function containsNonEnglishNarrative(text = '') {
  const value = String(text || '');
  if (!value.trim()) return false;
  if (/[\u0600-\u06FF]/.test(value)) return true;
  return /\b(garmi|aglay|agl[ae]y|mein nahi|stock mein|order kar|kar do|tez rehti|ki demand|nahi hai|din ORS|aur fever|rehati|rehti hai)\b/i.test(value);
}

function formatDailyDemand(value) {
  const num = Number(value);
  if (!Number.isFinite(num) || num < 0) return '0.0';
  return num.toFixed(1);
}

function formatDaysRemaining(days) {
  if (days === 999) return '90+ days of runway';
  if (days === 0) return 'out of stock';
  return `${days} days of stock remaining`;
}

function pickNarrative(parsed, fallback, keys = ['aiNarrative', 'narrative', 'advisory', 'explanation', 'summary', 'recommendation']) {
  const candidates = keys.flatMap((key) => [parsed?.[key], fallback?.[key]]);
  for (const candidate of candidates) {
    const text = sanitizeString(candidate, 380);
    if (!text || containsNonEnglishNarrative(text)) continue;
    return text;
  }
  // Prefer English fallback even if model returned Roman Urdu / Urdu script
  for (const key of keys) {
    const fallbackText = sanitizeString(fallback?.[key], 380);
    if (fallbackText && !containsNonEnglishNarrative(fallbackText)) return fallbackText;
  }
  return '';
}

export function buildForecastAdvisoryFallback(item = {}) {
  const daily = Number(item.forecastedDailyDemand ?? item.salesVelocity ?? 0);
  const dailyText = formatDailyDemand(daily);
  const daysText = formatDaysRemaining(item.daysRemaining);
  const trend = item.trend || 'stable';
  const trendText = trend === 'rising'
    ? 'Demand is trending upward'
    : trend === 'falling'
      ? 'Demand is softening'
      : 'Demand is holding steady';
  const confidence = item.confidence === 'high'
    ? 'High-confidence forecast'
    : item.confidence === 'medium'
      ? 'Moderate-confidence forecast'
      : 'Limited-history forecast';

  let action = 'No urgent reorder needed at current pace.';
  if (item.currentStock === 0) {
    action = 'Restock immediately to avoid lost sales.';
  } else if (item.needsReorder && Number(item.suggestedReorderQty) > 0) {
    action = `Reorder about ${Math.round(item.suggestedReorderQty)} units to cover the next 30 days plus safety stock.`;
  } else if (Number(item.daysRemaining) <= 7 && Number(item.daysRemaining) !== 999) {
    action = 'Plan a replenishment order within the next few days.';
  }

  const season = item.seasonalityNotes
    && item.seasonalityNotes !== 'No strong seasonal pattern detected'
    ? ` ${item.seasonalityNotes}.`
    : '';

  return `${confidence}: expect ~${dailyText} units/day (${trendText}). ${daysText} at current pace.${season} ${action}`.replace(/\s+/g, ' ').trim();
}

export function buildDiscountAdvisoryFallback(item = {}) {
  const discount = Number(item.suggestedDiscount ?? 0);
  const days = Number(item.daysRemaining ?? 0);
  const risk = item.riskLevel || 'Low';

  if (item.likelySellBeforeExpiry) {
    return `At current sell-through, this ${risk.toLowerCase()}-risk batch should clear before expiry. A controlled ${discount}% discount protects margin while accelerating turnover.`;
  }

  if (days === 999 || risk === 'Slow Moving') {
    return `Slow-moving stock with limited recent sales. A ${discount}% promotion can free shelf space without breaching the minimum profit floor.`;
  }

  if (days <= 10) {
    return `Critical expiry window (${days} days left). ${discount}% off improves sell-through odds while staying within the safe discount cap.`;
  }

  return `Batch may not sell before expiry without promotion. ${discount}% is the suggested clearance to reduce waste while preserving margin safety.`;
}

function sanitizeNumber(value, { min = 0, max = 100000 } = {}) {
  const num = Number(value);
  if (!Number.isFinite(num)) return null;
  if (num < min) return min;
  if (num > max) return max;
  return num;
}

const GEMINI_PLACEHOLDER_KEYS = new Set([
  'your_gemini_api_key_here',
  'your-api-key-here',
  'changeme',
  'replace_me',
  'xxx',
]);

export function hasGeminiKey() {
  const key = String(process.env.GEMINI_API_KEY || '').trim();
  if (!key) return false;
  return !GEMINI_PLACEHOLDER_KEYS.has(key.toLowerCase());
}

export async function requestGeminiJson({
  task,
  context,
  fallback,
}) {
  if (!hasGeminiKey()) {
    return {
      ...fallback,
      aiNarrative: pickNarrative(null, fallback) || fallback.aiNarrative,
      aiSuggestedDiscountReason: pickNarrative(null, fallback, ['aiSuggestedDiscountReason', 'reason', 'rationale', 'advisory', 'explanation']) || fallback.aiSuggestedDiscountReason,
      aiAvailable: false,
      aiStatus: 'unavailable',
      aiSource: 'fallback',
    };
  }

  const prompt = [
    'You are a pharmacy inventory assistant.',
    'Return ONLY valid JSON and no markdown.',
    `Task: ${task}`,
    'Rules:',
    '- Never invent stock/sales values. Use provided values only.',
    '- Advisory output only; do not command unsafe price/stock writes.',
    '- Keep narrative concise and practical for pharmacy staff.',
    '- Write ALL narrative/advisory text in professional English only.',
    '- Never use Urdu, Roman Urdu, Hindi, or mixed-language slang (e.g. garmi, aglay, mein nahi, order kar do).',
    `Context JSON: ${JSON.stringify(context)}`,
    `Expected output JSON shape: ${JSON.stringify(fallback)}`,
  ].join('\n');

  try {
    const resp = await axios.post(
      `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${process.env.GEMINI_API_KEY}`,
      {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          topP: 0.8,
          maxOutputTokens: 300,
        },
      },
      { timeout: GEMINI_TIMEOUT_MS }
    );

    const text = resp?.data?.candidates?.[0]?.content?.parts?.[0]?.text || '';
    const parsed = extractJsonFromText(text);
    if (!parsed || typeof parsed !== 'object') {
      return {
        ...fallback,
        aiNarrative: pickNarrative(null, fallback) || fallback.aiNarrative,
        aiSuggestedDiscountReason: pickNarrative(null, fallback, ['aiSuggestedDiscountReason', 'reason', 'rationale', 'advisory', 'explanation']) || fallback.aiSuggestedDiscountReason,
        aiAvailable: false,
        aiStatus: 'malformed',
        aiSource: 'fallback',
      };
    }

    const narrative = pickNarrative(parsed, fallback);
    const discountReason = pickNarrative(parsed, fallback, ['aiSuggestedDiscountReason', 'reason', 'rationale', 'advisory', 'explanation', 'summary']);

    // Prefer sanitized English fields over any non-English model text in `parsed`
    const safeParsed = { ...parsed };
    if (containsNonEnglishNarrative(safeParsed.aiNarrative)) delete safeParsed.aiNarrative;
    if (containsNonEnglishNarrative(safeParsed.aiSuggestedDiscountReason)) delete safeParsed.aiSuggestedDiscountReason;

    return {
      ...fallback,
      ...safeParsed,
      ...(narrative ? { aiNarrative: narrative } : {}),
      ...(discountReason ? { aiSuggestedDiscountReason: discountReason } : {}),
      aiAvailable: true,
      aiStatus: 'ok',
      aiSource: 'gemini',
    };
  } catch (err) {
    return {
      ...fallback,
      aiNarrative: pickNarrative(null, fallback) || fallback.aiNarrative,
      aiSuggestedDiscountReason: pickNarrative(null, fallback, ['aiSuggestedDiscountReason', 'reason', 'rationale', 'advisory', 'explanation']) || fallback.aiSuggestedDiscountReason,
      aiAvailable: false,
      aiStatus: err?.code === 'ECONNABORTED' ? 'timeout' : 'error',
      aiSource: 'fallback',
    };
  }
}

export function parseForecastAdvisory(payload, fallback) {
  const aiNarrative = pickNarrative(payload, fallback)
    || buildForecastAdvisoryFallback(fallback?.item || fallback)
    || 'Review stock levels and reorder if runway drops below 7 days.';

  return {
    aiNarrative: sanitizeString(aiNarrative, 380),
    aiSuggestedReorder: sanitizeNumber(payload?.aiSuggestedReorder ?? payload?.suggestedReorder, { min: 0, max: 200000 }) ?? fallback.aiSuggestedReorder,
    aiAvailable: Boolean(payload?.aiAvailable),
    aiStatus: sanitizeString(payload?.aiStatus || fallback.aiStatus, 40),
    aiSource: sanitizeString(payload?.aiSource || fallback.aiSource, 20),
  };
}

export function parseDiscountAdvisory(payload, fallback) {
  const aiSuggestedDiscountReason = pickNarrative(payload, fallback, ['aiSuggestedDiscountReason', 'reason', 'rationale', 'advisory', 'explanation', 'summary'])
    || buildDiscountAdvisoryFallback(fallback?.item || fallback)
    || 'Promotion discount balances sell-through speed with margin protection.';

  return {
    aiSuggestedDiscountReason: sanitizeString(aiSuggestedDiscountReason, 360),
    aiSuggestedDiscount: sanitizeNumber(payload?.aiSuggestedDiscount ?? payload?.suggestedDiscount, { min: 0, max: 100 }),
    aiAvailable: Boolean(payload?.aiAvailable),
    aiStatus: sanitizeString(payload?.aiStatus || fallback.aiStatus, 40),
    aiSource: sanitizeString(payload?.aiSource || fallback.aiSource, 20),
  };
}
