/* utils.js — helpers */
const Utils = (() => {
  async function safeFetch(url, opts={}, useProxy=false) {
    // direct fetch by default — optional proxy logic can be wired here
    return fetch(url, opts);
  }
  function parseTimeToMinutes(s) {
    const m = (s||'').match(/(\d{1,2}):(\d{2})/);
    if(!m) return null;
    const hh = parseInt(m[1],10), mm=parseInt(m[2],10);
    return hh*60+mm;
  }
  function minutesUntil(targetMin) {
    const now = new Date();
    const cur = now.getHours()*60 + now.getMinutes();
    let diff = targetMin - cur;
    if (diff < 0) diff += 24*60;
    const h = Math.floor(diff/60), m = diff%60;
    return { minutes: diff, hh: h, mm: m };
  }
  function formatRemaining(obj) {
    if (obj.minutes <= 0) return 'now';
    if (obj.hh > 0) return `${obj.hh}h ${obj.mm}m`;
    return `${obj.mm}m`;
  }
  function debounce(fn, wait=250){ let t; return (...a)=>{ clearTimeout(t); t=setTimeout(()=>fn(...a), wait); }; }
  // qibla bearing (degrees) from lat/lon to Kaaba (21.422487, 39.826206)
  function calcQibla(lat, lon) {
    const φ1 = toRad(lat), λ1 = toRad(lon);
    const φ2 = toRad(21.422487), λ2 = toRad(39.826206);
    const Δλ = λ2 - λ1;
    const y = Math.sin(Δλ) * Math.cos(φ2);
    const x = Math.cos(φ1)*Math.sin(φ2) - Math.sin(φ1)*Math.cos(φ2)*Math.cos(Δλ);
    let θ = Math.atan2(y, x); // radians
    θ = toDeg(θ);
    θ = (θ + 360) % 360;
    return Math.round(θ);
  }
  function toRad(d){ return d * Math.PI / 180; }
  function toDeg(r){ return r * 180 / Math.PI; }

  return { safeFetch, parseTimeToMinutes, minutesUntil, formatRemaining, debounce, calcQibla };
})();
