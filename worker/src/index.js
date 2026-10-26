// Season Alerts: stores push subscriptions and, on a cron, sends one Web Push per Season
// when a subscriber's cell gets a YES Verdict. Terms follow GLOSSARY.md.
//
// Pushes carry no payload, so no message encryption is needed: the service worker (sw.js)
// picks the text from the date. That keeps each run well under the free plan's CPU limit.

import { defaultDirection, seasonKey, verdict, weeklyMean } from "../../domain.js";

const CELL_DEG = 0.25; // ~28 km north-south, ~17 km east-west in Poland
const PAST_DAYS = 7;
const CELLS_PER_WEATHER_CALL = 50; // Open-Meteo accepts a list of coordinates per request
const MAX_WEATHER_CALLS = 8;
const SUBREQUEST_BUDGET = 48; // free plan allows 50 subrequests per invocation
const EVALUATE_FROM_UTC_HOUR = 6; // yesterday is complete everywhere in Poland
const SEND_UTC_HOURS = [7, 19]; // no buzzing phones at night (8:00–21:00 Polish time)
const MAX_BODY_BYTES = 2048;
const PUSH_HOSTS = [
  /^fcm\.googleapis\.com$/,
  /^updates\.push\.services\.mozilla\.com$/,
  /^web\.push\.apple\.com$/,
  /\.notify\.windows\.com$/,
];

export default {
  async fetch(request, env) {
    const cors = corsHeaders(request, env);
    if (request.method === "OPTIONS") return new Response(null, { status: 204, headers: cors });
    if (request.method !== "POST") return json({ error: "not found" }, 404, cors);

    const { pathname } = new URL(request.url);
    try {
      const body = await readBody(request);
      if (pathname === "/subscribe") return await subscribe(body, env, cors);
      if (pathname === "/unsubscribe") return await unsubscribe(body, env, cors);
      return json({ error: "not found" }, 404, cors);
    } catch (error) {
      if (error instanceof BadRequest) return json({ error: error.message }, 400, cors);
      throw error;
    }
  },

  async scheduled(_controller, env) {
    const now = new Date();
    let used = 0;
    if (now.getUTCHours() >= EVALUATE_FROM_UTC_HOUR) used = await evaluateCells(env, now);
    const hour = now.getUTCHours();
    if (hour >= SEND_UTC_HOURS[0] && hour < SEND_UTC_HOURS[1]) {
      await sendPending(env, now, SUBREQUEST_BUDGET - used);
    }
  },
};

// ---------- HTTP API ----------

class BadRequest extends Error {}

function corsHeaders(request, env) {
  const origin = request.headers.get("Origin");
  const allowed = env.ALLOWED_ORIGINS.split(",").map((o) => o.trim());
  return {
    "Access-Control-Allow-Origin": allowed.includes(origin) ? origin : allowed[0],
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  };
}

function json(data, status, headers) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...headers, "Content-Type": "application/json" },
  });
}

async function readBody(request) {
  const text = await request.text();
  if (text.length > MAX_BODY_BYTES) throw new BadRequest("body too large");
  try {
    return JSON.parse(text);
  } catch {
    throw new BadRequest("invalid json");
  }
}

function validEndpoint(endpoint) {
  if (typeof endpoint !== "string" || endpoint.length > 1024) throw new BadRequest("invalid endpoint");
  let url;
  try {
    url = new URL(endpoint);
  } catch {
    throw new BadRequest("invalid endpoint");
  }
  if (url.protocol !== "https:" || !PUSH_HOSTS.some((host) => host.test(url.hostname))) {
    throw new BadRequest("unknown push service");
  }
  return endpoint;
}

function roundToCell(value, min, max) {
  if (typeof value !== "number" || !Number.isFinite(value) || value < min || value > max) {
    throw new BadRequest("invalid coordinates");
  }
  return Math.round(value / CELL_DEG) * CELL_DEG;
}

async function subscribe(body, env, cors) {
  const endpoint = validEndpoint(body.endpoint);
  const lat = roundToCell(body.latitude, -90, 90);
  const lon = roundToCell(body.longitude, -180, 180);
  const now = new Date();
  // Already YES when signing up: the user knows, so the next alert is next Season's.
  const notifiedSeason = body.alreadyTime === true ? seasonKey(now) : null;
  await env.DB.prepare(
    `INSERT INTO subscriptions (endpoint, lat, lon, notified_season, created_at) VALUES (?1, ?2, ?3, ?4, ?5)
     ON CONFLICT (endpoint) DO UPDATE SET lat = ?2, lon = ?3, notified_season = ?4, pending_season = NULL, checked_on = NULL`,
  )
    .bind(endpoint, lat, lon, notifiedSeason, now.toISOString())
    .run();
  return json({ ok: true }, 200, cors);
}

async function unsubscribe(body, env, cors) {
  const endpoint = validEndpoint(body.endpoint);
  await env.DB.prepare("DELETE FROM subscriptions WHERE endpoint = ?1").bind(endpoint).run();
  return json({ ok: true }, 200, cors);
}

