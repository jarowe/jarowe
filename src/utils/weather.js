// weather.js — Weather-responsive atmosphere via Open-Meteo API
// Fetches real weather data based on browser geolocation and applies
// CSS custom properties + globe shader uniforms additively on top of
// time-of-day atmosphere.

const CACHE_KEY = 'jarowe_weather_cache';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

// WMO Weather interpretation codes (subset)
// 0 = clear, 1-3 = partly cloudy, 45/48 = fog
// 51-67 = drizzle/rain, 71-77 = snow, 80-82 = rain showers, 95-99 = thunderstorm

/**
 * Fetch current weather from Open-Meteo using browser geolocation.
 * Returns parsed weather data or null if geolocation denied / fetch fails.
 * Caches result in localStorage for 30 minutes.
 */
export async function fetchWeather() {
  // Check cache first
  try {
    const cached = JSON.parse(localStorage.getItem(CACHE_KEY));
    if (cached && cached.data && (Date.now() - cached.timestamp) < CACHE_TTL) {
      return cached.data;
    }
  } catch { /* ignore corrupt cache */ }

  // Get geolocation
  let lat, lon;
  try {
    const pos = await new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation not available'));
        return;
      }
      navigator.geolocation.getCurrentPosition(resolve, reject, {
        timeout: 8000,
        maximumAge: CACHE_TTL,
      });
    });
    lat = pos.coords.latitude;
    lon = pos.coords.longitude;
  } catch {
    // Geolocation denied or unavailable — silent fallback
    return null;
  }

  // Fetch from Open-Meteo (free, no API key required)
  try {
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code,cloud_cover,wind_speed_10m,precipitation,is_day`;
    const res = await fetch(url, { signal: AbortSignal.timeout(10000) });
    if (!res.ok) return null;

    const json = await res.json();
    const current = json.current;
    if (!current) return null;

    const data = {
      temperature: current.temperature_2m,
      weather_code: current.weather_code,
      cloud_cover: current.cloud_cover,
      wind_speed: current.wind_speed_10m,
      precipitation: current.precipitation,
      is_day: current.is_day,
    };

    // Cache the result
    try {
      localStorage.setItem(CACHE_KEY, JSON.stringify({
        data,
        timestamp: Date.now(),
        lat,
        lon,
      }));
    } catch { /* localStorage full */ }

    return data;
  } catch {
    // Network error — silent fallback
    return null;
  }
}

/**
 * Apply weather-derived CSS custom properties to :root.
 * These are ADDITIVE to --tod-* properties — they layer on top, never replace.
 * If weatherData is null, applies clear-day defaults (all zeros).
 */
export function applyWeatherAtmosphere(weatherData) {
  const root = document.documentElement;

  if (!weatherData) {
    // Clear-day defaults
    root.style.setProperty('--weather-fog-density', '0');
    root.style.setProperty('--weather-particle-speed', '1');
    root.style.setProperty('--weather-precipitation', '0');
    root.style.setProperty('--weather-color-warmth', '0');
    root.style.setProperty('--weather-cloud-opacity', '0');
    return;
  }

  const { temperature, weather_code, cloud_cover, wind_speed, precipitation } = weatherData;

  // Fog density: 0.0 (clear) to 1.0 (fog/mist)
  let fogDensity = 0;
  if (weather_code === 45 || weather_code === 48) {
    fogDensity = 1.0;
  } else if (weather_code >= 51 && weather_code <= 55) {
    // Light drizzle adds some haze
    fogDensity = 0.3;
  } else if (cloud_cover > 80) {
    fogDensity = 0.15;
  }

  // Particle speed: 0.5 (calm) to 2.0 (storm), based on wind speed (km/h)
  // Typical range: 0-60 km/h. Map linearly.
  const clampedWind = Math.min(Math.max(wind_speed || 0, 0), 60);
  const particleSpeed = 0.5 + (clampedWind / 60) * 1.5;

  // Precipitation: 0.0 to 1.0, based on mm. Cap at 10mm.
  const clampedPrecip = Math.min(Math.max(precipitation || 0, 0), 10);
  const precipNorm = clampedPrecip / 10;

  // Color warmth: -0.5 (cold/blue shift below 5C) to 0.5 (warm/amber shift above 30C)
  const clampedTemp = Math.min(Math.max(temperature || 15, -10), 45);
  let colorWarmth = 0;
  if (clampedTemp < 5) {
    colorWarmth = -0.5 * ((5 - clampedTemp) / 15); // -10 to 5 -> -0.5 to 0
  } else if (clampedTemp > 30) {
    colorWarmth = 0.5 * ((clampedTemp - 30) / 15); // 30 to 45 -> 0 to 0.5
  }

  // Cloud opacity: 0.0 to 0.8 based on cloud_cover percentage (0-100)
  const cloudOpacity = ((cloud_cover || 0) / 100) * 0.8;

  root.style.setProperty('--weather-fog-density', fogDensity.toFixed(3));
  root.style.setProperty('--weather-particle-speed', particleSpeed.toFixed(3));
  root.style.setProperty('--weather-precipitation', precipNorm.toFixed(3));
  root.style.setProperty('--weather-color-warmth', colorWarmth.toFixed(3));
  root.style.setProperty('--weather-cloud-opacity', cloudOpacity.toFixed(3));
}

/**
 * Get numeric uniform values for globe shader consumption.
 * Returns zeros if weatherData is null (clear-day fallback).
 */
export function getWeatherUniforms(weatherData) {
  if (!weatherData) {
    return {
      uFogDensity: 0,
      uWindSpeed: 0,
      uPrecipitation: 0,
      uCloudOpacity: 0,
    };
  }

  const { weather_code, cloud_cover, wind_speed, precipitation } = weatherData;

  let fogDensity = 0;
  if (weather_code === 45 || weather_code === 48) {
    fogDensity = 1.0;
  } else if (weather_code >= 51 && weather_code <= 55) {
    fogDensity = 0.3;
  } else if (cloud_cover > 80) {
    fogDensity = 0.15;
  }

  const clampedWind = Math.min(Math.max(wind_speed || 0, 0), 60);
  const windNorm = clampedWind / 60; // 0 to 1

  const clampedPrecip = Math.min(Math.max(precipitation || 0, 0), 10);
  const precipNorm = clampedPrecip / 10;

  const cloudOpacity = ((cloud_cover || 0) / 100) * 0.8;

  return {
    uFogDensity: fogDensity,
    uWindSpeed: windNorm,
    uPrecipitation: precipNorm,
    uCloudOpacity: cloudOpacity,
  };
}
