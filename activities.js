import { auth, database, onAuthStateChanged, ref, get, push, set, update } from "./firebaseConfig.js";

let formattedEmail = "";
let activitiesCache = [];
let caloriesChart = null;
let editingActivityId = null;

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function icon(className) {
    const element = document.createElement("i");
    element.className = className;
    element.setAttribute("aria-hidden", "true");
    return element;
}

function renderState(container, className, title, description, iconName) {
    container.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = className;
    if (iconName) {
        const iconWrap = document.createElement("div");
        iconWrap.className = "empty-state-icon";
        iconWrap.appendChild(icon(iconName));
        wrapper.appendChild(iconWrap);
    }
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = description;
    wrapper.append(heading, text);
    container.appendChild(wrapper);
}

function initChart() {
    const canvas = document.getElementById("calories-chart");
    if (!canvas || typeof Chart === "undefined") return;
    caloriesChart = new Chart(canvas.getContext("2d"), {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Calories Burned", data: [], backgroundColor: "rgba(76, 175, 80, .6)", borderColor: "rgba(76, 175, 80, 1)", borderWidth: 1 }] },
        options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, title: { display: true, text: "Calories" } }, x: { title: { display: true, text: "Date" } } } },
    });
}

function updateChart(activities) {
    if (!caloriesChart) return;
    const days = [];
    const today = new Date();
    for (let i = 6; i >= 0; i -= 1) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        days.push(date.toISOString().split("T")[0]);
    }
    const totals = Object.fromEntries(days.map((day) => [day, 0]));
    activities.forEach((activity) => {
        if (totals[activity.date] !== undefined) totals[activity.date] += Number(activity.calories) || 0;
    });
    caloriesChart.data.labels = days.map((day) => new Date(`${day}T00:00:00`).toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" }));
    caloriesChart.data.datasets[0].data = days.map((day) => totals[day]);
    caloriesChart.update();
}

function updateEditButton() {
    const button = document.querySelector(".save-activity-btn");
    if (!button) return;
    button.replaceChildren();
    button.appendChild(icon(editingActivityId ? "fa-solid fa-pen" : "fa-solid fa-check"));
    button.appendChild(document.createTextNode(editingActivityId ? " Update activity" : " Save activity"));
}

function resetForm() {
    const form = document.getElementById("activity-form");
    form.reset();
    document.getElementById("activity-date").valueAsDate = new Date();
    editingActivityId = null;
    updateEditButton();
}

