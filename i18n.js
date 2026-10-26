// UI language: Polish for Polish browsers, English for everyone else. `?lang=en|pl` overrides it.
// Polish static text lives in index.html; English static text is swapped in by translatePage().

const requested = new URLSearchParams(location.search).get("lang") ?? navigator.language ?? "";
export const lang = requested.toLowerCase().startsWith("pl") ? "pl" : "en";
export const locale = lang === "pl" ? "pl-PL" : "en-GB";

const TEXT = {
  pl: {
    locating: "Ustalam lokalizację…",
    askingBrowser: "Pytam przeglądarkę, gdzie jesteś…",
    pickCity: "Wybierz miejscowość",
    noLocation: "Nie wiemy, gdzie jesteś. Wpisz swoją miejscowość powyżej, a powiemy Ci, co z oponami.",
    noLocationHint: "Nie mamy dostępu do Twojej lokalizacji. Wpisz nazwę miejscowości.",
    searchHint: "Wpisz nazwę miejscowości.",
    checking: "Sprawdzam termometry w okolicy…",
    fetchedAt: (time) => ` · pobrano ${time}`,
    weatherDown: "Serwis pogodowy chwilowo nie odpowiada. Spróbuj ponownie za moment.",
    noData: "Brakuje danych z ostatnich dni dla tej lokalizacji. Spróbuj innej miejscowości.",
    question: { winter: "Czas na zimówki?", summer: "Czas na letnie opony?" },
    yes: "TAK",
    no: "NIE",
    explanations: {
      winter: {
        yes: (t) => `Średnia z ostatnich 7 dni to ${t}. Zimno się zrobiło na dobre – zakładaj zimowe.`,
        no: (t) => `Średnia z ostatnich 7 dni to ${t}. Letnie opony jeszcze dadzą radę.`,
      },
      summer: {
        yes: (t) => `Średnia z ostatnich 7 dni to ${t}. Ciepło wróciło – możesz zakładać letnie.`,
        no: (t) => `Średnia z ostatnich 7 dni to ${t}. Zostań jeszcze na zimowych.`,
      },
    },
    quote: (q) => `„${q}”`,
    forecast: (t) => `Prognoza na kolejny tydzień: średnio ${t}`,
    alreadyWinter: "Na zimówki już czas – odezwiemy się wiosną, gdy pora będzie na letnie.",
    alreadySummer: "Na letnie już czas – odezwiemy się jesienią, gdy pora będzie na zimówki.",
    pitch: (winter, threshold) =>
      `Jedno powiadomienie, gdy średnia z 7 dni ${winter ? "spadnie do" : "przekroczy"} ${threshold}°C.`,
    areaOnly: "Zapamiętamy tylko okolicę (~25 km).",
    iosAlerts:
      "🔔 Chcesz powiadomienie, gdy przyjdzie czas? Na iPhonie dodaj stronę do ekranu początkowego (Udostępnij → „Do ekranu początkowego”) i otwórz ją stamtąd.",
    alertsDenied: "Powiadomienia są zablokowane w ustawieniach przeglądarki.",
    alertsOnFor: (here) => `🔔 Powiadomienia włączone dla: ${here}. Odezwiemy się raz w sezonie, gdy przyjdzie czas.`,
    moveAlertsTo: (here) => `🔔 Przenieś powiadomienia na: ${here}`,
    notifyMe: "🔔 Powiadom mnie, gdy przyjdzie czas",
    alertsSetFor: (name) => `Teraz powiadomienia są ustawione dla: ${name}.`,
    alertsEnabled: "🔔 Gotowe! Damy znać, gdy przyjdzie czas.",
    permissionNeeded: "Bez zgody na powiadomienia nie damy rady 🤷",
    enableFailed: "Nie udało się włączyć powiadomień. Spróbuj ponownie.",
    alertsDisabled: "🔕 Powiadomienia wyłączone.",
    disableFailed: "Nie udało się wyłączyć powiadomień. Spróbuj ponownie.",
    shareInvite: "Czy to już czas na zmianę opon? Sprawdź u siebie:",
    shareResult: (question, answer, icon, place, temp) =>
      `${question} ${answer} ${icon} (${place}: średnio ${temp} z ostatnich 7 dni). Sprawdź u siebie:`,
    copied: "Skopiowano! Wklej znajomym, niech też sprawdzą 🚗",
    installIos: "📲 Stuknij Udostępnij, a potem „Do ekranu początkowego”.",
    weekdays: ["nd", "pn", "wt", "śr", "cz", "pt", "sb"],
    todaySuffix: " (dziś)",
    forecastSuffix: " (prognoza)",
    forecastZone: "prognoza →",
    threshold: (c) => `próg ${c}°C`,
    weeklyMean: "Średnia 7-dniowa",
    dailyMean: "Średnia dobowa",
    searching: "Szukam…",
    noResults: "Nic nie znaleziono. Może literówka?",
    searchFailed: "Wyszukiwanie nie działa. Spróbuj ponownie.",
  },
  en: {
    locating: "Finding your location…",
    askingBrowser: "Asking your browser where you are…",
    pickCity: "Choose a city",
    noLocation: "We don't know where you are. Enter your city above and we'll tell you what to do with your tires.",
    noLocationHint: "We can't access your location. Enter a city name.",
    searchHint: "Enter a city name.",
    checking: "Checking local thermometers…",
    fetchedAt: (time) => ` · fetched at ${time}`,
    weatherDown: "The weather service isn't responding right now. Try again in a moment.",
    noData: "Data for the last few days is missing here. Try another city.",
    question: { winter: "Time for winter tires?", summer: "Time for summer tires?" },
    yes: "YES",
    no: "NO",
    explanations: {
      winter: {
        yes: (t) => `The average of the last 7 days is ${t}. The cold is here to stay – put on winter tires.`,
        no: (t) => `The average of the last 7 days is ${t}. Summer tires will still do.`,
      },
      summer: {
        yes: (t) => `The average of the last 7 days is ${t}. The warmth is back – you can switch to summer tires.`,
        no: (t) => `The average of the last 7 days is ${t}. Stay on winter tires a bit longer.`,
      },
    },
    quote: (q) => `“${q}”`,
    forecast: (t) => `Forecast for next week: ${t} on average`,
    alreadyWinter: "It's already winter-tire time – we'll get in touch in spring, when it's time for summer tires.",
    alreadySummer: "It's already summer-tire time – we'll get in touch in autumn, when it's time for winter tires.",
    pitch: (winter, threshold) =>
      `One notification when the 7-day average ${winter ? "drops to" : "rises above"} ${threshold}°C.`,
    areaOnly: "We only remember your area (~25 km).",
    iosAlerts:
      "🔔 Want a notification when it's time? On iPhone, add this page to your Home Screen (Share → “Add to Home Screen”) and open it from there.",
    alertsDenied: "Notifications are blocked in your browser settings.",
    alertsOnFor: (here) => `🔔 Notifications are on for: ${here}. We'll get in touch once a season, when it's time.`,
    moveAlertsTo: (here) => `🔔 Move notifications to: ${here}`,
    notifyMe: "🔔 Notify me when it's time",
    alertsSetFor: (name) => `Notifications are currently set for: ${name}.`,
    alertsEnabled: "🔔 Done! We'll let you know when it's time.",
    permissionNeeded: "We can't notify you without your permission 🤷",
    enableFailed: "Couldn't turn on notifications. Try again.",
    alertsDisabled: "🔕 Notifications turned off.",
    disableFailed: "Couldn't turn off notifications. Try again.",
    shareInvite: "Is it time to change your tires? Check for your area:",
    shareResult: (question, answer, icon, place, temp) =>
      `${question} ${answer} ${icon} (${place}: ${temp} on average over the last 7 days). Check for your area:`,
    copied: "Copied! Paste it to your friends so they can check too 🚗",
    installIos: "📲 Tap Share, then “Add to Home Screen”.",
    weekdays: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    todaySuffix: " (today)",
    forecastSuffix: " (forecast)",
    forecastZone: "forecast →",
    threshold: (c) => `threshold ${c}°C`,
    weeklyMean: "7-day average",
    dailyMean: "Daily average",
    searching: "Searching…",
    noResults: "Nothing found. A typo, maybe?",
    searchFailed: "Search isn't working. Try again.",
  },
};

