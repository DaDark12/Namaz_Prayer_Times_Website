import { prayerLabels } from './prayers.js';

const getTimesBtn = document.getElementById("getTimes");
const cityInput = document.getElementById("city");
const nextEl = document.getElementById("nextPrayer");

getTimesBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return alert("Enter a city name first!");

  const url = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=&method=0`; // Jafari method
  try {
    const res = await fetch(url);
    const data = await res.json();
    const t = data.data.timings;

    // Update times on cards
    document.getElementById("fajr").textContent = t.Fajr;
    document.getElementById("sunrise").textContent = t.Sunrise;
    document.getElementById("dhuhrain").textContent = `${t.Dhuhr} / ${t.Asr}`;
    document.getElementById("sunset").textContent = t.Sunset;
    document.getElementById("maghribain").textContent = `${t.Maghrib} / ${t.Isha}`;

    handleNextPrayer(t);
  } catch (err) {
    alert("Couldn't fetch timings. Try again.");
  }
});

function handleNextPrayer(times) {
  const now = new Date();
  const minsNow = now.getHours() * 60 + now.getMinutes();

  const order = [
    { name: "Fajr", t: times.Fajr },
    { name: "Sunrise", t: times.Sunrise },
    { name: "Dhuhrain", t: times.Dhuhr },
    { name: "Asr", t: times.Asr },
    { name: "Sunset", t: times.Sunset },
    { name: "Maghribain", t: times.Maghrib },
    { name: "Isha", t: times.Isha }
  ];

  const toMin = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  for (let i = 0; i < order.length; i++) {
    if (toMin(order[i].t) > minsNow) {
      nextEl.textContent = `Next prayer: ${order[i].name} (${order[i].t})`;
      return;
    }
  }

  nextEl.textContent = "Next prayer: Fajr (Tomorrow)";
}