function editActivity(activity) {
    document.getElementById("activity-name").value = activity.name || "";
    document.getElementById("activity-duration").value = activity.duration ?? "";
    document.getElementById("activity-calories").value = activity.calories ?? "";
    document.getElementById("activity-date").value = activity.date || "";
    document.getElementById("activity-notes").value = activity.notes || "";
    editingActivityId = activity.id;
    updateEditButton();
    document.querySelector(".activity-form-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderActivities(activities) {
    const list = document.getElementById("activities-list");
    if (!list) return;
    if (!activities.length) {
        renderState(list, "no-activities", "No activities found", "Add your first activity above or adjust your search.", "fa-solid fa-person-running");
        return;
    }

    list.replaceChildren();
    activities.forEach((activity) => {
        const item = document.createElement("article");
        item.className = "activity-item";

        const details = document.createElement("div");
        details.className = "activity-details";
        const heading = document.createElement("h3");
        heading.textContent = activity.name || "Unnamed activity";
        const notes = document.createElement("p");
        notes.textContent = activity.notes || "No notes";
        details.append(heading, notes);

        const meta = document.createElement("div");
        meta.className = "activity-meta";
        [["fa-regular fa-calendar", new Date(`${activity.date}T00:00:00`).toLocaleDateString()], ["fa-regular fa-clock", `${activity.duration || 0} min`], ["fa-solid fa-fire-flame-curved", `${activity.calories || 0} cal`]].forEach(([iconName, text]) => {
            const span = document.createElement("span");
            span.append(icon(iconName), document.createTextNode(` ${text}`));
            meta.appendChild(span);
        });

        const actions = document.createElement("div");
        actions.className = "activity-actions";
        const edit = document.createElement("button");
        edit.type = "button";
        edit.className = "edit-btn";
        edit.setAttribute("aria-label", `Edit ${activity.name || "activity"}`);
        edit.appendChild(icon("fa-solid fa-pen"));
        edit.addEventListener("click", () => editActivity(activity));
        const del = document.createElement("button");
        del.type = "button";
        del.className = "delete-btn";
        del.setAttribute("aria-label", `Delete ${activity.name || "activity"}`);
        del.appendChild(icon("fa-solid fa-trash"));
        del.addEventListener("click", () => deleteActivity(activity.id));
        actions.append(edit, del);

        item.append(details, meta, actions);
        list.appendChild(item);
    });
}

function applyFilters() {
    const search = (document.getElementById("activity-search")?.value || "").trim().toLowerCase();
    const sort = document.getElementById("activity-sort")?.value || "date-desc";
    const filtered = activitiesCache.filter((activity) => `${activity.name || ""} ${activity.notes || ""}`.toLowerCase().includes(search));
    filtered.sort((a, b) => {
        if (sort === "date-asc") return new Date(a.date) - new Date(b.date);
        if (sort === "calories-desc") return (Number(b.calories) || 0) - (Number(a.calories) || 0);
        if (sort === "calories-asc") return (Number(a.calories) || 0) - (Number(b.calories) || 0);
        if (sort === "duration-desc") return (Number(b.duration) || 0) - (Number(a.duration) || 0);
        if (sort === "duration-asc") return (Number(a.duration) || 0) - (Number(b.duration) || 0);
        return new Date(b.date) - new Date(a.date);
    });
    renderActivities(filtered);
}

async function loadActivities() {
    const list = document.getElementById("activities-list");
    if (list) renderState(list, "loading-activities", "Loading activities", "Your recent movement records are being loaded.", "fa-solid fa-circle-notch fa-spin");
    try {
        const snapshot = await get(ref(database, `users/${formattedEmail}/activities`));
        activitiesCache = snapshot.exists() ? Object.entries(snapshot.val()).map(([id, activity]) => ({ id, ...activity })) : [];
        applyFilters();
        updateChart(activitiesCache);
    } catch (error) {
        console.error("Error loading activities:", error);
        if (list) renderState(list, "loading-error", "We couldn't load your activities", "Please refresh and try again.");
    }
}

async function deleteActivity(id) {
    if (!id || !confirm("Are you sure you want to delete this activity?")) return;
    try {
        await update(ref(database), { [`users/${formattedEmail}/activities/${id}`]: null });
        await loadActivities();
    } catch (error) {
        console.error("Error deleting activity:", error);
        alert("We couldn't delete that activity. Please try again.");
    }
}

async function saveActivity(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;
    const activity = {
        name: document.getElementById("activity-name").value.trim(),
        duration: Number(document.getElementById("activity-duration").value) || 0,
        calories: Number(document.getElementById("activity-calories").value) || 0,
        date: document.getElementById("activity-date").value,
        notes: document.getElementById("activity-notes").value.trim(),
    };
    try {
        if (editingActivityId) {
            await update(ref(database, `users/${formattedEmail}/activities/${editingActivityId}`), { ...activity, updated: Date.now() });
        } else {
            await set(push(ref(database, `users/${formattedEmail}/activities`)), { ...activity, timestamp: Date.now() });
        }
        resetForm();
        await loadActivities();
    } catch (error) {
        console.error("Error saving activity:", error);
        alert("We couldn't save that activity. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    document.getElementById("activity-date").valueAsDate = new Date();
    document.getElementById("activity-form")?.addEventListener("submit", saveActivity);
    document.getElementById("activity-sort")?.addEventListener("change", applyFilters);
    document.getElementById("activity-search")?.addEventListener("input", applyFilters);
    initChart();

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "tracker.html";
            return;
        }
        formattedEmail = formatEmail(user.email);
        loadActivities();
    });
});
