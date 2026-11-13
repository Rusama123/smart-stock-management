import assert from 'node:assert/strict';
import axios from 'axios';
import {
  requestGeminiJson,
  parseForecastAdvisory,
  parseDiscountAdvisory,
} from '../services/geminiService.js';
import {
  capDiscountPercent,
  getMaxSafeDiscountPercent,
} from '../utils/discountSafety.js';

async function testMissingGeminiKeyFallback() {
  const oldKey = process.env.GEMINI_API_KEY;
  delete process.env.GEMINI_API_KEY;

  const fallback = {
    aiNarrative: 'Fallback narrative',
    aiSuggestedReorder: 30,
    aiAvailable: false,
    aiStatus: 'fallback',
    aiSource: 'fallback',
  };

  const result = await requestGeminiJson({
    task: 'forecast',
    context: { currentStock: 100 },
    fallback,
  });

  assert.equal(result.aiAvailable, false);
  assert.equal(result.aiStatus, 'unavailable');
  assert.equal(result.aiSource, 'fallback');
  assert.equal(result.aiNarrative, fallback.aiNarrative);

  process.env.GEMINI_API_KEY = oldKey;
}

async function testMalformedGeminiResponseFallback() {
  const oldKey = process.env.GEMINI_API_KEY;
  const oldPost = axios.post;
  process.env.GEMINI_API_KEY = 'test-key';

  axios.post = async () => ({
    data: {
      candidates: [{ content: { parts: [{ text: 'definitely not json' }] } }],
    },
  });

  const fallback = {
    aiSuggestedDiscountReason: 'Fallback reason',
    aiSuggestedDiscount: 12,
    aiAvailable: false,
    aiStatus: 'fallback',
    aiSource: 'fallback',
  };

  const raw = await requestGeminiJson({
    task: 'discount',
    context: { daysRemaining: 10 },
    fallback,
  });
  const parsed = parseDiscountAdvisory(raw, fallback);

  assert.equal(parsed.aiAvailable, false);
  assert.equal(parsed.aiStatus, 'malformed');
  assert.equal(parsed.aiSource, 'fallback');
  assert.equal(parsed.aiSuggestedDiscountReason, 'Fallback reason');

  axios.post = oldPost;
  process.env.GEMINI_API_KEY = oldKey;
}

function testDiscountSafetyCap() {
  const unitPrice = 100;
  const unitCost = 85;
  const maxSafe = getMaxSafeDiscountPercent(unitPrice, unitCost);
  const requested = 60;
  const capped = capDiscountPercent(requested, unitPrice, unitCost);

  assert.ok(maxSafe < requested);
  assert.equal(capped, maxSafe);
}

function testForecastAdvisoryShape() {
  const fallback = {
    aiNarrative: 'Fallback forecast narrative',
    aiSuggestedReorder: 40,
    aiAvailable: false,
    aiStatus: 'fallback',
    aiSource: 'fallback',
  };

  const parsed = parseForecastAdvisory(
    {
      aiNarrative: 'Demand likely rising next month due to recent trend.',
      aiSuggestedReorder: 55,
      aiAvailable: true,
      aiStatus: 'ok',
      aiSource: 'gemini',
    },
    fallback
  );

  assert.equal(typeof parsed.aiNarrative, 'string');
  assert.equal(typeof parsed.aiSuggestedReorder, 'number');
  assert.equal(parsed.aiSource, 'gemini');
}

async function run() {
  await testMissingGeminiKeyFallback();
  await testMalformedGeminiResponseFallback();
  testDiscountSafetyCap();
  testForecastAdvisoryShape();
  console.log('AI enhancement tests passed.');
}

run().catch((err) => {
  console.error('AI enhancement tests failed:', err);
  process.exit(1);
});
