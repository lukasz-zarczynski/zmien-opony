// Season Alerts in the browser: service worker, Web Push subscription and the API in worker/.
// Terms follow GLOSSARY.md.

const ALERTS_API = "https://api.zmienopony.com";
const VAPID_PUBLIC_KEY = "BOj1abKmqWAAVDg8LX0_Hj4Rtl71eNy1L34tm09AxfYoQ27HEnDofCNGvcd00-x7DNLzoolpMDuLP2Z3y8inaFU";
const ALERT_STORAGE_KEY = "zmienopony.alert"; // { name } of the subscribed Location

const isIos = () =>
  /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const isStandalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;

/** "supported", "ios-install" (Safari only allows push from a home-screen app) or "unsupported". */
export function alertSupport() {
  if (isIos() && !isStandalone()) return "ios-install";
  const supported = "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
  return supported ? "supported" : "unsupported";
}

let registration = null;
function getRegistration() {
  registration ??= navigator.serviceWorker.register("sw.js");
  return registration;
}

function loadAlert() {
  try {
    return JSON.parse(localStorage.getItem(ALERT_STORAGE_KEY));
  } catch {
    return null;
  }
}

function storeAlert(alert) {
  try {
    if (alert) localStorage.setItem(ALERT_STORAGE_KEY, JSON.stringify(alert));
    else localStorage.removeItem(ALERT_STORAGE_KEY);
  } catch {
    // Ignore: only the label of the subscribed city is lost.
  }
}

async function post(path, body) {
  const response = await fetch(`${ALERTS_API}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
}

function applicationServerKey() {
  const base64 = VAPID_PUBLIC_KEY.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));
}

/** "denied", { name } when subscribed (name may be null if storage was cleared), or null. */
export async function alertStatus() {
  if (Notification.permission === "denied") return "denied";
  const subscription = await (await getRegistration()).pushManager.getSubscription();
  if (!subscription) return null;
  return loadAlert() ?? { name: null };
}

/** `alreadyTime`: the Verdict for the current Season is YES already, so wait for the next Season. */
export async function subscribeAlert(location, alreadyTime) {
  if ((await Notification.requestPermission()) !== "granted") throw new Error("permission");
  const pushManager = (await getRegistration()).pushManager;
  const subscription =
    (await pushManager.getSubscription()) ??
    (await pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: applicationServerKey() }));
  await post("/subscribe", {
    endpoint: subscription.endpoint,
    latitude: location.latitude,
    longitude: location.longitude,
    alreadyTime,
  });
  storeAlert({ name: location.name });
}

export async function unsubscribeAlert() {
  const subscription = await (await getRegistration()).pushManager.getSubscription();
  if (subscription) {
    await post("/unsubscribe", { endpoint: subscription.endpoint });
    await subscription.unsubscribe();
  }
  storeAlert(null);
}
