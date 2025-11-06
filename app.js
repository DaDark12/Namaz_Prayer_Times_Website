// app.js
// Quick notes: By default this tries IslamicAPI (supports Jafari / Shia via method=0).
// If you have an API key from IslamicAPI, paste it in the UI. If not, it will try without one
// and fall back to UmmahAPI if chosen (or if IslamicAPI fails).

const $ = sel => document.querySelector(sel);
const apiKeyInput = $('#apiKey');
const geoBtn = $('#geoBtn');
const citySelect = $('#citySelect');
const customCoords = $('#customCoords');
const latInput = $('#lat');
const lonInput = $('#lon');
const fetchBtn = $('#fetchBtn');
const refreshBtn = $('#refreshBtn');
const providerRadios = document.getElementsByName('provider');

const locationReadout = $('#locationReadout');
const dateReadout = $('#dateReadout');
const loader = $('#loader');
const prayerUl = $('#prayerUl');
const clockEl = $('#clock');
const nextPrayerEl = $('#nextPrayer');

let current = { lat: null, lon: null, city: null };
let lastTimes = null;

// helper: read chosen provider
function provider() {
  for (const r of providerRadios) if (r.checked) return r.value;
  return 'islamicapi';
}

function setStatus(msg) {
  loader.textContent = msg;
}

function showTimes(timesObj, readableDate, timezoneName) {
  prayerUl.innerHTML = '';
  lastTimes = timesObj;
  dateReadout.textContent = `Date: ${readableDate} (${timezoneName || 'local'})`;
  for (const [k,v] of Object.entries(timesObj)) {
    // skip some extras in API payload (Imsak/Midnight) unless present
    const li = document.createElement('li');
    li.innerHTML = `<span class="prayer-name">${k}</span><span class="prayer-time">${v}</span>`;
    prayerUl.appendChild(li);
  }
  setStatus('Times fetched ✓');
  pickNextPrayer();
}

function pickNextPrayer() {
  if (!lastTimes) return nextPrayerEl.textContent = 'Next: —';
  const now = new Date();
  // convert hh:mm to today Date objects in local timezone
  let upcoming = null;
  for (const [k,v] of Object.entries(lastTimes)) {
    if (!/^\d{1,2}:\d{2}$/.test(v)) continue;
    const [hh,mm] = v.split(':').map(Number);
    const t = new Date(now);
    t.setHours(hh, mm, 0, 0);
    if (t < now) continue;
    if (!upcoming || t < upcoming.time) upcoming = { name:k, time:t };
  }
  if (upcoming) {
    const diff = Math.floor((upcoming.time - now)/60000);
    nextPrayerEl.textContent = `Next: ${upcoming.name} in ${diff} min (${upcoming.time.toLocaleTimeString()})`;
  } else {
    nextPrayerEl.textContent = 'Next: all prayers passed today';
  }
}

function updateClock() {
  const now = new Date();
  clockEl.textContent = now.toLocaleTimeString([], {hour:'2-digit', minute:'2-digit'});
  pickNextPrayer();
}
setInterval(updateClock, 1000);
updateClock();

citySelect.addEventListener('change', e=>{
  const opt = citySelect.selectedOptions[0];
  if (!opt) return;
  if (opt.value === 'custom') {
    customCoords.classList.remove('hidden');
  } else {
    customCoords.classList.add('hidden');
    const lat = opt.dataset.lat;
    const lon = opt.dataset.lon;
    current = { lat: parseFloat(lat), lon: parseFloat(lon), city: opt.textContent };
    locationReadout.textContent = `Location: ${opt.textContent}`;
  }
});

geoBtn.addEventListener('click', ()=>{
  setStatus('Requesting location…');
  if (!navigator.geolocation) {
    setStatus('Geolocation not supported in this browser.');
    return;
  }
  navigator.geolocation.getCurrentPosition(pos=>{
    const { latitude, longitude } = pos.coords;
    current = { lat: latitude, lon: longitude, city: 'Auto-detected' };
    locationReadout.textContent = `Location: Auto-detected (${latitude.toFixed(4)}, ${longitude.toFixed(4)})`;
    setStatus('Location acquired. Ready to fetch.');
  }, err=>{
    setStatus('Location denied / failed. Use dropdown or custom lat/lon.');
  }, {timeout:8000});
});

refreshBtn.addEventListener('click', ()=> {
  if (current.lat && current.lon) fetchTimes(current.lat, current.lon);
  else setStatus('No coords — pick a city or use auto-detect.');
});

fetchBtn.addEventListener('click', ()=>{
  // if custom coords visible and filled, use them
  if (!customCoords.classList.contains('hidden') && latInput.value && lonInput.value) {
    const lat = parseFloat(latInput.value), lon = parseFloat(lonInput.value);
    current = { lat, lon, city: `Custom (${lat},${lon})` };
    locationReadout.textContent = `Location: ${current.city}`;
  }
  if (!current.lat || !current.lon) {
    setStatus('No coords — pick a city, custom coords, or auto-detect first.');
    return;
  }
  fetchTimes(current.lat, current.lon);
});

async function fetchTimes(lat, lon) {
  setStatus('Fetching times…');
  prayerUl.innerHTML = '';
  const key = apiKeyInput.value.trim();
  const prov = provider();

  if (prov === 'islamicapi') {
    // IslamicAPI supports method=0 for Jafari / Shia (see docs)
    // GET https://islamicapi.com/api/v1/prayer-time/?lat={latitude}&lon={longitude}&method={method}&school={school}&api_key={YOUR_API_KEY}
    const url = new URL('https://islamicapi.com/api/v1/prayer-time/');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('method', '0'); // Jafari / Shia Ithna-Ashari
    url.searchParams.set('school', '1'); // asr school (1=Shafi default)
    if (key) url.searchParams.set('api_key', key);

    try {
      const res = await fetch(url.toString());
      if (!res.ok) throw new Error(`API ${res.status}`);
      const json = await res.json();
      if (json.code !== 200) throw new Error(json.message || 'bad response');
      const times = json.data.times;
      showTimes(times, json.data.date.readable, json.data.timezone?.name);
    } catch (err) {
      console.error(err);
      setStatus('IslamicAPI fetch failed — try adding API key or switch to UmmahAPI.');
    }
    return;
  }

  if (prov === 'ummahapi') {
    // UmmahAPI alternative (no key in UI). Example:
    // GET https://ummahapi.com/api/prayer-times?lat={lat}&lng={lon}&madhab=Jafari&method=Jafari
    try {
      const url = `https://ummahapi.com/api/prayer-times?lat=${lat}&lng=${lon}&madhab=Jafari&method=Jafari`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('UmmahAPI error');
      const json = await res.json();
      // UmmahAPI returns an object; adapt as needed
      if (!json || !json.prayerTimes) throw new Error('unexpected payload');
      const times = json.prayerTimes;
      showTimes(times, json.date?.readable || new Date().toLocaleDateString(), json.timezone);
    } catch (err) {
      console.error(err);
      setStatus('UmmahAPI fetch failed — check network or provider choice.');
    }
  }
}

// small UX: press Enter in API key to fetch
apiKeyInput.addEventListener('keyup', e => { if (e.key === 'Enter') fetchBtn.click(); });

// initial UI hint
setStatus('Ready — pick city or auto-detect, then Get Namaz Times.');