// ---------- Daily evaluation ----------

/** Checks today's Verdict for cells not yet checked today. Returns the number of subrequests used. */
async function evaluateCells(env, now) {
  const season = seasonKey(now);
  const today = now.toISOString().slice(0, 10);
  const { results: cells } = await env.DB.prepare(
    `SELECT DISTINCT lat, lon FROM subscriptions
     WHERE notified_season IS NOT ?1 AND pending_season IS NOT ?1 AND (checked_on IS NULL OR checked_on < ?2)
     LIMIT ?3`,
  )
    .bind(season, today, CELLS_PER_WEATHER_CALL * MAX_WEATHER_CALLS)
    .all();

  let calls = 0;
  for (let i = 0; i < cells.length; i += CELLS_PER_WEATHER_CALL) {
    const chunk = cells.slice(i, i + CELLS_PER_WEATHER_CALL);
    calls++;
    let weeklyMeans;
    try {
      weeklyMeans = await fetchWeeklyMeans(chunk);
    } catch (error) {
      console.error("weather fetch failed", error);
      break; // try again on the next run
    }
    const direction = defaultDirection(now);
    await env.DB.batch(
      chunk.map((cell, j) => {
        const weekly = weeklyMeans[j];
        const due = weekly !== null && verdict(direction, weekly).isTime;
        return env.DB.prepare(
          `UPDATE subscriptions SET checked_on = ?1, pending_season = CASE WHEN ?2 THEN ?3 ELSE pending_season END
           WHERE lat = ?4 AND lon = ?5 AND notified_season IS NOT ?3`,
        ).bind(today, due ? 1 : 0, season, cell.lat, cell.lon);
      }),
    );
  }
  return calls;
}

async function fetchWeeklyMeans(cells) {
  const params = new URLSearchParams({
    latitude: cells.map((c) => c.lat).join(","),
    longitude: cells.map((c) => c.lon).join(","),
    daily: "temperature_2m_mean",
    past_days: PAST_DAYS,
    forecast_days: 1,
    timezone: "auto",
  });
  const response = await fetch(`https://api.open-meteo.com/v1/forecast?${params}`);
  if (!response.ok) throw new Error(`Open-Meteo HTTP ${response.status}`);
  const data = await response.json();
  const locations = Array.isArray(data) ? data : [data];
  return locations.map((l) => weeklyMean(l.daily.temperature_2m_mean, PAST_DAYS));
}

// ---------- Sending ----------

async function sendPending(env, now, budget) {
  if (budget <= 0) return;
  const season = seasonKey(now);
  const { results } = await env.DB.prepare(
    "SELECT endpoint FROM subscriptions WHERE pending_season = ?1 AND notified_season IS NOT ?1 LIMIT ?2",
  )
    .bind(season, budget)
    .all();
  if (results.length === 0) return;

  const tokens = new Map(); // one VAPID token per push service per run
  const updates = [];
  for (const { endpoint } of results) {
    const status = await sendPush(endpoint, env, tokens);
    if (status >= 200 && status < 300) {
      updates.push(
        env.DB.prepare("UPDATE subscriptions SET notified_season = ?1, pending_season = NULL WHERE endpoint = ?2").bind(
          season,
          endpoint,
        ),
      );
    } else if (status === 404 || status === 410) {
      updates.push(env.DB.prepare("DELETE FROM subscriptions WHERE endpoint = ?1").bind(endpoint)); // expired
    } else {
      console.error("push failed", status, new URL(endpoint).hostname); // retried on the next run
    }
  }
  if (updates.length > 0) await env.DB.batch(updates);
}

async function sendPush(endpoint, env, tokens) {
  const audience = new URL(endpoint).origin;
  if (!tokens.has(audience)) tokens.set(audience, await vapidToken(audience, env));
  try {
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        Authorization: `vapid t=${tokens.get(audience)}, k=${env.VAPID_PUBLIC_KEY}`,
        TTL: String(24 * 60 * 60),
        Urgency: "normal",
      },
    });
    return response.status;
  } catch {
    return 0;
  }
}

// ---------- VAPID (RFC 8292) ----------

const base64Url = (bytes) => btoa(String.fromCharCode(...new Uint8Array(bytes))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const encodeJson = (value) => base64Url(new TextEncoder().encode(JSON.stringify(value)));

async function vapidToken(audience, env) {
  const key = await crypto.subtle.importKey(
    "jwk",
    JSON.parse(env.VAPID_PRIVATE_JWK),
    { name: "ECDSA", namedCurve: "P-256" },
    false,
    ["sign"],
  );
  const unsigned = `${encodeJson({ typ: "JWT", alg: "ES256" })}.${encodeJson({
    aud: audience,
    exp: Math.floor(Date.now() / 1000) + 12 * 60 * 60,
    sub: env.VAPID_SUBJECT,
  })}`;
  const signature = await crypto.subtle.sign({ name: "ECDSA", hash: "SHA-256" }, key, new TextEncoder().encode(unsigned));
  return `${unsigned}.${base64Url(signature)}`;
}
