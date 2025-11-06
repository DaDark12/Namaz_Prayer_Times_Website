/* script.js — main app: search (Nominatim), Aladhan (method=0 Jafari), map, next prayer, tilt, qibla */
(() => {
  const el = id => document.getElementById(id);
  const cityInput = el('cityInput'), cityResults = el('cityResults');
  const getBtn = el('getBtn'), clearBtn = el('clearBtn');
  const meta = el('meta'), updated = el('updated'), nextEl = el('nextPrayer');
  const clockEl = el('clock'), clockTz = el('clockTz');

  const nodes = {
    fajr: el('fajr'), sunrise: el('sunrise'),
    dhuhrain: el('dhuhrain'), sunset: el('sunset'),
    maghribain: el('maghribain'),
    qiblaSub: el('qiblaSub'), qiblaDeg: el('qiblaDeg')
  };
  const needle = document.getElementById('needle');

  let lastTimings = null, lastCity = '', lastTz = '';

  // live clock (local by default, switch to tz if present)
  let tzOffsetMinutes = null; // if timezone aware needed
  function updateClock(){
    const now = new Date();
    clockEl.textContent = now.toLocaleTimeString();
  }
  setInterval(updateClock, 1000); updateClock();

  // search: debounce Nominatim (no key)
  const doSearch = Utils.debounce(async (q) => {
    if (!q || q.length < 2) { cityResults.classList.add('hidden'); cityResults.innerHTML=''; return; }
    // quick local presets to avoid hitting Nominatim too much
    const PRESETS = ['Muscat, Oman','Tehran, Iran','Najaf, Iraq','Karbala, Iraq','Lahore, Pakistan','Toronto, Canada','London, UK','Kuwait City, Kuwait'];
    const presetMatches = PRESETS.filter(p => p.toLowerCase().includes(q.toLowerCase()));
    if (presetMatches.length) {
      cityResults.innerHTML = presetMatches.map(p => `<li data-display="${p}"><span class="city-name">${p}</span></li>`).join('');
      cityResults.classList.remove('hidden'); return;
    }
    const url = `https://nominatim.openstreetmap.org/search?format=json&limit=8&q=${encodeURIComponent(q)}`;
    try {
      const r = await Utils.safeFetch(url);
      if (!r.ok) throw new Error('geocode failed');
      const j = await r.json();
      if (!j || !j.length) { cityResults.innerHTML = '<li class="loading">No matches</li>'; cityResults.classList.remove('hidden'); return; }
      cityResults.innerHTML = j.map(it => `<li data-lat="${it.lat}" data-lon="${it.lon}" data-display="${it.display_name}"><span class="city-name">${it.display_name}</span></li>`).join('');
      cityResults.classList.remove('hidden');
    } catch (err) {
      console.warn(err);
      cityResults.innerHTML = '<li class="loading">Search failed</li>'; cityResults.classList.remove('hidden');
    }
  }, 260);

  cityInput.addEventListener('input', (e) => doSearch(e.target.value.trim()));
  document.addEventListener('click', (e) => { if (!e.target.closest('.searchWrap')) cityResults.classList.add('hidden'); });

  // user picks result
  cityResults.addEventListener('click', (e) => {
    const li = e.target.closest('li'); if(!li) return;
    const lat = li.dataset.lat, lon = li.dataset.lon, display = li.dataset.display;
    if (lat && lon) {
      cityInput.value = display; cityResults.classList.add('hidden');
      fetchTimingsByCoords(parseFloat(lat), parseFloat(lon), display);
    } else {
      // preset string (no coords) => fetch by city string
      const disp = li.dataset.display;
      cityInput.value = disp; cityResults.classList.add('hidden');
      fetchTimingsByCity(disp);
    }
  });

  // Enter triggers fetch
  cityInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); const first = cityResults.querySelector('li'); if (first && first.dataset.lat) { first.click(); } else fetchTimingsByCity(cityInput.value.trim()); }});

  // fetch by city name
  async function fetchTimingsByCity(city) {
    if (!city) { meta.textContent = 'Type a city'; return; }
    meta.textContent = `Fetching timings for ${city}…`;
    try {
      const url = `https://api.aladhan.com/v1/timingsByCity?city=${encodeURIComponent(city)}&country=&method=0`;
      const res = await Utils.safeFetch(url);
      if (!res.ok) throw new Error('aladhan failed');
      const j = await res.json();
      if (!j || j.code !== 200) throw new Error('bad payload');
      const data = j.data;
      lastTimings = data.timings; lastCity = city; lastTz = data.meta && data.meta.timezone;
      renderTimings(data.timings, lastTz); computeNext(data.timings);
      meta.textContent = `Showing times for ${city} • tz: ${lastTz || 'local'}`;
    } catch (err) {
      console.warn(err);
      meta.textContent = 'City fetch failed — trying geocode fallback';
      // fallback to nominatim lookup
      try {
        const g = await Utils.safeFetch(`https://nominatim.openstreetmap.org/search?format=json&limit=1&q=${encodeURIComponent(city)}`);
        if (!g.ok) throw new Error('geocode failed');
        const gj = await g.json();
        if (gj && gj[0]) return fetchTimingsByCoords(parseFloat(gj[0].lat), parseFloat(gj[0].lon), gj[0].display_name);
        throw new Error('no geo');
      } catch (err2) {
        console.error(err2);
        const fb = fallbackSample();
        lastTimings = fb.timings; lastCity = city; lastTz = fb.tz;
        renderTimings(fb.timings, fb.tz); computeNext(fb.timings);
        meta.textContent = 'Using offline fallback';
      }
    }
  }

  // fetch by coords
  async function fetchTimingsByCoords(lat, lon, display) {
    meta.textContent = `Fetching timings for ${display || `${lat.toFixed(2)},${lon.toFixed(2)}`}…`;
    try {
      const url = `https://api.aladhan.com/v1/timings?latitude=${lat}&longitude=${lon}&method=0`;
      const res = await Utils.safeFetch(url);
      if (!res.ok) throw new Error('aladhan coords failed');
      const j = await res.json();
      if (!j || j.code !== 200) throw new Error('bad payload coords');
      const data = j.data;
      lastTimings = data.timings; lastCity = display || `${lat.toFixed(3)},${lon.toFixed(3)}`; lastTz = data.meta && data.meta.timezone;
      renderTimings(data.timings, lastTz); computeNext(data.timings);
      meta.textContent = `Showing times for ${lastCity} • tz: ${lastTz || 'local'}`;
      // compute qibla
      const deg = Utils.calcQibla(lat, lon);
      document.getElementById('qiblaDeg').textContent = deg + '°';
      document.getElementById('qiblaSub').textContent = `Bearing from ${lastCity} → Kaʿbah`;
      // rotate needle: needle svg group transform (deg clockwise)
      needle.style.transform = `rotate(${deg}deg)`;
    } catch (err) {
      console.warn(err);
      meta.textContent = 'Coords fetch failed — fallback';
      const fb = fallbackSample();
      lastTimings = fb.timings; lastCity = display || 'Unknown'; lastTz = fb.tz;
      renderTimings(fb.timings, fb.tz); computeNext(fb.timings);
    }
  }

  function renderTimings(timings, tzName='') {
    nodes.fajr.textContent = timings.Fajr || '--:--';
    nodes.sunrise.textContent = timings.Sunrise || '--:--';
    nodes.dhuhrain.textContent = `${timings.Dhuhr || '--:--'} / ${timings.Asr || '--:--'}`;
    nodes.sunset.textContent = timings.Sunset || '--:--';
    nodes.maghribain.textContent = `${timings.Maghrib || '--:--'} / ${timings.Isha || '--:--'}`;
    updated.textContent = `Last updated: ${new Date().toLocaleString()}`;
  }

  function computeNext(raw) {
    if (!raw) { nextEl.textContent = 'Next prayer: —'; return; }
    const order = [
      { name:'Fajr', t: raw.Fajr },
      { name:'Sunrise', t: raw.Sunrise },
      { name:'Dhuhr', t: raw.Dhuhr },
      { name:'Asr', t: raw.Asr },
      { name:'Sunset', t: raw.Sunset },
      { name:'Maghrib', t: raw.Maghrib },
      { name:'Isha', t: raw.Isha }
    ];
    const now = new Date(); const cur = now.getHours()*60 + now.getMinutes();
    for (let i=0;i<order.length;i++){
      const tm = Utils.parseTimeToMinutes(order[i].t);
      if (tm === null) continue;
      if (tm > cur) {
        const rem = Utils.minutesUntil(tm);
        nextEl.textContent = `Next prayer: ${order[i].name} — ${order[i].t} (${Utils.formatRemaining(rem)})`;
        return;
      }
    }
    nextEl.textContent = 'Next prayer: Fajr (tomorrow)';
  }

  // fallback
  function fallbackSample(){
    const sample = { Fajr:'05:00', Sunrise:'06:25', Dhuhr:'12:15', Asr:'15:45', Sunset:'18:05', Maghrib:'18:06', Isha:'19:30' };
    return { timings: sample, tz: Intl.DateTimeFormat().resolvedOptions().timeZone || 'local' };
  }

  // initial quick demo
  document.addEventListener('DOMContentLoaded', () => {
    cityInput.value = 'Muscat';
    fetchTimingsByCity('Muscat');
  });

  // tilt effect (cards) - pointer-based 3D tilt
  (function addTilt(){
    const grid = document.querySelector('[data-tilt]');
    if (!grid) return;
    const cards = grid.querySelectorAll('.card');
    function handleMove(e){
      const rect = grid.getBoundingClientRect();
      const cx = rect.left + rect.width/2, cy = rect.top + rect.height/2;
      const clientX = e.clientX || (e.touches && e.touches[0].clientX);
      const clientY = e.clientY || (e.touches && e.touches[0].clientY);
      const dx = (clientX - cx)/rect.width, dy = (clientY - cy)/rect.height;
      cards.forEach((c,i) => {
        const rotX = dy * 10 * (i%2===0 ? 1 : -1);
        const rotY = dx * 12 * (i%3===0 ? -1 : 1);
        const transZ = 6 + (i%2)*6;
        c.style.transform = `rotateX(${rotX}deg) rotateY(${rotY}deg) translateZ(${transZ}px)`;
      });
    }
    function reset(){
      cards.forEach(c => c.style.transform = '');
    }
    grid.addEventListener('mousemove', handleMove);
    grid.addEventListener('touchmove', handleMove, { passive:true });
    grid.addEventListener('mouseleave', reset);
    grid.addEventListener('touchend', reset);
  })();

})();
