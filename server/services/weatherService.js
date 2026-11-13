import axios from 'axios';

const CACHE_TTL_MS = 45 * 60 * 1000; // 45 minutes
const weatherCache = new Map();

const OPENWEATHER_PLACEHOLDER_KEYS = new Set([
  'your_openweather_api_key_here',
  'your-api-key-here',
  'changeme',
  'replace_me',
  'xxx',
]);

export function hasOpenWeatherKey() {
  const key = String(process.env.OPENWEATHER_API_KEY || '').trim();
  if (!key) return false;
  return !OPENWEATHER_PLACEHOLDER_KEYS.has(key.toLowerCase());
}

/**
 * Seasonal defaults for Pakistan when API key/city/API fail.
 */
export function getPakistanSeasonalFallback(referenceDate = new Date()) {
  const month = referenceDate.getMonth() + 1; // 1–12
  let temp = 28;
  let humidity = 45;
  let condition = 'Clear';
  let conditionMain = 'Clear';
  let season = 'mild';

  if (month >= 5 && month <= 8) {
    // May–Aug: summer heat
    temp = month === 6 || month === 7 ? 40 : 36;
    humidity = 55;
    condition = 'Hot';
    conditionMain = 'Clear';
    season = 'summer';
  } else if (month === 12 || month <= 2) {
    // Dec–Feb: winter
    temp = 14;
    humidity = 60;
    condition = 'Cold';
    conditionMain = 'Clouds';
    season = 'winter';
  } else if (month === 3 || month === 4) {
    temp = 26;
    humidity = 40;
    condition = 'Mild';
    conditionMain = 'Clear';
    season = 'spring';
  } else {
    // Sep–Nov monsoon/autumn
    temp = 30;
    humidity = 65;
    condition = 'Humid';
    conditionMain = 'Rain';
    season = 'monsoon';
  }

  return {
    city: 'Lahore',
    country: 'PK',
    temp,
    feelsLike: temp,
    humidity,
    condition,
    conditionMain,
    description: `${condition.toLowerCase()} (seasonal estimate)`,
    icon: null,
    windSpeed: 3,
    source: 'seasonal_fallback',
    season,
    fetchedAt: new Date().toISOString(),
  };
}

function normalizeCity(city) {
  return String(city || '').trim().toLowerCase();
}

function mapOpenWeatherPayload(data, requestedCity) {
  const weather0 = data?.weather?.[0] || {};
  const main = data?.main || {};
  return {
    city: data?.name || requestedCity,
    country: data?.sys?.country || 'PK',
    temp: Math.round(Number(main.temp) * 10) / 10,
    feelsLike: Math.round(Number(main.feels_like) * 10) / 10,
    humidity: Number(main.humidity) || 0,
    condition: weather0.main || 'Unknown',
    conditionMain: weather0.main || 'Unknown',
    description: weather0.description || '',
    icon: weather0.icon || null,
    windSpeed: Number(data?.wind?.speed) || 0,
    source: 'openweathermap',
    season: null,
    fetchedAt: new Date().toISOString(),
  };
}

/**
 * Fetch current weather by city name. Cached ~45 min in memory.
 * Graceful fallback if no API key / city missing / API fail.
 */
export async function getWeatherForCity(city, { referenceDate = new Date() } = {}) {
  const trimmedCity = String(city || '').trim();
  const cacheKey = normalizeCity(trimmedCity) || 'lahore';

  const cached = weatherCache.get(cacheKey);
  if (cached && Date.now() - cached.cachedAt < CACHE_TTL_MS) {
    return { ...cached.data, fromCache: true };
  }

  if (!hasOpenWeatherKey() || !trimmedCity) {
    const fallback = getPakistanSeasonalFallback(referenceDate);
    if (trimmedCity) fallback.city = trimmedCity;
    weatherCache.set(cacheKey, { cachedAt: Date.now(), data: fallback });
    return { ...fallback, fromCache: false };
  }

  try {
    const resp = await axios.get('https://api.openweathermap.org/data/2.5/weather', {
      params: {
        q: trimmedCity,
        appid: process.env.OPENWEATHER_API_KEY,
        units: 'metric',
      },
      timeout: 6000,
    });

    const mapped = mapOpenWeatherPayload(resp.data, trimmedCity);
    weatherCache.set(cacheKey, { cachedAt: Date.now(), data: mapped });
    return { ...mapped, fromCache: false };
  } catch (err) {
    console.warn('[weatherService] OpenWeather fetch failed:', err?.response?.status || err.message);
    const fallback = getPakistanSeasonalFallback(referenceDate);
    fallback.city = trimmedCity || fallback.city;
    fallback.source = 'seasonal_fallback';
    fallback.apiError = err?.response?.status === 404
      ? 'City not found on OpenWeatherMap'
      : 'Weather API unavailable';
    weatherCache.set(cacheKey, { cachedAt: Date.now(), data: fallback });
    return { ...fallback, fromCache: false };
  }
}

export const PAKISTAN_MAJOR_CITIES = [
  'Lahore',
  'Karachi',
  'Islamabad',
  'Peshawar',
  'Quetta',
];

/**
 * Primary city weather + summary for major Pakistan cities.
 * Uses OpenWeather when keyed; otherwise seasonal fallback per city.
 */
export async function getPakistanWeatherContext(primaryCity, { referenceDate = new Date() } = {}) {
  const city = String(primaryCity || '').trim() || 'Lahore';
  const primary = await getWeatherForCity(city, { referenceDate });
  primary.city = city;

  const citiesToFetch = PAKISTAN_MAJOR_CITIES.filter(
    (c) => c.toLowerCase() !== city.toLowerCase()
  );

  const others = await Promise.all(
    citiesToFetch.map(async (c) => {
      const w = await getWeatherForCity(c, { referenceDate });
      return {
        city: c,
        temp: w.temp,
        humidity: w.humidity,
        condition: w.condition,
        source: w.source,
      };
    })
  );

  const allTemps = [primary.temp, ...others.map((o) => o.temp)].filter((t) => Number.isFinite(t));
  const avgTemp = allTemps.length
    ? Math.round((allTemps.reduce((a, b) => a + b, 0) / allTemps.length) * 10) / 10
    : primary.temp;

  return {
    primary,
    multiCity: [
      {
        city: primary.city,
        temp: primary.temp,
        humidity: primary.humidity,
        condition: primary.condition,
        source: primary.source,
        isPrimary: true,
      },
      ...others.map((o) => ({ ...o, isPrimary: false })),
    ],
    nationalSummary: {
      avgTemp,
      cityCount: 1 + others.length,
      note: `Pakistan major cities avg ~${avgTemp}°C — planning for nationwide seasonal demand.`,
    },
  };
}

/** Clear cache (tests / manual refresh). */
export function clearWeatherCache() {
  weatherCache.clear();
}
