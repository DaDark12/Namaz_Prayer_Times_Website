# Namaz Times — Shia (Jafari) — Cinema UI

Fast, cinematic front-end to fetch Shia (Jafari) prayer times for any city.

## Files
- `index.html`
- `style.css`
- `app.js`

## How it works (quick)
1. Optionally paste your **RapidAPI key** (for GeoDB) into the GeoDB field to enable global searchable cities.
2. Optionally paste your **IslamicAPI** key (recommended for reliable responses).
3. Search any city in the search box or use Quick Picks.
4. Press **Get Namaz Times**.

## Notes
- This is a **pure static site** — works on GitHub Pages (no build).
- If you do not want to expose API keys client-side, use a tiny server proxy (Express) to keep keys secret. I can add that if you want.
- GeoDB via RapidAPI: if you don't add a key, the search will fall back to a small set of presets.
- IslamicAPI is used with `method=0` for **Jafari / Shia** timetables.

## Deployment
1. Create a GitHub repo, drop these files at the root.
2. Enable GitHub Pages (branch: `main` / folder: `/root`).
3. Open the site and paste any keys if needed.

If you want, I can add: `manifest.json`, `favicon.ico`, or a proxy server `server.js` to hide keys. Tell me which and I’ll shotgun it fast.
