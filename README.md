# Zmień opony (zmienopony.com)

A static Polish page that answers one question: is it time to change tires? It takes the user's location, averages the daily mean temperature over the last 7 complete days, and compares that average with the 7°C threshold. Terms are defined in [GLOSSARY.md](GLOSSARY.md).

There is no build step. The page has no backend of its own; the browser calls these services directly:

- [Open-Meteo](https://open-meteo.com/) for weather and city search (free, no API key, requires CC BY 4.0 attribution, which is in the footer)
- [BigDataCloud](https://www.bigdatacloud.com/free-api/free-reverse-geocode-to-city-api) for turning coordinates into a city name (free client-side endpoint)
- Chart.js 4.4.1 from jsDelivr (pinned, with an SRI hash)

## Files

| File | Purpose |
|---|---|
| `index.html` | Page markup |
| `style.css` | Styles, light and dark |
| `domain.js` | The rule: threshold, weekly mean, verdict |
| `app.js` | Location, API calls, rendering, sharing |
| `scene.js` | Animated backdrop: snow, sun, leaves or drizzle, depending on the verdict |
| `messages.js` | Funny one-liners shown under the verdict |
| `og-image.png` | 1200×630 preview image for links shared on Messenger, WhatsApp, etc. |
| `notify.js` | Season Alerts: service worker registration, push subscription, calls to the alerts API |
| `sw.js` | Service worker that shows Season Alerts |
| `manifest.json`, `icon-*.png`, `apple-touch-icon.png` | Web app manifest and icons (iPhone needs the page added to the home screen for push) |
| `worker/` | Cloudflare Worker for Season Alerts (not part of the static site) |
| `staticwebapp.config.json` | Azure security headers (CSP allows only the APIs above and Google Fonts) |

`og:image` and `og:url` in `index.html` point to `https://zmienopony.com/`. Link previews only work once the site is live on that domain. Update both if the domain changes.

## Run locally

Geolocation and ES modules need `http://localhost`. Opening the file directly won't work.

```sh
npx serve .
# or
python -m http.server 8000
```

## Deploy to Azure Static Web Apps

1. Push this folder to a GitHub repository.
2. In the Azure portal, create a **Static Web App**, choose the Free plan, and connect the repository.
3. Under build details, pick the **Custom** preset with:
   - App location: `/`
   - Api location: *(empty)*
   - Output location: *(empty)*
4. Azure commits a GitHub Actions workflow to the repo. Every push to the main branch then deploys the site.
5. To use **zmienopony.com**, open the Static Web App, go to **Custom domains**, and add the domain. Follow the DNS (CNAME/TXT) instructions shown there.
   - With Cloudflare DNS, create a `CNAME` for `zmienopony.com` (apex) and `www`, both pointing at the `*.azurestaticapps.net` hostname. Cloudflare flattens the apex CNAME automatically.
   - Set both records to **DNS only** (grey cloud) until Azure has validated the domain and issued its certificate.

If you add a new external API, add its origin to `connect-src` in `staticwebapp.config.json`. Otherwise the browser will block the request in production.

## Season Alerts (Cloudflare Worker)

`worker/` is a Cloudflare Worker at `https://api.zmienopony.com`. It fits the Workers free plan:

- `POST /subscribe` and `POST /unsubscribe` store push endpoints in D1, with the Location rounded to a 0.25° grid cell (~25 km).
- A cron runs every 5 minutes. After 06:00 UTC it checks each cell that hasn't been checked today, with one Open-Meteo request per 50 cells, and marks subscribers whose Verdict for the Season is YES. Between 07:00 and 19:00 UTC it sends the due pushes, up to ~45 per run (the free plan allows 50 subrequests per invocation), which is ~6,000 per day.
- Pushes have no payload, so no message encryption is needed. Only the VAPID JWT is signed. `sw.js` picks the text from the date.
- Expired subscriptions (HTTP 404/410 from the push service) are deleted.

### First deploy

```sh
cd worker
npm install
npx wrangler login
npx wrangler d1 create zmienopony-alerts       # paste the database_id into wrangler.toml
npm run db:init                                # creates the table in the remote D1
npx wrangler secret put VAPID_PRIVATE_JWK      # paste the JSON after "VAPID_PRIVATE_JWK=" from worker/.dev.vars
npm run deploy                                 # also creates the api.zmienopony.com custom domain
```

The VAPID public key is in `worker/wrangler.toml` and `notify.js`. If you generate new keys (`npm run vapid`), update both. Existing subscriptions then stop working, because browsers bind each subscription to the key.

### Local test

```sh
cd worker
npm run db:init:local
npm run dev                                    # http://localhost:8787
curl "http://localhost:8787/__scheduled?cron=*/5+*+*+*+*"   # run the cron once
```
