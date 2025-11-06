# Namaz Times — Shia (Jafari) — Cinema UI

Static, GitHub Pages compatible front-end that shows Shia prayer times.

## Files
- `index.html`
- `style.css`
- `app.js`

## How to deploy (fast)
1. Create a GitHub repo and push these files to the root (`main` branch).
2. In repo settings → Pages → select branch `main` and `/ (root)` → Save.
3. Open the provided pages URL.

## Notes / troubleshooting
- The client tries **IslamicAPI (Jafari)** first (method=0), then **Aladhan**, then a local fallback. No server required.
- If a chosen external API is blocked by CORS from GitHub Pages in your region, the app will automatically fall back to an embedded dataset so your UI never breaks.
- Want me to add a tiny **server proxy (server.js)** to hide API keys and avoid CORS? Say so and I’ll output it next — instant Node/Express, 30s.

## Want it extra-safe?
If you don't want client-side keys visible, add a proxy `server.js` (I can generate it). Otherwise, no keys are required for the fallback flow.

