# Shia Namaz Times — Cinema UI

Production-ready static site (GitHub Pages friendly) that:
- Shows Shia (Jafari) prayer times
- Global searchable cities (Nominatim) + presets
- Grouped prayers: Fajr, Sunrise, Dhuhrain (Dhuhr+Asr), Sunset, Maghribain (Maghrib+Isha)
- Live "Next prayer" calculation
- Cinematic animated background + glass UI
- Graceful fallback if external APIs fail

## Files
- `index.html`
- `style.css`
- `background.js`
- `utils.js`
- `app.js`
- `assets/` (optional)
- `server.js` (optional Node proxy)
- `package.json` (for proxy)

## How to deploy (fast)
1. Create a GitHub repo, push all files to the root.
2. Settings → Pages → Branch: main, Folder: / (root).
3. Wait a minute and open the pages URL.

## Optional: Proxy server (recommended for heavy use)
If you plan heavy traffic or want to hide requests / avoid CORS, deploy `server.js` (Node/Express) on Render/Heroku/Vercel. See `server.js` and `package.json`.

## Notes
- Uses Aladhan `timingsByCity` and `timings` (method=0) for Shia/Jafari. If you prefer IslamicAPI, select provider and supply a key — but Aladhan works without keys for most use cases.
- City search uses OpenStreetMap Nominatim (no key). Respect usage policy for heavy automated calls; for production, use a geocoding service or your own proxy.
- If anything fails, app falls back to a sample dataset so UI never breaks.

