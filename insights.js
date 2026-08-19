import { database, ref, get, child } from "./firebaseConfig.js";

function normalizeUserKey(value) {
    if (!value) return "";
    return value.includes("@")
        ? value.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_")
        : value;
}

async function fetchAllData(userKey) {
    const baseRef = ref(database, `users/${normalizeUserKey(userKey)}`);
    const [sleepSnap, nutritionSnap, activitySnap] = await Promise.all([
        get(child(baseRef, "sleep")),
        get(child(baseRef, "nutrition")),
        get(child(baseRef, "activities")),
    ]);

    return {
        sleep: sleepSnap.exists() ? Object.values(sleepSnap.val()) : [],
        nutrition: nutritionSnap.exists() ? Object.values(nutritionSnap.val()) : [],
        activity: activitySnap.exists() ? Object.values(activitySnap.val()) : [],
    };
}

function buildInsights(data) {
    const sleepValues = data.sleep
        .map((entry) => Number(entry.duration) || 0)
        .filter((value) => value > 0 && value < 24);
    const activityMinutes = data.activity.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
    const calories = data.nutrition.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0);
    const averageSleep = sleepValues.length
        ? sleepValues.reduce((sum, value) => sum + value, 0) / sleepValues.length
        : 0;

    const insights = [];

    if (!sleepValues.length) {
        insights.push({ icon: "fa-bed", title: "Start tracking sleep", text: "Add your first sleep record so FitFlow can identify recovery patterns." });
    } else if (averageSleep < 7) {
        insights.push({ icon: "fa-bed", title: "Prioritize recovery", text: `Your recorded average is ${averageSleep.toFixed(1)} hours. Aim for a consistent 7–9 hour sleep window.` });
    } else {
        insights.push({ icon: "fa-bed", title: "Sleep is on track", text: `Your recorded average is ${averageSleep.toFixed(1)} hours. Keep your sleep and wake times consistent.` });
    }

    if (activityMinutes === 0) {
        insights.push({ icon: "fa-person-running", title: "Add some movement", text: "A short walk or workout today is a simple way to build momentum." });
    } else if (activityMinutes < 150) {
        insights.push({ icon: "fa-person-running", title: "Build your activity base", text: `${Math.round(activityMinutes)} minutes are recorded. Gradually working toward 150 minutes per week is a useful benchmark.` });
    } else {
        insights.push({ icon: "fa-person-running", title: "Strong activity trend", text: `${Math.round(activityMinutes)} minutes are recorded. Keep balancing training with recovery.` });
    }

    if (calories === 0) {
        insights.push({ icon: "fa-apple-whole", title: "Log your meals", text: "Recording meals gives you a clearer picture of your nutrition patterns." });
    } else {
        insights.push({ icon: "fa-apple-whole", title: "Keep nutrition consistent", text: `${Math.round(calories).toLocaleString()} calories are recorded. Focus on balanced meals and steady hydration.` });
    }

    return insights;
}

function renderInsights(insights) {
    const element = document.getElementById("ai-insights");
    if (!element) return;

    element.innerHTML = insights.map((insight) => `
        <article class="insight-item">
            <span class="insight-icon"><i class="fa-solid ${insight.icon}" aria-hidden="true"></i></span>
            <div><strong>${insight.title}</strong><p>${insight.text}</p></div>
        </article>
    `).join("");
}

export async function generateAIInsights(userKey) {
    const element = document.getElementById("ai-insights");
    try {
        if (element) element.innerHTML = '<p class="insight-placeholder"><i class="fa-solid fa-circle-notch fa-spin" aria-hidden="true"></i> Preparing your insights...</p>';
        const data = await fetchAllData(userKey);
        renderInsights(buildInsights(data));
    } catch (error) {
        console.error("Smart insight generation failed:", error);
        if (element) element.innerHTML = '<p class="insight-placeholder"><i class="fa-solid fa-circle-exclamation" aria-hidden="true"></i> We could not load your insights right now.</p>';
    }
}