export const t = TEXT[lang];

// English versions of the static text in index.html, keyed by its data-i18n* attributes.
const STATIC_EN = {
  title: "Zmień opony – time for winter or summer tires?",
  description:
    "Find out in 3 seconds whether it's time for winter or summer tires where you are. The 7-day average temperature versus the magic 7°C.",
  home: "Zmień opony – home",
  share: "Share",
  install: "Install app",
  direction: "Change direction",
  toWinter: "❄️ To winter",
  toSummer: "☀️ To summer",
  city: "City",
  cityExample: "e.g. London, Berlin, Toronto",
  search: "Search",
  useLocation: "📡 Use my location",
  gaugeWinter: "❄️ winter",
  gaugeSummer: "summer ☀️",
  near: "⚠️ Close to the threshold – check back in a few days",
  nextQuip: "Click for another one",
  sendFriends: "Send to friends",
  alertsOff: "Turn off notifications",
  chartTitle: "Past and future",
  chartIntro: "Daily average temperature: the last 14 days and a 7-day forecast.",
  chartLabel: "Chart of the daily average temperature against the 7°C threshold",
  showTable: "Show the data as a table",
  day: "Day",
  dailyMean: "Daily average",
  weeklyMean: "7-day average",
  howItWorks: "How it works",
  fact1: "Below this temperature, the rubber of summer tires hardens and loses grip. Winter tires are the opposite.",
  fact2Big: "7 days",
  fact2: "We average the last week (not counting today), so one frosty morning doesn't cause panic.",
  fact3Big: "0 accounts",
  fact3:
    "No sign-up. Your location goes only to the weather service. If you turn on notifications, we only remember your area (~25 km).",
  allSeason: "All-season tires? Congratulations, this page isn't for you. 😎",
  disclaimer: "The forecast is for context only and doesn't affect the answer. The decision is yours anyway – and your tire shop's.",
  weatherData: "Weather data:",
  ideaCode: "Idea and code:",
  openToWork: " · open to new professional challenges.",
};

export function translatePage() {
  if (lang === "pl") return;
  document.documentElement.lang = "en";
  document.title = STATIC_EN.title;
  document.querySelector('meta[name="description"]').content = STATIC_EN.description;
  document.querySelectorAll("[data-i18n]").forEach((el) => (el.textContent = STATIC_EN[el.dataset.i18n]));
  for (const attr of ["aria-label", "placeholder", "title"]) {
    document.querySelectorAll(`[data-i18n-${attr}]`).forEach((el) => {
      el.setAttribute(attr, STATIC_EN[el.getAttribute(`data-i18n-${attr}`)]);
    });
  }
}
