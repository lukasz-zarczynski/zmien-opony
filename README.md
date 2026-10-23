# Zmień opony (zmienopony.com)

A static Polish page that answers one question: is it time to change tires? It takes the user's location, averages the daily mean temperature over the last 7 complete days, and compares that average with the 7°C threshold. Terms are defined in [GLOSSARY.md](GLOSSARY.md).

There is no build step and no backend. The browser calls these services directly:

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
