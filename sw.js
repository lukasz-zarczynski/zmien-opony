// Service worker: shows Season Alerts. Pushes arrive without a payload, so the text is picked
// from the date, using the same calendar rule as defaultDirection() in domain.js.

const ALERTS = {
  winter: {
    title: "❄️ Czas na zimówki!",
    body: "Średnia z ostatnich 7 dni w Twojej okolicy spadła do 7°C. Zakładaj zimowe.",
  },
  summer: {
    title: "☀️ Czas na letnie opony!",
    body: "Średnia z ostatnich 7 dni w Twojej okolicy przekroczyła 7°C. Możesz zakładać letnie.",
  },
};

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
      lang: "pl",
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
