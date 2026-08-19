import "./components/icon-system.js";
import { auth, database, ref, get, onAuthStateChanged } from "./firebaseConfig.js";

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function renderAvatar(element, user, name) {
    if (!element) return;
    element.replaceChildren();

    if (user?.photoURL) {
        const image = document.createElement("img");
        image.src = user.photoURL;
        image.alt = "Profile photo";
        image.referrerPolicy = "no-referrer";
        image.addEventListener("error", () => {
            element.textContent = (name || "U").charAt(0).toUpperCase();
        }, { once: true });
        element.appendChild(image);
        return;
    }

    element.textContent = (name || "U").charAt(0).toUpperCase();
}

function renderDailyPlan({ averageSleep, totalActivity, totalCalories, hasSleep, hasActivity, hasNutrition }) {
    const element = document.getElementById("daily-plan");
    if (!element) return;

    const actions = [];

    if (!hasSleep) {
        actions.push({ icon: "fa-bed", title: "Log your sleep", text: "Start with one sleep record so FitFlow can track your recovery." });
    } else if (averageSleep < 7) {
        actions.push({ icon: "fa-bed", title: "Protect your recovery", text: `Your recorded average is ${averageSleep.toFixed(1)} hours. Aim for a consistent 7–9 hour window.` });
    } else {
        actions.push({ icon: "fa-bed", title: "Keep your sleep routine steady", text: `You're averaging ${averageSleep.toFixed(1)} hours. Consistency is the next win.` });
    }

    if (!hasActivity) {
        actions.push({ icon: "fa-person-walking", title: "Move for 20 minutes", text: "A walk, mobility session, or workout is enough to start today's momentum." });
    } else if (totalActivity < 150) {
        actions.push({ icon: "fa-person-running", title: "Build your movement base", text: `${Math.round(totalActivity)} minutes are recorded. Add a manageable session today.` });
    } else {
        actions.push({ icon: "fa-person-running", title: "Balance training and recovery", text: `${Math.round(totalActivity)} minutes are recorded. Keep movement consistent without overloading yourself.` });
    }

    if (!hasNutrition) {
        actions.push({ icon: "fa-utensils", title: "Log your next meal", text: "A few meal records make your nutrition trends much more useful." });
    } else {
        actions.push({ icon: "fa-apple-whole", title: "Keep nutrition consistent", text: `${Math.round(totalCalories).toLocaleString()} calories are recorded. Focus on balanced meals and hydration.` });
    }

    element.innerHTML = actions.map((action, index) => `
        <article class="plan-item">
            <span class="plan-number">${String(index + 1).padStart(2, "0")}</span>
            <span class="card-icon"><i class="fa-solid ${action.icon}" aria-hidden="true"></i></span>
            <div><strong>${action.title}</strong><p>${action.text}</p></div>
        </article>
    `).join("");
}

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const formattedEmail = formatEmail(user.email);
    const userRef = ref(database, `users/${formattedEmail}/personal_information`);
    const sleepRef = ref(database, `users/${formattedEmail}/sleep`);
    const nutritionRef = ref(database, `users/${formattedEmail}/nutrition`);
    const activityRef = ref(database, `users/${formattedEmail}/activities`);

    try {
        const [profileSnapshot, sleepSnapshot, nutritionSnapshot, activitySnapshot] = await Promise.all([
            get(userRef),
            get(sleepRef),
            get(nutritionRef),
            get(activityRef),
        ]);

        const profile = profileSnapshot.exists() ? profileSnapshot.val() : {};
        const name = profile.name || user.displayName || "User";
        const userName = document.getElementById("user-name");
        const welcomeName = document.getElementById("user-name1");
        if (userName) userName.textContent = name;
        if (welcomeName) welcomeName.textContent = name;
        renderAvatar(document.getElementById("user-avatar"), user, name);

        const sleepEntries = sleepSnapshot.exists() ? Object.values(sleepSnapshot.val()) : [];
        const nutritionEntries = nutritionSnapshot.exists() ? Object.values(nutritionSnapshot.val()) : [];
        const activityEntries = activitySnapshot.exists() ? Object.values(activitySnapshot.val()) : [];

        const sleepValues = sleepEntries.map((entry) => {
            let duration = Number(entry.duration) || 0;
            if (!duration && entry.sleepStart && entry.wakeTime) {
                const start = new Date(`1970-01-01T${entry.sleepStart}`);
                const end = new Date(`1970-01-02T${entry.wakeTime}`);
                duration = (end - start) / (1000 * 60 * 60);
            }
            return duration > 0 && duration < 24 ? duration : 0;
        }).filter(Boolean);

        const averageSleep = sleepValues.length ? sleepValues.reduce((a, b) => a + b, 0) / sleepValues.length : 0;
        const totalActivity = activityEntries.reduce((sum, entry) => sum + (Number(entry.duration) || 0), 0);
        const totalCalories = nutritionEntries.reduce((sum, entry) => sum + (Number(entry.calories) || 0), 0);

        renderDailyPlan({
            averageSleep,
            totalActivity,
            totalCalories,
            hasSleep: sleepEntries.length > 0,
            hasActivity: activityEntries.length > 0,
            hasNutrition: nutritionEntries.length > 0,
        });
    } catch (error) {
        console.error("Error loading dashboard plan:", error);
        const element = document.getElementById("daily-plan");
        if (element) {
            element.innerHTML = `<article class="plan-item"><span class="card-icon"><i class="fa-solid fa-circle-info" aria-hidden="true"></i></span><div><strong>Start with one small action</strong><p>Log your sleep, a meal, or an activity and FitFlow will build your next steps from your own data.</p></div></article>`;
        }
    }
});
