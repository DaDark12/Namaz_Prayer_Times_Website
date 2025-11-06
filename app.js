// app.js
// Searchable global cities (GeoDB via RapidAPI) + Shia prayer times (IslamicAPI primary).
// No auto-geolocation. Use the search box or quick picks. Drop RapidAPI key in UI for full global search.

const $ = sel => document.querySelector(sel);
const apiKeyInput = $('#apiKey');
const geoKeyInput = $('#geoKey');
const citySearch = $('#citySearch');
const cityResults = $('#cityResults');
const presetSelect = $('#presetSelect');
const fetchBtn = $('#fetchBtn');
const clearBtn = $('#clearBtn');

const providerRadios = document.getElementsByName('provider');
const locationReadout = $('#locationReadout');
const dateReadout = $('#dateReadout');
const statusMsg = $('#statusMsg');
const loader = $('#loader');
const prayerUl = $('#prayerUl');
const clockEl = $('#clock');
const nextPrayerEl = $('#nextPrayer');

let current = { lat: null, lon: null, city: null };
let lastTimes = null;
let searchTimer = null;
let lastQuery = '';

// provider helper
function provider() {
  for (const r of providerRadios) if (r.checked) return r.value;
  return 'islamicapi';
}

function setStatus(msg) {
  statusMsg.textContent = msg;
}

function showTimes(timesObj, readableDate, timezoneName) {
  prayerUl.innerHTML = '';
  lastTimes = timesObj;
  dateReadout.textContent = `Date: ${readableDate} (${timezoneName || 'local'})`;
  // keep display order common to prayer names if present
  const order = ['Fajr','Sunrise','Dhuhr','Asr','Maghrib','Isha','Zuhr','AsrI','AsrII','Midnight','Imsak'];
  const entries = Object.entries(timesObj);
  // try to order if possible, else default to API order
  order.forEach(name => {
    const found = entries.find(([k]) => k.toLowerCase() === name.toLowerCase());
    if (found) {
      const [k,v] = found;
      appendPrayer(k,v);
    }
  });
  // append remaining
  entries.forEach(([k,v]) => {
    if (!document.getElementById(`p-${k}`)) appendPrayer(k,v);
  });
  setStatus('Times fetched ✓');
  pickNextPrayer();
}

function appendPrayer(name, time) {
  const li = document.createElement('li');
  li.id = `p-${name}`;
  li.innerHTML = `<span class="prayer-name">${name}</span><span class="prayer-time">${time}</span>`;
  prayerUl.appendChild(li);
}

