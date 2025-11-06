// =====================
// APP.JS - FIXED FOR GITHUB
// =====================

document.addEventListener("DOMContentLoaded", () => {

    // --------------------
    // PRAYER TIMES UPDATE
    // --------------------
    function updatePrayerTimes() {
        // Replace with your original calculation or static times
        const times = {
            fajr: "05:00",
            dhuhr: "12:30",
            asr: "16:00",
            maghrib: "18:30",
            isha: "20:00"
        };
        const prayerList = document.querySelector("#prayer-list");
        if(prayerList) {
            prayerList.innerHTML = `
                <li>Fajr: ${times.fajr}</li>
                <li>Dhuhr: ${times.dhuhr}</li>
                <li>Asr: ${times.asr}</li>
                <li>Maghrib: ${times.maghrib}</li>
                <li>Isha: ${times.isha}</li>
            `;
        }
    }

    // --------------------
    // QIBLA COMPASS UPDATE
    // --------------------
    function toRadians(deg) { return deg * Math.PI / 180; }
    function toDegrees(rad) { return rad * 180 / Math.PI; }

    function calculateQibla(lat, lon) {
        const kaabaLat = 21.4225;
        const kaabaLon = 39.8262;

        const phiK = toRadians(kaabaLat);
        const phiL = toRadians(lat);
        const deltaLambda = toRadians(kaabaLon - lon);

        const x = Math.sin(deltaLambda);
        const y = Math.cos(phiL) * Math.tan(phiK) - Math.sin(phiL) * Math.cos(deltaLambda);
        let qibla = toDegrees(Math.atan2(x, y));
        if(qibla < 0) qibla += 360;
        return qibla;
    }

    function updateQibla() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(pos => {
                const lat = pos.coords.latitude;
                const lon = pos.coords.longitude;
                const qibla = calculateQibla(lat, lon);

                const needle = document.getElementById("qibla-needle");
                const angleDisplay = document.getElementById("qibla-angle");
                if(needle) needle.style.transform = `rotate(${qibla}deg)`;
                if(angleDisplay) angleDisplay.innerText = Math.round(qibla) + "°";
            }, () => {
                console.warn("Location permission denied.");
            });
        } else {
            console.warn("Geolocation not supported.");
        }
    }

    // --------------------
    // RESPONSIVE VIEW TOGGLE
    // --------------------
    const body = document.body;
    const switchBtn = document.getElementById("view-switch");

    function detectView() {
        if(window.innerWidth <= 768) body.classList.add("mobile-view");
        else body.classList.remove("mobile-view");
    }

    if(switchBtn) {
        switchBtn.addEventListener("click", () => {
            body.classList.toggle("mobile-view");
        });
    }

    // --------------------
    // INITIALIZATION
    // --------------------
    detectView();
    updatePrayerTimes();
    updateQibla();
    window.addEventListener("resize", detectView);

});
