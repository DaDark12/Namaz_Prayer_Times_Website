/* app.js
   Main app logic: search city (Nominatim), fetch Aladhan timings method=0 (Jafari),
   group times, render UI, compute Next prayer. No API keys required.
   Optional: set PROXY_BASE to your deployed server proxy endpoint to hide requests.
*/

// Optional proxy base (if you deploy server.js) - set to e.g. '/proxy' or 'https://your-domain.com/proxy'
// const PROXY_BASE = ''; // leave empty for direct client fetch

(() => {
  const el = id => document.getElementById(id);
  const cityInput = el('cityInput');
  const cityResults = el('cityResults');
  const getBtn = el('getBtn');
  const clearBtn = el('clearBtn');
  const providerSelect = el('providerSelect');
  const apiKeyIn = el('apiKey');
  const meta = el('meta');
  const updated = el('updated');
  const nextPrayerEl = el('nextPrayer');

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

  // presets for instant global coverage (fast UX)
  const PRESETS = [
    { name:'Muscat, Oman', lat:23.5880, lon:58.3829, country:'Oman' },
    { name:'Tehran, Iran', lat:35.6892, lon:51.3890, country:'Iran' },
    { name:'Najaf, Iraq', lat:31.9974, lon:44.3188, country:'Iraq' },
    { name:'Karbala, Iraq', lat:32.6114, lon:44.0245, country:'Iraq' },
    { name:'Lahore, Pakistan', lat:31.5204, lon:74.3587, country:'Pakistan' },
    { name:'Toronto, Canada', lat:43.6532, lon:-79.3832, country:'Canada' },
    { name:'London, UK', lat:51.5074, lon:-0.1278, country:'United Kingdom' },
    { name:'Kuwait City, Kuwait', lat:29.3759, lon:47.9774, country:'Kuwait' },
    { name:'Cairo, Egypt', lat:30.0444, lon:31.2357, country:'Egypt' },
    { name:'Kabul, Afghanistan', lat:34.5553, lon:69.2075, country:'Afghanistan' }
  ];

  // Render results list
  function showResults(list) {
    cityResults.innerHTML = '';
    if (!list || list.length === 0) {
      cityResults.innerHTML = '<li class="loading">No matches</li>';
      cityResults.classList.remove('hidden');
      return;
    }
    list.slice(0, 8).forEach(item => {
      const li = document.createElement('li');
      li.dataset.lat = item.lat;
      li.dataset.lon = item.lon;
      li.dataset.display = item.display_name || item.name || item.city || '';
      li.innerHTML = `<span class="city-name">${item.display_name ? item.display_name : item.name}</span><span class="country">${item.country || ''}</span>`;
      cityResults.appendChild(li);
    });
    cityResults.classList.remove('hidden');
  }

  // Quick search: if small input match PRESETS first to avoid network overhead
  function localPresetSearch(q) {
    const s = q.toLowerCase();
    const matches = PRESETS.filter(p => p.name.toLowerCase().includes(s) || (p.country && p.country.toLowerCase().includes(s)));
    return matches.map(m => ({ lat: m.lat, lon: m.lon, display_name: m.name, country: m.country }));
  }

  // live search (Nominatim)
  const doSearch = Utils.debounce(async (q) => {
    if (!q || q.length < 2) { cityResults.classList.add('hidden'); cityResults.innerHTML = ''; return; }
    // first show preset match if any
    const presetMatches = localPresetSearch(q);
    if (presetMatches.length > 0) { showResults(presetMatches); return; }

    // otherwise call Nominatim (OpenStreetMap) — no key required
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(q)}`;
    try {
      const res = await Utils.safeFetch(url);
      if (!res.ok) throw new Error('geocode fail');
      const json = await res.json();
      if (!json || json.length === 0) { showResults([]); return; }
      // map to simpler items
      const mapped = json.map(it => ({ lat: it.lat, lon: it.lon, display_name: it.display_name, country: it.address && (it.address.country || '') }));
      showResults(mapped);
    } catch (err) {
      console.warn('geocode failed', err);
      showResults([]);
    }
  }, 220);

  cityInput.addEventListener('input', e => {
    const q = e.target.value.trim();
    if (!q) { cityResults.classList.add('hidden'); return; }
    doSearch(q);
  });

  // pick a search result
  cityResults.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const lat = parseFloat(li.dataset.lat);
    const lon = parseFloat(li.dataset.lon);
    const display = li.dataset.display;
    cityInput.value = display;
    cityResults.classList.add('hidden');
    fetchTimingsByCoords(lat, lon, display);
  });

  // also support Enter to trigger first result or direct city string search
  cityInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      const first = cityResults.querySelector('li');
      if (first) { first.click(); return; }
      // if no result selected, do a direct timings by city name (Aladhan supports city param)
      fetchTimingsByCity(cityInput.value.trim());
    }
  });

  // click Get Times (try first to use selection or city text)
  getBtn.addEventListener('click', () => {
    const txt = cityInput.value.trim();
    if (!txt) { meta.textContent = 'Type a city name first'; return; }
    // if the user typed a coordinate-like string, fall back to city query
    fetchTimingsByCity(txt);
  });

  // clear
  clearBtn.addEventListener('click', () => {
    cityInput.value = '';
    cityResults.innerHTML = '';
    cityResults.classList.add('hidden');
    Object.values(nodes).forEach(n => n.textContent = '--:--');
    meta.textContent = 'No city selected • search any location worldwide';
    updated.textContent = 'Last updated: —';
    nextPrayerEl.textContent = 'Next prayer: —';
    lastTimings = null; lastCity = '';
  });

  // fetch timings by city name (Aladhan supports timingsByCity)
  async function fetchTimingsByCity(city) {
    if (!city) return;
    meta.textContent = `Fetching timings for ${city}…`;
    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=0`;
      const res = await Utils.safeFetch(url);
      if (!res.ok) throw new Error('aladhan failed');
      const json = await res.json();
      if (!json || json.code !== 200) throw new Error('bad payload');
      const data = json.data;
      lastTimings = data.timings;
      lastCity = `${data.meta && data.meta.timezone ? city + ' • ' + data.meta.timezone : city}`;
      renderTimings(data.timings, data.meta && data.meta.timezone);
      meta.textContent = `Showing times for ${lastCity}`;
    } catch (err) {
      console.warn('city fetch failed', err);
      meta.textContent = 'City lookup failed — trying geocode fallback';
      // try geocode with nominatim & then fetch by coords
      try {
        const url2 = `https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`;
        const r2 = await Utils.safeFetch(url2);
        if (r2.ok) {
          const j2 = await r2.json();
          if (j2 && j2[0]) {
            fetchTimingsByCoords(parseFloat(j2[0].lat), parseFloat(j2[0].lon), j2[0].display_name);
            return;
          }
        }
        throw new Error('geocode fallback failed');
      } catch (err2) {
        console.error(err2);
        // ultimate fallback to static sample
        const fb = fallbackSample();
        lastTimings = fb.timings;
        renderTimings(fb.timings, fb.tz);
        meta.textContent = 'Using offline fallback sample';
      }
    }
  }

  // fetch timings by latitude & longitude (recommended if user picks search result)
  async function fetchTimingsByCoords(lat, lon, displayName='') {
    meta.textContent = `Fetching timings for ${displayName || `${lat},${lon}`}…`;
    try {
      // Aladhan timings endpoint by coords
      const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=0`;
      const res = await Utils.safeFetch(url);
      if (!res.ok) throw new Error('aladhan coords failed');
      const json = await res.json();
      if (!json || json.code !== 200) throw new Error('bad payload coords');
      const data = json.data;
      lastTimings = data.timings;
      lastCity = displayName || `${lat.toFixed(3)},${lon.toFixed(3)}`;
      renderTimings(data.timings, data.meta && data.meta.timezone);
      meta.textContent = `Showing times for ${lastCity} • tz: ${data.meta && data.meta.timezone ? data.meta.timezone : 'local'}`;
    } catch (err) {
      console.warn('coords fetch failed', err);
      const fb = fallbackSample();
      lastTimings = fb.timings;
      renderTimings(fb.timings, fb.tz);
      meta.textContent = 'Using offline fallback sample';
    }
  }

  function renderTimings(timings, tzName='') {
    // map & render grouped items
    const mapped = {
      Fajr: timings.Fajr,
      Sunrise: timings.Sunrise,
      Dhuhrain: `${timings.Dhuhr} / ${timings.Asr}`,
      Sunset: timings.Sunset,
      Maghribain: `${timings.Maghrib} / ${timings.Isha}`,
      raw: timings
    };
    nodes.fajr.textContent = mapped.Fajr;
    nodes.sunrise.textContent = mapped.Sunrise;
    nodes.dhuhrain.textContent = mapped.Dhuhrain;
    nodes.sunset.textContent = mapped.Sunset;
    nodes.maghribain.textContent = mapped.Maghribain;

    nodes.fajrSub.textContent = tzName ? `tz: ${tzName}` : '';
    nodes.dhuhrainSub.textContent = 'Dhuhr / Asr';
    nodes.maghribainSub.textContent = 'Maghrib / Isha';

    updated.textContent = `Last updated: ${new Date().toLocaleString()}`;
    computeNext(mapped.raw);
  }

  // compute next prayer from raw timings object
  function computeNext(raw) {
    if (!raw) { nextPrayerEl.textContent = 'Next prayer: —'; return; }
    const order = [
      { name: "Fajr", t: raw.Fajr },
      { name: "Sunrise", t: raw.Sunrise },
      { name: "Dhuhr", t: raw.Dhuhr },
      { name: "Asr", t: raw.Asr },
      { name: "Sunset", t: raw.Sunset },
      { name: "Maghrib", t: raw.Maghrib },
      { name: "Isha", t: raw.Isha }
    ];
    const now = new Date();
    const curMin = now.getHours()*60 + now.getMinutes();

    for (let i=0;i<order.length;i++){
      const tmMin = Utils.parseTimeToMinutes(order[i].t);
      if (tmMin === null) continue;
      if (tmMin > curMin) {
        const rem = Utils.minutesUntil(tmMin);
        nextPrayerEl.textContent = `Next prayer: ${order[i].name} — ${order[i].t} (${Utils.formatRemaining(rem)})`;
        return;
      }
    }
    nextPrayerEl.textContent = `Next prayer: Fajr (tomorrow)`;
  }

  // fallback sample
  function fallbackSample() {
    const sample = {
      Fajr: "05:00", Sunrise: "06:25", Dhuhr: "12:15", Asr: "15:45",
      Sunset: "18:05", Maghrib: "18:06", Isha: "19:30"
    };
    return { timings: sample, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local' };
  }

  // keyboard Enter and repression
  document.addEventListener('click', (e) => {
    if (!e.target.closest('.searchWrap')) cityResults.classList.add('hidden');
  });

  // when user clicks a preset result, handle selection
  cityResults.addEventListener('click', (e) => {
    const li = e.target.closest('li');
    if (!li) return;
    const lat = parseFloat(li.dataset.lat);
    const lon = parseFloat(li.dataset.lon);
    const display = li.dataset.display;
    cityInput.value = display;
    cityResults.classList.add('hidden');
    fetchTimingsByCoords(lat, lon, display);
  });

  // autoupdate next prayer each minute if we have timings
  setInterval(() => {
    if (lastTimings) computeNext(lastTimings);
  }, 60_000);

  // prefill demo city
  document.addEventListener('DOMContentLoaded', () => {
    cityInput.value = 'Muscat';
    // auto-fetch for demo (comment if you don't want it)
    fetchTimingsByCity('Muscat');
  });

})();