function pickNextPrayer() {
  if (!lastTimes) return nextPrayerEl.textContent = 'Next: —';
  const now = new Date();
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

// Preset quick-pick select
presetSelect.addEventListener('change', () => {
  const opt = presetSelect.selectedOptions[0];
  if (!opt || !opt.dataset.lat) return;
  const lat = parseFloat(opt.dataset.lat);
  const lon = parseFloat(opt.dataset.lon);
  current = { lat, lon, city: opt.textContent };
  locationReadout.textContent = `Location: ${current.city}`;
});

// Clear UI
clearBtn.addEventListener('click', () => {
  current = { lat:null, lon:null, city:null };
  citySearch.value = '';
  cityResults.innerHTML = '';
  cityResults.classList.add('hidden');
  presetSelect.value = '';
  prayerUl.innerHTML = '';
  locationReadout.textContent = 'Location: —';
  dateReadout.textContent = 'Date: —';
  setStatus('Cleared.');
});

// Debounced search
citySearch.addEventListener('input', (e) => {
  const q = e.target.value.trim();
  if (q.length < 2) {
    cityResults.classList.add('hidden');
    cityResults.innerHTML = '';
    return;
  }
  if (q === lastQuery) return;
  lastQuery = q;
  if (searchTimer) clearTimeout(searchTimer);
  searchTimer = setTimeout(() => {
    searchCities(q);
  }, 280);
});

// click outside to close
document.addEventListener('click', (e) => {
  if (!e.target.closest('.searchWrap')) {
    cityResults.classList.add('hidden');
  }
});

// city selection handler
cityResults.addEventListener('click', (e) => {
  const li = e.target.closest('li');
  if (!li) return;
  const lat = parseFloat(li.dataset.lat);
  const lon = parseFloat(li.dataset.lon);
  const name = li.dataset.name;
  current = { lat, lon, city: name };
  locationReadout.textContent = `Location: ${name}`;
  cityResults.classList.add('hidden');
  citySearch.value = name;
});

// searchCities: tries RapidAPI GeoDB if key provided, otherwise falls back to local presets
async function searchCities(query) {
  cityResults.innerHTML = '';
  cityResults.classList.remove('hidden');
  cityResults.innerHTML = `<li class="loading">Searching…</li>`;
  const key = geoKeyInput.value.trim();
  if (!key) {
    // fallback: fuzzy match presets
    const presets = Array.from(presetSelect.options).slice(1).map(o=>({
      name: o.textContent, lat: o.dataset.lat, lon: o.dataset.lon, country: ''
    }));
    const filtered = presets.filter(p => p.name.toLowerCase().includes(query.toLowerCase())).slice(0,6);
    cityResults.innerHTML = '';
    if (filtered.length === 0) {
      cityResults.innerHTML = `<li class="loading">No RapidAPI key — no live results. Try a preset or paste RapidAPI key.</li>`;
    } else {
      filtered.forEach(p=> {
        const li = document.createElement('li');
        li.dataset.lat = p.lat; li.dataset.lon = p.lon; li.dataset.name = p.name;
        li.innerHTML = `<span class="city-name">${p.name}</span><span class="country">${p.country}</span>`;
        cityResults.appendChild(li);
      });
    }
    return;
  }

  try {
    const url = `https://wft-geo-db.p.rapidapi.com/v1/geo/cities?namePrefix=${encodeURIComponent(query)}&limit=8&types=CITY`;
    const res = await fetch(url, {
      headers: {
        'X-RapidAPI-Key': key,
        'X-RapidAPI-Host': 'wft-geo-db.p.rapidapi.com'
      }
    });
    if (!res.ok) throw new Error('GeoDB error');
    const json = await res.json();
    const data = json.data || [];
    cityResults.innerHTML = '';
    if (data.length === 0) {
      cityResults.innerHTML = `<li class="loading">No cities found.</li>`;
      return;
    }
    data.forEach(item => {
      const name = `${item.name}${item.region ? ', ' + item.region : ''}, ${item.country}`;
      const li = document.createElement('li');
      li.dataset.lat = item.latitude; li.dataset.lon = item.longitude; li.dataset.name = name;
      li.innerHTML = `<span class="city-name">${item.name}</span><span class="country">${item.region ? item.region + ', ' : ''}${item.country}</span>`;
      cityResults.appendChild(li);
    });
  } catch (err) {
    console.error(err);
    cityResults.innerHTML = `<li class="loading">GeoDB failed — check RapidAPI key or network.</li>`;
  }
}

// Fetch prayer times when user clicks fetch
fetchBtn.addEventListener('click', () => {
  if (!current.lat || !current.lon) {
    setStatus('No city selected — search a city or pick a quick preset.');
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
    const url = new URL('https://islamicapi.com/api/v1/prayer-time/');
    url.searchParams.set('lat', lat);
    url.searchParams.set('lon', lon);
    url.searchParams.set('method', '0'); // Jafari
    url.searchParams.set('school', '1');
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
    try {
      const url = `https://ummahapi.com/api/prayer-times?lat=${lat}&lng=${lon}&madhab=Jafari&method=Jafari`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('UmmahAPI error');
      const json = await res.json();
      if (!json || !json.prayerTimes) throw new Error('unexpected payload');
      const times = json.prayerTimes;
      showTimes(times, json.date?.readable || new Date().toLocaleDateString(), json.timezone);
    } catch (err) {
      console.error(err);
      setStatus('UmmahAPI fetch failed — check network or provider choice.');
    }
  }
}

// small UX: press Enter in citySearch to choose first result
citySearch.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    const first = cityResults.querySelector('li');
    if (first) first.click();
    fetchBtn.click();
  }
});

setStatus('Ready — search a city (or pick quick), paste RapidAPI key for global search, then Get Namaz Times.');
