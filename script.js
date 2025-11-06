// Background animation (3D gradient clouds)
const canvas = document.getElementById('bgCanvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
camera.position.z = 5;

const geometry = new THREE.IcosahedronGeometry(3, 1);
const material = new THREE.MeshStandardMaterial({
  color: 0x7722ff,
  emissive: 0x220044,
  metalness: 0.8,
  roughness: 0.3
});
const mesh = new THREE.Mesh(geometry, material);
scene.add(mesh);

const light = new THREE.PointLight(0xff00cc, 1.2, 100);
light.position.set(2, 3, 4);
scene.add(light);

function animate() {
  requestAnimationFrame(animate);
  mesh.rotation.x += 0.002;
  mesh.rotation.y += 0.003;
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.render(scene, camera);
}
animate();

// Real-time clock
const currentTimeEl = document.getElementById("currentTime");
setInterval(() => {
  const now = new Date();
  currentTimeEl.textContent = now.toLocaleTimeString();
}, 1000);

const currentLocationEl = document.getElementById("currentLocation");
const nextPrayerEl = document.getElementById("nextPrayer");
const cityInput = document.getElementById("cityInput");
const cityList = document.getElementById("cityList");

const cities = ["Muscat", "Toronto", "Kuwait City", "Islamabad", "London", "New York", "Dubai", "Tokyo", "Kuala Lumpur", "Karachi"];
cityInput.addEventListener("input", () => {
  const val = cityInput.value.toLowerCase();
  cityList.innerHTML = "";
  const filtered = cities.filter(c => c.toLowerCase().includes(val));
  filtered.forEach(city => {
    const li = document.createElement("li");
    li.textContent = city;
    li.onclick = () => {
      cityInput.value = city;
      cityList.style.display = "none";
      getPrayerTimes(city);
    };
    cityList.appendChild(li);
  });
  cityList.style.display = filtered.length ? "block" : "none";
});

async function getPrayerTimes(city) {
  currentLocationEl.textContent = city + " Time";
  const response = await fetch(`https://api.aladhan.com/v1/timingsByCity?city=${city}&country=&method=2`);
  const data = await response.json();
  const t = data.data.timings;

  const fajr = formatTime(t.Fajr);
  const sunrise = formatTime(t.Sunrise);
  const dhuhrain = formatTime(t.Dhuhr) + " / " + formatTime(t.Asr);
  const sunset = formatTime(t.Sunset);
  const maghribain = formatTime(t.Maghrib) + " / " + formatTime(t.Isha);

  document.getElementById("fajr").textContent = `Fajr: ${fajr}`;
  document.getElementById("sunrise").textContent = `Sunrise: ${sunrise}`;
  document.getElementById("dhuhrain").textContent = `Dhuhrain: ${dhuhrain}`;
  document.getElementById("sunset").textContent = `Sunset: ${sunset}`;
  document.getElementById("maghribain").textContent = `Maghribain: ${maghribain}`;

  nextPrayerEl.textContent = "Next prayer: " + getNextPrayer(t);
}

function formatTime(t) {
  return t.replace(/^0/, "");
}

function getNextPrayer(timings) {
  const now = new Date();
  const timeNow = now.getHours() * 60 + now.getMinutes();
  const order = ["Fajr", "Sunrise", "Dhuhr", "Asr", "Sunset", "Maghrib", "Isha"];
  for (const p of order) {
    const [h, m] = timings[p].split(":").map(Number);
    const mins = h * 60 + m;
    if (mins > timeNow) return p;
  }
  return "Fajr (next day)";
}
