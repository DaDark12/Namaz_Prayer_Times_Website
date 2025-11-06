/* utils.js — small helpers: safeFetch with optional proxy, time parsers, debounce */
const Utils = (() => {
  async function safeFetch(url, opts = {}, useProxy=false) {
    // If you deploy the optional server proxy, set useProxy=true and point PROXY_BASE in app.js
    if (useProxy && typeof PROXY_BASE !== 'undefined') {
      const prox = `${PROXY_BASE}?u=${encodeURIComponent(url)}`;
      return fetch(prox, opts);
    }
    return fetch(url, opts);
  }

  function parseTimeToMinutes(s) {
    // s like "05:02" or "05:02 (EET)"
    const m = (s || '').match(/(\d{1,2}):(\d{2})/);
    if (!m) return null;
    const hh = parseInt(m[1],10), mm = parseInt(m[2],10);
    return hh*60 + mm;
  }

  function minutesUntil(targetMin) {
    const now = new Date();
    const cur = now.getHours()*60 + now.getMinutes();
    let diff = targetMin - cur;
    if (diff < 0) diff += 24*60; // next day
    const h = Math.floor(diff/60), m = diff%60;
    return { minutes: diff, hh: h, mm: m };
  }

  function formatRemaining(obj) {
    if (obj.minutes <= 0) return 'now';
    if (obj.hh > 0) return `${obj.hh}h ${obj.mm}m`;
    return `${obj.mm}m`;
  }

  function debounce(fn, wait=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }

  return { safeFetch, parseTimeToMinutes, minutesUntil, formatRemaining, debounce };
})();
