// Service worker: shows Season Alerts. Pushes arrive without a payload, so the text is picked
// from the date, using the same calendar rule as defaultDirection() in domain.js.
// Language follows the device, like i18n.js (the page's ?lang= override doesn't reach here).

const LANG = (self.navigator.language ?? "").toLowerCase().startsWith("pl") ? "pl" : "en";

const ALERTS_PL = {
  winter: {
    title: "❄️ Czas na zimówki!",
    body: "Średnia z ostatnich 7 dni w Twojej okolicy spadła do 7°C. Zakładaj zimowe.",
  },
  summer: {
    title: "☀️ Czas na letnie opony!",
    body: "Średnia z ostatnich 7 dni w Twojej okolicy przekroczyła 7°C. Możesz zakładać letnie.",
  },
};

const ALERTS_EN = {
  winter: {
    title: "❄️ Time for winter tires!",
    body: "The 7-day average in your area has dropped to 7°C. Put on your winter tires.",
  },
  summer: {
    title: "☀️ Time for summer tires!",
    body: "The 7-day average in your area has risen above 7°C. You can switch to summer tires.",
  },
};

const ALERTS = LANG === "pl" ? ALERTS_PL : ALERTS_EN;

function seasonDirection(date) {
  const month = date.getMonth();
  return month >= 7 || month === 0 ? "winter" : "summer";
}

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  const alert = ALERTS[seasonDirection(new Date())];
  event.waitUntil(
    self.registration.showNotification(alert.title, {
      body: alert.body,
      icon: "icon-192.png",
      lang: LANG,
      tag: "season-alert",
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      const open = windows.find((client) => new URL(client.url).origin === self.location.origin);
      if (open) return open.focus();
      return self.clients.openWindow("./");
    })(),
  );
});
