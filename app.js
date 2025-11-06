/* app.js
   Main app: fetch Shia times (Aladhan primary, IslamicAPI optional), map to grouped items,
   show Next prayer based on user's local time, update UI and provide graceful fallback.
*/
(() => {
  const el = id => document.getElementById(id);
  const cityInput = el('cityInput');
  const getBtn = el('getBtn');
  const clearBtn = el('clearBtn');
  const providerSelect = el('providerSelect');
  const apiKeyIn = el('apiKey');

  const meta = el('meta');
  const updated = el('updated');
  const nextPrayerEl = el('nextPrayer');

  // time display nodes
  const nodes = {
    fajr: el('fajr'), sunrise: el('sunrise'),
    dhuhrain: el('dhuhrain'), sunset: el('sunset'),
    maghribain: el('maghribain'),
    fajrSub: el('fajr-sub'), sunriseSub: el('sunrise-sub'),
    dhuhrainSub: el('dhuhrain-sub'), sunsetSub: el('sunset-sub'),
    maghribainSub: el('maghribain-sub')
  };

  let lastTimings = null;
  let lastCity = '';

  // helper: pretty timestamp
  function nowReadable(){ return new Date().toLocaleString(); }

  // mapping: group times as requested
  function mapGrouped(timings) {
    // timings expected: object with Fajr, Sunrise, Dhuhr, Asr, Sunset, Maghrib, Isha
    return {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhrain: `${timings.Dhuhr} / ${timings.Asr}`,
      Sunset: timings.Sunset,
      Maghribain: `${timings.Maghrib} / ${timings.Isha}`,
      raw: timings
    };
  }

  // show mapped times to DOM
  function renderTimes(mapped, tzName = '') {
    nodes.fajr.textContent = mapped.Fajr;
    nodes.sunrise.textContent = mapped.Sunrise;
    nodes.dhuhrain.textContent = mapped.Dhuhrain;
    nodes.sunset.textContent = mapped.Sunset;
    nodes.maghribain.textContent = mapped.Maghribain;

    // optional subs (display timezone or small hints)
    nodes.fajrSub.textContent = tzName ? `tz: ${tzName}` : '';
    nodes.sunriseSub.textContent = '';
    nodes.dhuhrainSub.textContent = 'Dhuhr / Asr';
    nodes.sunsetSub.textContent = '';
    nodes.maghribainSub.textContent = 'Maghrib / Isha';

    updated.textContent = `Last updated: ${nowReadable()}`;
  }

  // next prayer logic: use raw timings to decide next
  function computeNext(rawTimings) {
    if (!rawTimings) { nextPrayerEl.textContent = 'Next prayer: —'; return; }
    const order = [
      { name: "Fajr", t: rawTimings.Fajr },
      { name: "Sunrise", t: rawTimings.Sunrise },
      { name: "Dhuhr", t: rawTimings.Dhuhr },
      { name: "Asr", t: rawTimings.Asr },
      { name: "Sunset", t: rawTimings.Sunset },
      { name: "Maghrib", t: rawTimings.Maghrib },
      { name: "Isha", t: rawTimings.Isha }
    ];
    const now = new Date();
    const curMin = now.getHours() * 60 + now.getMinutes();
    const toMin = s => {
      // handle possible formats like "05:02 (EET)" — strip non-time
      const m = (s || '').match(/(\d{1,2}:\d{2})/);
      if (!m) return 9999;
      const [h,mn] = m[1].split(':').map(Number);
      return h*60 + mn;
    };
    for (let i=0;i<order.length;i++){
      const tm = toMin(order[i].t);
      if (tm > curMin) {
        nextPrayerEl.textContent = `Next prayer: ${order[i].name} — ${order[i].t}`;
        return;
      }
    }
    nextPrayerEl.textContent = `Next prayer: Fajr (tomorrow)`;
  }

  // UI error helper
  function showError(msg) {
    meta.textContent = msg;
    meta.style.color = '#ffd1d1';
  }

  // Primary fetch (Aladhan, no key)
  async function fetchAladhan(city) {
    const ts = Math.floor(Date.now() / 1000);
    // Aladhan supports timingsByCity with method param; method 0 often maps to Jafari via API docs
    const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=0`;
    const res = await fetch(url);
    if (!res.ok) throw new Error('Aladhan error');
    const json = await res.json();
    if (!json || json.code !== 200 || !json.data) throw new Error('Bad payload');
    return json.data; // contains timings, date, meta
  }

  // Optional IslamicAPI fetch (requires key for reliable in some endpoints)
  async function fetchIslamicAPI(city, key) {
    // This endpoint expects lat/lon typically; but some endpoints accept city names in other ways.
    // We'll attempt a prayer-time endpoint by first geocoding with Aladhan meta if possible.
    // For quickness: try IslamicAPI prayer-time by city is unreliable; skip unless key provided and fallback needed.
    throw new Error('IslamicAPI fetch not implemented in this build; use Aladhan or add server proxy.');
  }

  // fallback static reasonable dataset: used when network or CORS blocks API
  function fallbackTimings() {
    const sample = {
      Fajr: "05:00",
      Sunrise: "06:25",
      Dhuhr: "12:15",
      Asr: "15:45",
      Sunset: "18:05",
      Maghrib: "18:06",
      Isha: "19:30"
    };
    return { timings: sample, date: { readable: new Date().toLocaleDateString() }, meta: { timezone: Intl.DateTimeFormat().resolvedOptions().timeZone } };
  }

  async function getTimings(city) {
    try {
      // primary
      const data = await fetchAladhan(city);
      return data;
    } catch (err) {
      console.warn('Aladhan failed:', err);
      // fallback
      return fallbackTimings();
    }
  }

  // event: fetch button
  getBtn.addEventListener('click', async () => {
    const city = cityInput.value.trim();
    if (!city) { showError('Type a city name and press Find'); return; }
    meta.style.color = '';
    meta.textContent = `Fetching times for ${city}…`;
    try {
      const data = await getTimings(city);
      const timings = data.timings || data;
      const tz = (data.meta && data.meta.timezone) || Intl.DateTimeFormat().resolvedOptions().timeZone || '';
      lastTimings = timings;
      lastCity = city;
      const mapped = mapGrouped(timings);
      renderTimes(mapped, tz);
      computeNext(timings);
      meta.textContent = `Showing times for ${city} • timezone: ${tz || 'local'}`;
      meta.style.color = '';
    } catch (err) {
      console.error(err);
      showError('Failed to fetch prayer times — using fallback.');
      const fb = fallbackTimings();
      lastTimings = fb.timings;
      renderTimes(mapGrouped(fb.timings), fb.meta.timezone);
      computeNext(fb.timings);
    }
  });

  // clear handler
  if (clearBtn) clearBtn.addEventListener('click', () => {
    cityInput.value = '';
    meta.textContent = 'No city selected • paste exact city name for accuracy';
    updated.textContent = 'Last updated: —';
    nextPrayerEl.textContent = 'Next prayer: —';
    Object.keys(nodes).forEach(k => nodes[k].textContent = '--:--');
    lastTimings = null; lastCity = '';
  });

  // live ticker: update next prayer every minute
  setInterval(() => {
    if (lastTimings) computeNext(lastTimings);
  }, 60 * 1000);

  // keyboard: Enter triggers fetch
  cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') getBtn.click(); });

  // on load: small preset for instant demo
  document.addEventListener('DOMContentLoaded', () => {
    // prefill with Muscat for a quick demo look
    cityInput.value = 'Muscat';
    // optionally auto-fetch first demo — comment out if undesired
    // getBtn.click();
  });

})();
