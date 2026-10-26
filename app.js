import {
  THRESHOLD_C,
  WEEK_DAYS,
  defaultDirection,
  mean,
  rollingWeeklyMeans,
  verdict,
  weeklyMean,
} from "./domain.js";
import { lang, locale, t, translatePage } from "./i18n.js";
import { pickQuip } from "./messages.js";
import { alertStatus, alertSupport, isIos, isStandalone, subscribeAlert, unsubscribeAlert } from "./notify.js";
import { createScene } from "./scene.js";

const PAST_DAYS = 14;
const FORECAST_DAYS = 7;
const CITY_STORAGE_KEY = "zmienopony.city";
const GAUGE_MIN_C = -5;
const GAUGE_MAX_C = 20;

const state = {
  direction: defaultDirection(),
  location: null, // { name, latitude, longitude }
  weather: null, // { dates, dailyMeans, todayIndex }
  result: null, // { weekly, isTime, scene }
  quip: "",
};

const $ = (id) => document.getElementById(id);
const temperatureFormat = new Intl.NumberFormat(locale, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const formatTemp = (c) => `${temperatureFormat.format(c)}°C`;
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

const scene = createScene($("scene"));
let chart = null;

// ---------- Storage (best effort: private windows may throw) ----------

function loadStoredCity() {
  try {
    const raw = localStorage.getItem(CITY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function storeCity(city) {
  try {
    if (city) localStorage.setItem(CITY_STORAGE_KEY, JSON.stringify(city));
    else localStorage.removeItem(CITY_STORAGE_KEY);
  } catch {
    // Ignore: the page works without persistence.
  }
}

// ---------- External APIs ----------

async function fetchJson(url) {
  const response = await fetch(url);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return response.json();
}

async function fetchWeather({ latitude, longitude }) {
  const params = new URLSearchParams({
    latitude,
    longitude,
    daily: "temperature_2m_mean",
    past_days: PAST_DAYS,
    forecast_days: FORECAST_DAYS + 1, // +1 because today counts as a forecast day
    timezone: "auto",
  });
  const data = await fetchJson(`https://api.open-meteo.com/v1/forecast?${params}`);
  return {
    dates: data.daily.time,
    dailyMeans: data.daily.temperature_2m_mean,
    todayIndex: PAST_DAYS,
  };
}

async function searchCities(query) {
  const params = new URLSearchParams({ name: query, count: 8, language: lang, format: "json" });
  const data = await fetchJson(`https://geocoding-api.open-meteo.com/v1/search?${params}`);
  return (data.results ?? []).map((r) => ({
    name: r.name,
    detail: [r.admin1, r.country].filter(Boolean).join(", "),
    latitude: r.latitude,
    longitude: r.longitude,
  }));
}

async function reverseGeocode({ latitude, longitude }) {
  try {
    const params = new URLSearchParams({ latitude, longitude, localityLanguage: lang });
    const data = await fetchJson(`https://api.bigdatacloud.net/data/reverse-geocode-client?${params}`);
    return data.city || data.locality || null;
  } catch {
    return null;
  }
}

function getBrowserPosition() {
  return new Promise((resolve, reject) => {
    if (!("geolocation" in navigator)) {
      reject(new Error("unsupported"));
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ latitude: p.coords.latitude, longitude: p.coords.longitude }),
      reject,
      { timeout: 10000, maximumAge: 30 * 60 * 1000 },
    );
  });
}

// ---------- Flow ----------

async function useGeolocation() {
  hideSearch();
  $("location-name").textContent = t.locating;
  setVerdictMessage("loading", t.askingBrowser);
  try {
    const coords = await getBrowserPosition();
    const name = await reverseGeocode(coords);
    await showLocation({
      name: name ?? `${coords.latitude.toFixed(2)}, ${coords.longitude.toFixed(2)}`,
      ...coords,
    });
  } catch {
    $("location-name").textContent = t.pickCity;
    setVerdictMessage("idle", t.noLocation);
    showSearch(t.noLocationHint);
  }
}

async function showLocation(location) {
  state.location = location;
  $("location-name").textContent = location.name;
  setVerdictMessage("loading", t.checking);
  try {
    state.weather = await fetchWeather(location);
    $("updated-at").textContent = t.fetchedAt(new Date().toLocaleTimeString(locale, { hour: "2-digit", minute: "2-digit" }));
    render();
    renderChart();
    renderTable();
  } catch {
    state.weather = null;
    setVerdictMessage("idle", t.weatherDown);
  }
}

// ---------- Verdict ----------

function sceneFor(direction, isTime) {
  if (isTime) return direction === "winter" ? "snow" : "sun";
  return direction === "winter" ? "leaves" : "rain";
}

function setScene(name) {
  document.body.dataset.scene = name;
  scene.setMode(name === "calm" ? null : name);
}

function setVerdictMessage(stateName, message) {
  state.result = null;
  $("verdict").dataset.state = stateName;
  $("verdict-answer").textContent = stateName === "idle" ? "?" : "";
  $("verdict-explanation").textContent = message;
  ["gauge", "verdict-near", "quip", "verdict-actions"].forEach((id) => ($(id).hidden = true));
  setScene("calm");
}

function renderDirection() {
  document.querySelectorAll(".toggle__option").forEach((button) => {
    button.setAttribute("aria-pressed", String(button.dataset.direction === state.direction));
  });
  $("verdict-question").textContent = t.question[state.direction];
}

function render() {
  renderDirection();
  if (!state.weather) return;

  const { dailyMeans, todayIndex } = state.weather;
  const weekly = weeklyMean(dailyMeans, todayIndex);
  if (weekly === null) {
    setVerdictMessage("idle", t.noData);
    return;
  }

  const { isTime, nearThreshold } = verdict(state.direction, weekly);
  const sceneName = sceneFor(state.direction, isTime);
  const sceneChanged = state.result?.scene !== sceneName;
  state.result = { weekly, isTime, scene: sceneName };
  setScene(sceneName);

  const verdictEl = $("verdict");
  verdictEl.dataset.state = isTime ? `yes-${state.direction}` : "no";
  $("verdict-answer").textContent = isTime ? t.yes : t.no;
  $("verdict-explanation").textContent = t.explanations[state.direction][isTime ? "yes" : "no"](formatTemp(weekly));
  $("verdict-near").hidden = !nearThreshold;
  if (sceneChanged) state.quip = pickQuip(sceneName);
  $("quip").textContent = t.quote(state.quip);
  $("quip").hidden = false;

  const forecastMean = mean(dailyMeans.slice(todayIndex + 1, todayIndex + 1 + WEEK_DAYS));
  $("verdict-forecast").textContent =
    forecastMean === null ? "" : t.forecast(formatTemp(forecastMean));
  $("verdict-actions").hidden = false;

  renderGauge(weekly);
  renderAlerts();
  replayAnimation(verdictEl, "is-revealed");
}

function replayAnimation(element, className) {
  element.classList.remove(className);
  void element.offsetWidth; // restart CSS animation
  element.classList.add(className);
}

function gaugePercent(c) {
  const clamped = Math.min(Math.max(c, GAUGE_MIN_C), GAUGE_MAX_C);
  return ((clamped - GAUGE_MIN_C) / (GAUGE_MAX_C - GAUGE_MIN_C)) * 100;
}

function renderGauge(weekly) {
  const gauge = $("gauge");
  gauge.hidden = false;
  gauge.style.setProperty("--threshold", `${gaugePercent(THRESHOLD_C)}%`);
  const marker = $("gauge-marker");
  const value = $("gauge-value");

  if (reducedMotion.matches) {
    marker.style.setProperty("--pos", `${gaugePercent(weekly)}%`);
    value.textContent = formatTemp(weekly);
    return;
  }

  // Slide the marker in from the threshold while counting the number up.
  const from = THRESHOLD_C;
  const start = performance.now();
  const duration = 900;
  const ease = (t) => 1 - Math.pow(1 - t, 3);
  const frame = (now) => {
    const t = Math.min(1, (now - start) / duration);
    const current = from + (weekly - from) * ease(t);
    marker.style.setProperty("--pos", `${gaugePercent(current)}%`);
    value.textContent = formatTemp(current);
    if (t < 1) requestAnimationFrame(frame);
  };
  requestAnimationFrame(frame);
}

// ---------- Season Alerts ----------

const alertsSupport = alertSupport();

/** Season Alerts follow the calendar's Change Direction, not the toggle. */
function seasonalIsTime() {
  return verdict(defaultDirection(), state.result.weekly).isTime;
}

function alertPitch() {
  const winter = defaultDirection() === "winter";
  const when = seasonalIsTime() ? (winter ? t.alreadyWinter : t.alreadySummer) : t.pitch(winter, THRESHOLD_C);
  return `${when} ${t.areaOnly}`;
}

async function renderAlerts() {
  const box = $("alerts");
  const on = $("alerts-on");
  const off = $("alerts-off");
  const note = $("alerts-note");
  if (alertsSupport === "unsupported" || !state.result) {
    box.hidden = true;
    return;
  }
  box.hidden = false;
  if (alertsSupport === "ios-install") {
    on.hidden = off.hidden = true;
    note.textContent = t.iosAlerts;
    return;
  }

  let status;
  try {
    status = await alertStatus();
  } catch {
    box.hidden = true;
    return;
  }
  if (status === "denied") {
    on.hidden = off.hidden = true;
    note.textContent = t.alertsDenied;
    return;
  }

  const here = state.location.name;
  off.hidden = !status;
  on.hidden = status?.name === here;
  if (status?.name === here) {
    note.textContent = t.alertsOnFor(here);
  } else {
    on.textContent = status ? t.moveAlertsTo(here) : t.notifyMe;
    note.textContent = status?.name ? t.alertsSetFor(status.name) : alertPitch();
  }
}

async function withAlertsBusy(action) {
  $("alerts-on").disabled = $("alerts-off").disabled = true;
  try {
    await action();
  } finally {
    $("alerts-on").disabled = $("alerts-off").disabled = false;
    renderAlerts();
  }
}

function enableAlerts() {
  return withAlertsBusy(async () => {
    try {
      await subscribeAlert(state.location, seasonalIsTime());
      showToast(t.alertsEnabled);
    } catch (error) {
      showToast(error.message === "permission" ? t.permissionNeeded : t.enableFailed);
    }
  });
}

function disableAlerts() {
  return withAlertsBusy(async () => {
    try {
      await unsubscribeAlert();
      showToast(t.alertsDisabled);
    } catch {
      showToast(t.disableFailed);
    }
  });
}

// ---------- Sharing ----------

function shareText() {
  const url = location.origin + location.pathname;
  if (!state.result || !state.location) return { text: t.shareInvite, url };
  const { isTime, weekly } = state.result;
  const icon = isTime ? (state.direction === "winter" ? "❄️" : "☀️") : "🙅";
  return {
    text: t.shareResult(t.question[state.direction], isTime ? t.yes : t.no, icon, state.location.name, formatTemp(weekly)),
    url,
  };
}

async function share() {
  const { text, url } = shareText();
  if (navigator.share) {
    try {
      await navigator.share({ title: "Zmień opony", text, url });
      return;
    } catch (error) {
      if (error.name === "AbortError") return;
    }
  }
  try {
    await navigator.clipboard.writeText(`${text} ${url}`);
    showToast(t.copied);
  } catch {
    showToast(url);
  }
}

let toastTimer = null;
function showToast(message, duration = 3200) {
  const toast = $("toast");
  toast.textContent = message;
  toast.classList.add("is-visible");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove("is-visible"), duration);
}

// ---------- Chart & table ----------

function labelFor(isoDate) {
  const [y, m, d] = isoDate.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return `${t.weekdays[date.getDay()]} ${String(d).padStart(2, "0")}.${String(m).padStart(2, "0")}`;
}

function dayLabel(i, todayIndex, date) {
  const suffix = i === todayIndex ? t.todaySuffix : i > todayIndex ? t.forecastSuffix : "";
  return labelFor(date) + suffix;
}

function renderTable() {
  const { dates, dailyMeans, todayIndex } = state.weather;
  const rolling = rollingWeeklyMeans(dailyMeans);
  $("data-table").replaceChildren(
    ...dates.map((date, i) => {
      const row = document.createElement("tr");
      [dayLabel(i, todayIndex, date), dailyMeans[i], rolling[i]].forEach((value) => {
        const cell = document.createElement("td");
        cell.textContent = typeof value === "number" ? formatTemp(value) : value ?? "–";
        row.append(cell);
      });
      return row;
    }),
  );
}

function cssVar(name) {
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim();
}

// Paints the cold/warm zones, the threshold line and the forecast region behind the data.
const backgroundPlugin = {
  id: "tireBackground",
  beforeDatasetsDraw(c, _args, opts) {
    const { ctx, chartArea: area, scales } = c;
    const yThreshold = Math.min(Math.max(scales.y.getPixelForValue(THRESHOLD_C), area.top), area.bottom);
    ctx.save();

    ctx.fillStyle = opts.warmZone;
    ctx.fillRect(area.left, area.top, area.width, yThreshold - area.top);
    ctx.fillStyle = opts.coldZone;
    ctx.fillRect(area.left, yThreshold, area.width, area.bottom - yThreshold);

    const xForecast = scales.x.getPixelForValue(opts.todayIndex - 0.5);
    ctx.fillStyle = opts.forecastZone;
    ctx.fillRect(xForecast, area.top, area.right - xForecast, area.height);
    ctx.fillStyle = opts.labelColor;
    ctx.font = "500 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(t.forecastZone, xForecast + 8, area.top + 8);

    if (yThreshold > area.top && yThreshold < area.bottom) {
      ctx.strokeStyle = opts.thresholdColor;
      ctx.lineWidth = 1.5;
      ctx.setLineDash([6, 4]);
      ctx.beginPath();
      ctx.moveTo(area.left, yThreshold);
      ctx.lineTo(area.right, yThreshold);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.fillStyle = opts.thresholdColor;
      ctx.textBaseline = "bottom";
      ctx.font = "600 12px Inter, system-ui, sans-serif";
      ctx.fillText(t.threshold(THRESHOLD_C), area.left + 8, yThreshold - 4);
    }
    ctx.restore();
  },
};

function renderChart() {
  if (typeof Chart === "undefined") return; // CDN blocked: the table still has the data
  const { dates, dailyMeans, todayIndex } = state.weather;
  const rolling = rollingWeeklyMeans(dailyMeans);
  const known = dailyMeans.filter((v) => typeof v === "number");
  const isForecast = (ctx) => ctx.p1DataIndex > todayIndex - 1;
  const colors = {
    daily: cssVar("--chart-daily"),
    weekly: cssVar("--chart-weekly"),
    text: cssVar("--text-secondary"),
    grid: cssVar("--chart-grid"),
    surface: cssVar("--surface-solid"),
  };
  Chart.defaults.font.family = "Inter, system-ui, sans-serif";

  const config = {
    type: "line",
    data: {
      labels: dates.map(labelFor),
      datasets: [
        {
          label: t.weeklyMean,
          data: rolling,
          borderColor: colors.weekly,
          backgroundColor: colors.weekly,
          borderWidth: 3,
          pointRadius: 0,
          pointHoverRadius: 6,
          pointHoverBorderColor: colors.surface,
          pointHoverBorderWidth: 2,
          tension: 0.35,
          segment: { borderDash: (ctx) => (isForecast(ctx) ? [6, 4] : undefined) },
        },
        {
          label: t.dailyMean,
          data: dailyMeans,
          borderColor: colors.daily,
          backgroundColor: colors.daily,
          borderWidth: 2,
          pointRadius: 2.5,
          pointHoverRadius: 6,
          pointHoverBorderColor: colors.surface,
          pointHoverBorderWidth: 2,
          tension: 0.35,
          segment: { borderDash: (ctx) => (isForecast(ctx) ? [4, 4] : undefined) },
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      animation: reducedMotion.matches ? false : { duration: 900, easing: "easeOutCubic" },
      interaction: { mode: "index", intersect: false },
      scales: {
        x: {
          grid: { display: false },
          ticks: { color: colors.text, maxRotation: 0, autoSkip: true, autoSkipPadding: 14 },
          border: { color: colors.grid },
        },
        y: {
          suggestedMin: Math.min(THRESHOLD_C - 3, ...known),
          suggestedMax: Math.max(THRESHOLD_C + 3, ...known),
          grid: { color: colors.grid },
          border: { display: false },
          ticks: { color: colors.text, callback: (v) => `${v}°` },
        },
      },
      plugins: {
        legend: {
          position: "top",
          align: "start",
          labels: { color: colors.text, usePointStyle: true, pointStyle: "line", boxWidth: 24, padding: 16 },
        },
        tooltip: {
          backgroundColor: cssVar("--tooltip-bg"),
          titleColor: cssVar("--tooltip-text"),
          bodyColor: cssVar("--tooltip-text"),
          padding: 10,
          cornerRadius: 10,
          callbacks: {
            title: (items) => dayLabel(items[0].dataIndex, todayIndex, dates[items[0].dataIndex]),
            label: (item) => (item.raw == null ? null : `${item.dataset.label}: ${formatTemp(item.raw)}`),
          },
        },
        tireBackground: {
          todayIndex,
          coldZone: cssVar("--chart-cold-zone"),
          warmZone: cssVar("--chart-warm-zone"),
          forecastZone: cssVar("--chart-forecast-zone"),
          thresholdColor: cssVar("--text-primary"),
          labelColor: colors.text,
        },
      },
    },
    plugins: [backgroundPlugin],
  };

  $("chart-card").hidden = false;
  if (chart) chart.destroy();
  chart = new Chart($("chart"), config);
}

// ---------- Location search UI ----------

function showSearch(hint) {
  $("search").hidden = false;
  $("change-location").setAttribute("aria-expanded", "true");
  $("search-hint").textContent = hint;
  $("search-results").replaceChildren();
  $("search-input").focus();
}

function hideSearch() {
  $("search").hidden = true;
  $("change-location").setAttribute("aria-expanded", "false");
}

function statusItem(text) {
  return Object.assign(document.createElement("li"), { textContent: text, className: "search__status" });
}

async function onSearchSubmit(event) {
  event.preventDefault();
  const query = $("search-input").value.trim();
  const list = $("search-results");
  list.replaceChildren(statusItem(t.searching));
  try {
    const cities = await searchCities(query);
    if (cities.length === 0) {
      list.replaceChildren(statusItem(t.noResults));
      return;
    }
    list.replaceChildren(
      ...cities.map((city) => {
        const item = document.createElement("li");
        const button = document.createElement("button");
        button.type = "button";
        button.className = "search__result";
        const name = document.createElement("strong");
        name.textContent = city.name;
        const detail = document.createElement("span");
        detail.textContent = city.detail;
        button.append(name, " ", detail);
        button.addEventListener("click", () => {
          const { detail: _detail, ...location } = city;
          storeCity(location);
          hideSearch();
          showLocation(location);
        });
        item.append(button);
        return item;
      }),
    );
  } catch {
    list.replaceChildren(statusItem(t.searchFailed));
  }
}

// ---------- Wiring ----------

document.querySelectorAll(".toggle__option").forEach((button) => {
  button.addEventListener("click", () => {
    if (state.direction === button.dataset.direction) return;
    state.direction = button.dataset.direction;
    render();
  });
});

$("change-location").addEventListener("click", () => {
  if ($("search").hidden) showSearch(t.searchHint);
  else hideSearch();
});
$("search-form").addEventListener("submit", onSearchSubmit);
$("use-geolocation").addEventListener("click", () => {
  storeCity(null);
  useGeolocation();
});
$("quip").addEventListener("click", () => {
  if (!state.result) return;
  state.quip = pickQuip(state.result.scene, state.quip);
  $("quip").textContent = t.quote(state.quip);
  replayAnimation($("quip"), "is-swapped");
});
$("share-main").addEventListener("click", share);
$("share-top").addEventListener("click", share);
$("alerts-on").addEventListener("click", enableAlerts);
$("alerts-off").addEventListener("click", disableAlerts);

// ---------- Install as an app ----------

let installPrompt = null; // Chrome/Edge/Samsung Internet hand us the native install dialog
window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  installPrompt = event;
  $("install").hidden = false;
});
window.addEventListener("appinstalled", () => ($("install").hidden = true));
if (isIos() && !isStandalone()) $("install").hidden = false; // Safari has no install API, only the Share menu
$("install").addEventListener("click", async () => {
  if (!installPrompt) {
    showToast(t.installIos, 8000);
    return;
  }
  installPrompt.prompt();
  await installPrompt.userChoice;
  installPrompt = null;
  $("install").hidden = true;
});

window.matchMedia("(prefers-color-scheme: dark)").addEventListener("change", () => {
  if (state.weather) renderChart();
});

translatePage();
renderDirection();
const storedCity = loadStoredCity();
if (storedCity) showLocation(storedCity);
else useGeolocation();
