import { auth, database, onAuthStateChanged, ref, get, push, set, remove } from "./firebaseConfig.js";

let formattedEmail = "";
let records = [];
let goals = JSON.parse(localStorage.getItem("sleepGoals") || "null") || { targetHours: 8, targetDays: 5 };
let chart = null;
let editingId = null;

const $ = (id) => document.getElementById(id);
const icon = (className) => { const el = document.createElement("i"); el.className = className; el.setAttribute("aria-hidden", "true"); return el; };
const formatDate = (value) => { const date = new Date(`${value}T00:00:00`); return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" }); };
const formatTime = (value) => { const [h, m] = value.split(":").map(Number); const date = new Date(); date.setHours(h, m, 0, 0); return date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" }); };

function calculateDuration(start, wake) {
    if (!start || !wake) return 0;
    const [sh, sm] = start.split(":").map(Number);
    const [wh, wm] = wake.split(":").map(Number);
    let minutes = (wh * 60 + wm) - (sh * 60 + sm);
    if (minutes <= 0) minutes += 24 * 60;
    return minutes / 60;
}

function durationText(hours) {
    const whole = Math.floor(hours);
    return `${whole}h ${Math.round((hours - whole) * 60)}m`;
}

function recommendation(hours) {
    if (hours < 6) return "You logged less than 6 hours. Consider protecting a longer sleep window tonight.";
    if (hours < 7) return "You are below the common 7–9 hour adult sleep range. A little more rest may help.";
    if (hours <= 9) return "Your logged duration is within the common 7–9 hour adult range.";
    return "You logged more than 9 hours. Track the pattern and how rested you feel rather than judging one night.";
}

function initChart() {
    const canvas = $("sleepChart");
    if (!canvas || typeof Chart === "undefined") return;
    chart = new Chart(canvas.getContext("2d"), {
        type: "line",
        data: { labels: [], datasets: [{ label: "Sleep hours", data: [], borderWidth: 2, tension: .35, fill: true }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, suggestedMax: 10, title: { display: true, text: "Hours" } } }, plugins: { legend: { display: false } } },
    });
}

function updateChart(type = "weekly") {
    if (!chart) return;
    const limit = type === "monthly" ? 30 : 7;
    let selected = [...records].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-limit);
    if (type === "quality") selected = selected.slice(-30);
    chart.data.labels = selected.map((record) => new Date(`${record.date}T00:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric" }));
    chart.data.datasets[0].label = type === "quality" ? "Sleep quality" : "Sleep hours";
    chart.data.datasets[0].data = selected.map((record) => type === "quality" ? ({ Poor: 1, Average: 2, Good: 3, Excellent: 4 }[record.quality] || 0) : Number(record.duration) || 0);
    chart.options.scales.y.suggestedMax = type === "quality" ? 4 : 10;
    chart.update();
}

function renderRecords() {
    const container = $("sleepRecordsList");
    if (!container) return;
    let filtered = [...records];
    const filter = $("filterMonth")?.value || "all";
    const sort = $("sortBy")?.value || "date-desc";
    const now = new Date();
    if (filter !== "all") {
        const month = filter === "current" ? now.getMonth() : (now.getMonth() + 11) % 12;
        const year = filter === "last" && now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear();
        filtered = filtered.filter((record) => { const date = new Date(`${record.date}T00:00:00`); return date.getMonth() === month && date.getFullYear() === year; });
    }
    const quality = { Poor: 1, Average: 2, Good: 3, Excellent: 4 };
    filtered.sort((a, b) => sort === "date-asc" ? new Date(a.date) - new Date(b.date) : sort === "duration-desc" ? b.duration - a.duration : sort === "duration-asc" ? a.duration - b.duration : sort === "quality-desc" ? quality[b.quality] - quality[a.quality] : new Date(b.date) - new Date(a.date));

    container.replaceChildren();
    if (!filtered.length) {
        const empty = document.createElement("div");
        empty.className = "empty-state";
        const iconWrap = document.createElement("div"); iconWrap.className = "empty-icon"; iconWrap.appendChild(icon("fa-solid fa-bed"));
        const text = document.createElement("p"); text.textContent = "No sleep records found. Start tracking your sleep above.";
        empty.append(iconWrap, text); container.appendChild(empty); return;
    }

    filtered.forEach((record) => {
        const row = document.createElement("article"); row.className = "sleep-record";
        const date = document.createElement("div"); date.className = "record-date"; date.textContent = formatDate(record.date);
        const time = document.createElement("div"); time.className = "record-time"; time.textContent = `${formatTime(record.sleepStart)} – ${formatTime(record.wakeTime)}`;
        const duration = document.createElement("div"); duration.className = "record-duration"; duration.textContent = record.durationFormatted || durationText(record.duration);
        const qualityEl = document.createElement("div"); qualityEl.className = "record-quality";
        const indicator = document.createElement("span"); indicator.className = `quality-indicator quality-${record.quality}`; indicator.setAttribute("aria-hidden", "true");
        qualityEl.append(indicator, document.createTextNode(record.quality || "Not rated"));
        const actions = document.createElement("div"); actions.className = "record-actions";
        [["view-btn", "fa-solid fa-eye", "View details"], ["edit-btn", "fa-solid fa-pen", "Edit record"], ["delete-btn", "fa-solid fa-trash", "Delete record"]].forEach(([cls, iconName, label]) => {
            const button = document.createElement("button"); button.type = "button"; button.className = `action-btn ${cls}`; button.setAttribute("aria-label", `${label}: ${formatDate(record.date)}`); button.appendChild(icon(iconName));
            button.addEventListener("click", () => cls === "view-btn" ? viewRecord(record) : cls === "edit-btn" ? editRecord(record) : deleteRecord(record.id));
            actions.appendChild(button);
        });
        row.append(date, time, duration, qualityEl, actions); container.appendChild(row);
    });
}

function updateStats() {
    const recent = records.filter((record) => { const date = new Date(`${record.date}T00:00:00`); const cutoff = new Date(); cutoff.setDate(cutoff.getDate() - 6); return date >= cutoff; });
    const average = recent.length ? recent.reduce((sum, record) => sum + Number(record.duration || 0), 0) / recent.length : 0;
    const quality = recent.length ? recent.reduce((sum, record) => sum + ({ Poor: 1, Average: 2, Good: 3, Excellent: 4 }[record.quality] || 0), 0) / recent.length : 0;
    $("averageSleep").textContent = durationText(average);
    $("averageQuality").textContent = quality ? ["", "Poor", "Average", "Good", "Excellent"][Math.round(quality)] : "--";
    $("sleepGoalProgress").textContent = `${Math.min(100, Math.round((average / Number(goals.targetHours || 8)) * 100))}%`;
    const streak = [...records].sort((a, b) => new Date(b.date) - new Date(a.date)).reduce((count, record) => count + (Number(record.duration) >= 7 ? 1 : 0), 0);
    $("currentStreak").textContent = String(streak);
    const goalDays = recent.filter((record) => Number(record.duration) >= Number(goals.targetHours)).length;
    $("weeklyProgressBar").style.width = `${Math.min(100, (goalDays / Number(goals.targetDays || 5)) * 100)}%`;
    $("weeklyProgressText").textContent = `${goalDays}/${goals.targetDays} target days`;
    $("sleepInsights").querySelector("p").textContent = recent.length ? recommendation(average) : "Log your sleep to see recovery guidance.";
}

function renderDayIndicators() {
    const indicators = document.querySelectorAll(".day-indicator");
    const dates = new Set(records.filter((record) => Number(record.duration) >= Number(goals.targetHours)).map((record) => record.date));
    const today = new Date();
    indicators.forEach((indicator) => {
        const offset = Number(indicator.dataset.day);
        const date = new Date(today); date.setDate(today.getDate() - ((today.getDay() - offset + 7) % 7));
        indicator.classList.toggle("completed", dates.has(date.toISOString().split("T")[0]));
    });
}

async function loadRecords() {
    try {
        const snapshot = await get(ref(database, `users/${formattedEmail}/sleep`));
        records = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, value]) => ({ id, ...value })) : [];
        renderRecords(); updateStats(); renderDayIndicators(); updateChart("weekly");
    } catch (error) {
        console.error("Error loading sleep records:", error);
        const list = $("sleepRecordsList"); if (list) { list.replaceChildren(); const errorEl = document.createElement("div"); errorEl.className = "loading-error"; errorEl.textContent = "We couldn't load your sleep records. Please refresh and try again."; list.appendChild(errorEl); }
    }
}

function resetForm() {
    $("sleepQuality").value = ""; $("sleepNotes").value = ""; $("calculatedHours").value = ""; $("sleepRecommendation").textContent = ""; editingId = null;
    const button = $("saveSleepBtn"); button.replaceChildren(icon("fa-solid fa-check"), document.createTextNode(" Save sleep record"));
}

async function saveRecord(event) {
    event.preventDefault();
    if (!$("sleepDate").value || !$("sleepStart").value || !$("wakeTime").value || !$("sleepQuality").value) { alert("Please fill in all required fields."); return; }
    const duration = calculateDuration($("sleepStart").value, $("wakeTime").value);
    const record = { date: $("sleepDate").value, sleepStart: $("sleepStart").value, wakeTime: $("wakeTime").value, quality: $("sleepQuality").value, duration, durationFormatted: durationText(duration), notes: $("sleepNotes").value.trim(), timestamp: Date.now() };
    try {
        if (editingId) { await set(ref(database, `users/${formattedEmail}/sleep/${editingId}`), record); } else { await set(push(ref(database, `users/${formattedEmail}/sleep`)), record); }
        resetForm(); await loadRecords();
    } catch (error) { console.error("Error saving sleep record:", error); alert("We couldn't save your sleep record. Please try again."); }
}

function editRecord(record) {
    $("sleepDate").value = record.date; $("sleepStart").value = record.sleepStart; $("wakeTime").value = record.wakeTime; $("sleepQuality").value = record.quality; $("sleepNotes").value = record.notes || ""; $("calculatedHours").value = record.durationFormatted || durationText(record.duration); $("sleepRecommendation").textContent = recommendation(Number(record.duration)); editingId = record.id;
    const button = $("saveSleepBtn"); button.replaceChildren(icon("fa-solid fa-pen"), document.createTextNode(" Update sleep record"));
    $("sleepDate").closest(".sleep-tracker-section")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function viewRecord(record) {
    const modal = $("sleepDetailModal"); const content = $("modalContent"); if (!modal || !content) return;
    content.replaceChildren();
    [["Date", formatDate(record.date)], ["Sleep time", `${formatTime(record.sleepStart)} – ${formatTime(record.wakeTime)}`], ["Duration", record.durationFormatted || durationText(record.duration)], ["Quality", record.quality || "Not rated"], ["Notes", record.notes || "No notes"]].forEach(([label, value]) => { const group = document.createElement("div"); group.className = "detail-group"; const l = document.createElement("div"); l.className = "detail-label"; l.textContent = label; const v = document.createElement("div"); v.className = "detail-value"; v.textContent = value; group.append(l, v); content.appendChild(group); });
    modal.style.display = "flex";
}

async function deleteRecord(id) {
    if (!confirm("Are you sure you want to delete this sleep record?")) return;
    try { await remove(ref(database, `users/${formattedEmail}/sleep/${id}`)); await loadRecords(); } catch (error) { console.error("Error deleting sleep record:", error); alert("We couldn't delete that record. Please try again."); }
}

document.addEventListener("DOMContentLoaded", () => {
    $("sleepDate").valueAsDate = new Date(); $("sleepGoalHours").value = goals.targetHours; $("sleepGoalDays").value = goals.targetDays;
    $("sleepStart").addEventListener("change", () => { const hours = calculateDuration($("sleepStart").value, $("wakeTime").value); $("calculatedHours").value = hours ? durationText(hours) : ""; $("sleepRecommendation").textContent = hours ? recommendation(hours) : ""; });
    $("wakeTime").addEventListener("change", () => { const hours = calculateDuration($("sleepStart").value, $("wakeTime").value); $("calculatedHours").value = hours ? durationText(hours) : ""; $("sleepRecommendation").textContent = hours ? recommendation(hours) : ""; });
    $("saveSleepBtn").addEventListener("click", saveRecord); $("filterMonth").addEventListener("change", renderRecords); $("sortBy").addEventListener("change", renderRecords);
    $("saveGoalBtn").addEventListener("click", () => { goals = { targetHours: Number($("sleepGoalHours").value) || 8, targetDays: Number($("sleepGoalDays").value) || 5 }; localStorage.setItem("sleepGoals", JSON.stringify(goals)); updateStats(); renderDayIndicators(); });
    document.querySelectorAll(".chart-tab").forEach((tab) => tab.addEventListener("click", () => { document.querySelectorAll(".chart-tab").forEach((item) => item.classList.remove("active")); tab.classList.add("active"); updateChart(tab.dataset.chart); }));
    $("close-modal")?.addEventListener("click", () => $("sleepDetailModal").style.display = "none");
    document.querySelector(".close-modal")?.addEventListener("click", () => $("sleepDetailModal").style.display = "none");
    window.addEventListener("click", (event) => { if (event.target === $("sleepDetailModal")) $("sleepDetailModal").style.display = "none"; });
    initChart();
    onAuthStateChanged(auth, (user) => { if (!user) { window.location.href = "tracker.html"; return; } formattedEmail = formatEmail(user.email); loadRecords(); });
});
