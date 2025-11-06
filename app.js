const getTimesBtn = document.getElementById("getTimes");
const cityInput = document.getElementById("city");

getTimesBtn.addEventListener("click", async () => {
  const city = cityInput.value.trim();
  if (!city) return alert("Please enter a city name!");

  const url = `https://api.aladhan.com/v1/timingsByCity?city=${city}&country=&method=0`; // 0 = Jafari (Shia)
  try {
    const res = await fetch(url);
    const data = await res.json();
    const t = data.data.timings;

    // Assign custom grouping
    const fajr = t.Fajr;
    const sunrise = t.Sunrise;
    const dhuhrain = `${t.Dhuhr} / ${t.Asr}`;
    const sunset = t.Sunset;
    const maghribain = `${t.Maghrib} / ${t.Isha}`;

    document.getElementById("fajr").innerText = fajr;
    document.getElementById("sunrise").innerText = sunrise;
    document.getElementById("dhuhrain").innerText = dhuhrain;
    document.getElementById("sunset").innerText = sunset;
    document.getElementById("maghribain").innerText = maghribain;

    updateNextPrayer([fajr, sunrise, t.Dhuhr, t.Asr, sunset, t.Maghrib, t.Isha]);
  } catch {
    alert("Couldn't fetch timings. Try another city.");
  }
});

function updateNextPrayer(times) {
  const now = new Date();
  const currentMinutes = now.getHours() * 60 + now.getMinutes();

  const prayerNames = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Sunset", "Maghrib", "Isha"];
  const toMinutes = (t) => {
    const [h, m] = t.split(":").map(Number);
    return h * 60 + m;
  };

  for (let i = 0; i < times.length; i++) {
    if (toMinutes(times[i]) > currentMinutes) {
      document.getElementById("nextPrayer").innerText = `Next prayer: ${prayerNames[i]} (${times[i]})`;
      return;
    }
  }
  document.getElementById("nextPrayer").innerText = "Next prayer: Fajr (Tomorrow)";
}
