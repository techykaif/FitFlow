import { auth, database, ref, get, onAuthStateChanged } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", () => {
  loadSummaryData();
  setDailyQuote();
});

function formatEmail(email) {
  return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function isRecent(value, days = 7) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return false;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return date >= cutoff;
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function parseSleepDuration(entry) {
  let duration = Number(entry.duration) || 0;
  if (!duration && entry.sleepStart && entry.wakeTime) {
    const start = new Date(`1970-01-01T${entry.sleepStart}`);
    const end = new Date(`1970-01-02T${entry.wakeTime}`);
    duration = (end - start) / 3600000;
  }
  return duration > 0 && duration < 24 ? duration : 0;
}

function showChartEmpty(canvasId, message) {
  const canvas = document.getElementById(canvasId);
  if (!canvas) return;
  const container = canvas.parentElement;
  canvas.style.display = "none";
  container.classList.add("chart-empty");
  container.innerHTML = `<div class="chart-empty-state"><i class="fa-solid fa-chart-line" aria-hidden="true"></i><strong>${message}</strong><span>Log a few records and this chart will fill in automatically.</span></div>`;
}

function loadSummaryData() {
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      window.location.href = "login.html";
      return;
    }

    const formattedEmail = formatEmail(user.email);
    const sleepRef = ref(database, `users/${formattedEmail}/sleep`);
    const nutritionRef = ref(database, `users/${formattedEmail}/nutrition`);
    const activityRef = ref(database, `users/${formattedEmail}/activities`);

    try {
      const [sleepSnap, nutritionSnap, activitySnap] = await Promise.all([get(sleepRef), get(nutritionRef), get(activityRef)]);
      const sleepData = sleepSnap.exists() ? Object.values(sleepSnap.val()).filter((entry) => isRecent(entry.date)) : [];
      const nutritionData = nutritionSnap.exists() ? Object.values(nutritionSnap.val()).filter((entry) => isRecent(entry.date)) : [];
      const activityData = activitySnap.exists() ? Object.values(activitySnap.val()).filter((entry) => isRecent(entry.date)) : [];

      const sleepDurations = sleepData.map(parseSleepDuration).filter(Boolean);
      const avgSleep = sleepDurations.length ? sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length : 0;
      const totalCalories = nutritionData.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0);
      const totalMinutes = activityData.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);

      setText("dashboardSleep", avgSleep ? `${avgSleep.toFixed(1)} hrs` : "No data");
      setText("dashboardNutrition", totalCalories ? `${Math.round(totalCalories).toLocaleString()} cal` : "No data");
      setText("dashboardActivity", totalMinutes ? `${Math.round(totalMinutes)} min` : "No data");

      const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
      const sleepPerDay = {};
      const activityPerDay = {};
      sleepData.forEach((entry) => {
        const date = new Date(entry.date);
        const duration = parseSleepDuration(entry);
        if (!Number.isNaN(date.getTime()) && duration) {
          const day = date.toLocaleDateString("en-US", { weekday: "short" });
          sleepPerDay[day] = (sleepPerDay[day] || 0) + duration;
        }
      });
      activityData.forEach((entry) => {
        const date = new Date(entry.date);
        if (!Number.isNaN(date.getTime())) {
          const day = date.toLocaleDateString("en-US", { weekday: "short" });
          activityPerDay[day] = (activityPerDay[day] || 0) + (Number(entry.duration) || 0);
        }
      });

      const sleepChartData = days.map((day) => +(sleepPerDay[day]?.toFixed(1) || 0));
      const activityChartData = days.map((day) => activityPerDay[day] || 0);
      setupSleepChart(sleepChartData);
      setupActivityChart(activityChartData);
    } catch (error) {
      console.error("Error fetching summary data:", error);
      setText("dashboardSleep", "Unavailable");
      setText("dashboardNutrition", "Unavailable");
      setText("dashboardActivity", "Unavailable");
      showChartEmpty("dashboardSleepChart", "We couldn't load sleep history");
      showChartEmpty("dashboardActivityChart", "We couldn't load activity history");
    }
  });
}

function setupSleepChart(data) {
  const canvas = document.getElementById("dashboardSleepChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (!data.some((value) => value > 0)) {
    showChartEmpty("dashboardSleepChart", "No sleep records yet");
    return;
  }
  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], datasets: [{ label: "Hours slept", data, backgroundColor: "rgba(15,155,142,0.12)", borderColor: "#0f9b8e", borderWidth: 2, tension: .4, pointBackgroundColor: "#0b7a70", pointRadius: 4 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { min: 0, max: 12, ticks: { stepSize: 1 }, title: { display: true, text: "Hours" } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.raw} hours` } } } }
  });
}

function setupActivityChart(data) {
  const canvas = document.getElementById("dashboardActivityChart");
  if (!canvas || typeof Chart === "undefined") return;
  if (!data.some((value) => value > 0)) {
    showChartEmpty("dashboardActivityChart", "No activity records yet");
    return;
  }
  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: { labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"], datasets: [{ label: "Exercise minutes", data, backgroundColor: "rgba(52,211,153,0.72)", borderRadius: 8 }] },
    options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: "Minutes" } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.raw} minutes` } } } }
  });
}

function setDailyQuote() {
  const quotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "The greatest wealth is health.", author: "Virgil" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" }
  ];
  const start = new Date(new Date().getFullYear(), 0, 0);
  const dayOfYear = Math.floor((new Date() - start) / 86400000);
  const quote = quotes[dayOfYear % quotes.length];
  const text = document.querySelector("#quoteOfTheDay .quote-text");
  const author = document.querySelector("#quoteOfTheDay .quote-author");
  if (text) text.textContent = `"${quote.text}"`;
  if (author) author.textContent = `— ${quote.author}`;
}
