import { auth, database, ref, get, onAuthStateChanged } from "./firebaseConfig.js";

document.addEventListener("DOMContentLoaded", function () {
  loadSummaryData();
  setDailyQuote();
});

function formatEmail(email) {
  return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
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
      const [sleepSnap, nutritionSnap, activitySnap] = await Promise.all([
        get(sleepRef),
        get(nutritionRef),
        get(activityRef),
      ]);

      let sleepChartData = [0, 0, 0, 0, 0, 0, 0];
      if (sleepSnap.exists()) {
        const sleepData = Object.values(sleepSnap.val());
        const sleepDurations = [];
        const sleepPerDay = {};

        sleepData.forEach((entry) => {
          let duration = Number(entry.duration) || 0;
          if (!duration && entry.sleepStart && entry.wakeTime) {
            const start = new Date(`1970-01-01T${entry.sleepStart}`);
            const end = new Date(`1970-01-02T${entry.wakeTime}`);
            duration = (end - start) / (1000 * 60 * 60);
          }

          if (duration > 0 && duration < 24) {
            sleepDurations.push(duration);
            const date = new Date(entry.date);
            if (!Number.isNaN(date.getTime())) {
              const day = date.toLocaleDateString("en-US", { weekday: "short" });
              sleepPerDay[day] = (sleepPerDay[day] || 0) + duration;
            }
          }
        });

        const avgSleep = sleepDurations.length
          ? sleepDurations.reduce((a, b) => a + b, 0) / sleepDurations.length
          : 0;
        document.getElementById("dashboardSleep").textContent = `${avgSleep.toFixed(1)} hrs`;
        sleepChartData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => +(sleepPerDay[day]?.toFixed(1) || 0));
      } else {
        document.getElementById("dashboardSleep").textContent = "0 hrs";
      }

      setupSleepChart(sleepChartData);

      if (nutritionSnap.exists()) {
        const nutritionData = Object.values(nutritionSnap.val());
        const totalCalories = nutritionData.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0);
        document.getElementById("dashboardNutrition").textContent = `${Math.round(totalCalories)} cal`;
      } else {
        document.getElementById("dashboardNutrition").textContent = "0 cal";
      }

      let activityChartData = [0, 0, 0, 0, 0, 0, 0];
      if (activitySnap.exists()) {
        const activityData = Object.values(activitySnap.val());
        const totalMinutes = activityData.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
        document.getElementById("dashboardActivity").textContent = `${Math.round(totalMinutes)} min`;

        const activityPerDay = {};
        activityData.forEach((entry) => {
          const date = new Date(entry.date);
          if (!Number.isNaN(date.getTime())) {
            const day = date.toLocaleDateString("en-US", { weekday: "short" });
            activityPerDay[day] = (activityPerDay[day] || 0) + (Number(entry.duration) || 0);
          }
        });
        activityChartData = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"].map((day) => activityPerDay[day] || 0);
      } else {
        document.getElementById("dashboardActivity").textContent = "0 min";
      }

      setupActivityChart(activityChartData);
    } catch (error) {
      console.error("Error fetching summary data:", error);
    }
  });
}

function setupSleepChart(sleepChartData) {
  const canvas = document.getElementById("dashboardSleepChart");
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas.getContext("2d"), {
    type: "line",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        label: "Hours Slept",
        data: sleepChartData,
        backgroundColor: "rgba(15,155,142,0.12)",
        borderColor: "#0f9b8e",
        borderWidth: 2,
        tension: 0.4,
        pointBackgroundColor: "#0b7a70",
        pointRadius: 4,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { min: 0, max: 12, ticks: { stepSize: 1 }, title: { display: true, text: "Hours" } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.raw} hours` } } },
    },
  });
}

function setupActivityChart(activityChartData) {
  const canvas = document.getElementById("dashboardActivityChart");
  if (!canvas || typeof Chart === "undefined") return;

  new Chart(canvas.getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
      datasets: [{
        label: "Exercise Minutes",
        data: activityChartData,
        backgroundColor: "rgba(52,211,153,0.72)",
        borderRadius: 8,
      }],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      scales: { y: { beginAtZero: true, max: 120, title: { display: true, text: "Minutes" } } },
      plugins: { legend: { display: false }, tooltip: { callbacks: { label: (context) => `${context.raw} minutes` } } },
    },
  });
}

function setDailyQuote() {
  const quotes = [
    { text: "The secret of getting ahead is getting started.", author: "Mark Twain" },
    { text: "The only bad workout is the one that didn't happen.", author: "Unknown" },
    { text: "Take care of your body. It's the only place you have to live.", author: "Jim Rohn" },
    { text: "The greatest wealth is health.", author: "Virgil" },
    { text: "It is health that is real wealth and not pieces of gold and silver.", author: "Mahatma Gandhi" },
    { text: "You're only one workout away from a good mood.", author: "Unknown" },
    { text: "Strength does not come from physical capacity. It comes from an indomitable will.", author: "Mahatma Gandhi" },
    { text: "Don't count the days, make the days count.", author: "Muhammad Ali" },
  ];
  const today = new Date();
  const dayOfYear = getDayOfYear(today);
  const quote = quotes[dayOfYear % quotes.length];
  const text = document.querySelector("#quoteOfTheDay .quote-text");
  const author = document.querySelector("#quoteOfTheDay .quote-author");
  if (text) text.textContent = `"${quote.text}"`;
  if (author) author.textContent = `— ${quote.author}`;
}

function getDayOfYear(date) {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date - start;
  return Math.floor(diff / 86400000);
}
