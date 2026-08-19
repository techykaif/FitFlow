import {
    auth,
    database,
    onAuthStateChanged,
    ref,
    get,
    push,
    set,
    update,
    remove,
} from "./firebaseConfig.js";

let formattedEmail = "";
let currentMealId = null;
let macroChart = null;
let calorieChart = null;
let mealsCache = [];

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function setMessage(container, className, text) {
    container.replaceChildren();
    const element = document.createElement("div");
    element.className = className;
    element.textContent = text;
    container.appendChild(element);
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return Number.isNaN(date.getTime())
        ? dateString
        : date.toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric", year: "numeric" });
}

function createIcon(className) {
    const icon = document.createElement("i");
    icon.className = className;
    icon.setAttribute("aria-hidden", "true");
    return icon;
}

function initCharts() {
    const macroCanvas = document.getElementById("macro-chart");
    const calorieCanvas = document.getElementById("calorie-chart");
    if (!macroCanvas || !calorieCanvas || typeof Chart === "undefined") return;

    macroChart = new Chart(macroCanvas.getContext("2d"), {
        type: "pie",
        data: {
            labels: ["Protein", "Carbs", "Fats"],
            datasets: [{ data: [0, 0, 0], backgroundColor: ["rgba(54, 162, 235, .7)", "rgba(255, 206, 86, .7)", "rgba(255, 99, 132, .7)"] }],
        },
        options: { responsive: true, maintainAspectRatio: false },
    });

    calorieChart = new Chart(calorieCanvas.getContext("2d"), {
        type: "bar",
        data: { labels: [], datasets: [{ label: "Calories", data: [], backgroundColor: "rgba(75, 192, 192, .7)" }] },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                y: { beginAtZero: true, title: { display: true, text: "Calories (kcal)" } },
                x: { title: { display: true, text: "Date" } },
            },
        },
    });
}

function updateCharts(meals) {
    if (!macroChart || !calorieChart) return;

    const totals = meals.reduce((acc, meal) => ({
        protein: acc.protein + (Number(meal.protein) || 0),
        carbs: acc.carbs + (Number(meal.carbs) || 0),
        fats: acc.fats + (Number(meal.fats) || 0),
    }), { protein: 0, carbs: 0, fats: 0 });

    macroChart.data.datasets[0].data = [totals.protein, totals.carbs, totals.fats];

    const byDate = {};
    meals.forEach((meal) => {
        byDate[meal.date] = (byDate[meal.date] || 0) + (Number(meal.calories) || 0);
    });
    const dates = Object.keys(byDate).sort((a, b) => new Date(a) - new Date(b)).slice(-7);
    calorieChart.data.labels = dates.map(formatDate);
    calorieChart.data.datasets[0].data = dates.map((date) => byDate[date]);

    macroChart.update();
    calorieChart.update();
}

function updateDateFilter() {
    const select = document.getElementById("date-filter");
    if (!select) return;
    const current = select.value;
    while (select.options.length > 1) select.remove(1);

    [...new Set(mealsCache.map((meal) => meal.date))].sort((a, b) => new Date(b) - new Date(a)).forEach((date) => {
        const option = document.createElement("option");
        option.value = date;
        option.textContent = formatDate(date);
        select.appendChild(option);
    });
    if ([...select.options].some((option) => option.value === current)) select.value = current;
}

function renderEmpty(container, title, description) {
    container.replaceChildren();
    const wrapper = document.createElement("div");
    wrapper.className = "no-meals";
    const icon = document.createElement("div");
    icon.className = "empty-state-icon";
    icon.appendChild(createIcon("fa-solid fa-utensils"));
    icon.setAttribute("aria-hidden", "true");
    const heading = document.createElement("h3");
    heading.textContent = title;
    const text = document.createElement("p");
    text.textContent = description;
    wrapper.append(icon, heading, text);
    container.appendChild(wrapper);
}

function renderMeals(meals) {
    const mealLog = document.getElementById("meal-log");
    if (!mealLog) return;

    if (!meals.length) {
        renderEmpty(mealLog, "No meals found", "Log your first meal above or adjust the current filters.");
        return;
    }

    mealLog.replaceChildren();
    const groups = {};
    meals.forEach((meal) => (groups[meal.date] ||= []).push(meal));

    Object.keys(groups).sort((a, b) => new Date(b) - new Date(a)).forEach((date) => {
        const dateGroup = document.createElement("div");
        dateGroup.className = "date-group";

        const daily = groups[date];
        const totals = daily.reduce((acc, meal) => ({
            calories: acc.calories + (Number(meal.calories) || 0),
            protein: acc.protein + (Number(meal.protein) || 0),
            carbs: acc.carbs + (Number(meal.carbs) || 0),
            fats: acc.fats + (Number(meal.fats) || 0),
        }), { calories: 0, protein: 0, carbs: 0, fats: 0 });

        const dateHeader = document.createElement("div");
        dateHeader.className = "date-header";
        const dateTitle = document.createElement("div");
        dateTitle.textContent = formatDate(date);
        const total = document.createElement("div");
        total.className = "date-total";
        total.textContent = `Total: ${Math.round(totals.calories)} kcal (P: ${totals.protein.toFixed(1)}g, C: ${totals.carbs.toFixed(1)}g, F: ${totals.fats.toFixed(1)}g)`;
        dateHeader.append(dateTitle, total);
        dateGroup.appendChild(dateHeader);

        daily.forEach((meal) => {
            const item = document.createElement("article");
            item.className = "meal-item";

            const type = document.createElement("div");
            type.className = `meal-type ${String(meal.type || "").toLowerCase()}`;
            type.textContent = meal.type || "Meal";

            const details = document.createElement("div");
            details.className = "meal-details";
            const name = document.createElement("h3");
            name.textContent = meal.name || "Unnamed meal";
            const macros = document.createElement("div");
            macros.className = "meal-macros";
            [[`${meal.calories || 0} kcal`, "meal-calories"], [`P: ${meal.protein || 0}g`], [`C: ${meal.carbs || 0}g`], [`F: ${meal.fats || 0}g`]].forEach(([text, className]) => {
                const span = document.createElement("span");
                if (className) span.className = className;
                span.textContent = text;
                macros.appendChild(span);
            });
            details.append(name, macros);

            const actions = document.createElement("div");
            actions.className = "meal-actions";
            const edit = document.createElement("button");
            edit.type = "button";
            edit.className = "edit-btn";
            edit.setAttribute("aria-label", `Edit ${meal.name || "meal"}`);
            edit.appendChild(createIcon("fa-solid fa-pen"));
            edit.addEventListener("click", () => editMeal(meal));
            const del = document.createElement("button");
            del.type = "button";
            del.className = "delete-btn";
            del.setAttribute("aria-label", `Delete ${meal.name || "meal"}`);
            del.appendChild(createIcon("fa-solid fa-trash"));
            del.addEventListener("click", () => {
                if (confirm("Are you sure you want to delete this meal?")) deleteMeal(meal.id);
            });
            actions.append(edit, del);

            item.append(type, details, actions);
            dateGroup.appendChild(item);
        });

        mealLog.appendChild(dateGroup);
    });
}

function applyFilters() {
    const date = document.getElementById("date-filter")?.value || "all";
    const type = document.getElementById("meal-filter")?.value || "all";
    const search = (document.getElementById("food-search")?.value || "").trim().toLowerCase();
    const filtered = mealsCache.filter((meal) =>
        (date === "all" || meal.date === date) &&
        (type === "all" || meal.type === type) &&
        (!search || String(meal.name || "").toLowerCase().includes(search))
    );
    renderMeals(filtered);
}

async function loadMeals() {
    const mealLog = document.getElementById("meal-log");
    if (mealLog) setMessage(mealLog, "loading-meals", "Loading your meal data...");

    try {
        const snapshot = await get(ref(database, `users/${formattedEmail}/nutrition`));
        mealsCache = snapshot.exists()
            ? Object.entries(snapshot.val()).map(([id, meal]) => ({ id, ...meal }))
            : [];
        mealsCache.sort((a, b) => new Date(b.date) - new Date(a.date) || (Number(b.timestamp) || 0) - (Number(a.timestamp) || 0));
        updateDateFilter();
        applyFilters();
        updateCharts(mealsCache);
    } catch (error) {
        console.error("Error loading meals:", error);
        if (mealLog) setMessage(mealLog, "loading-error", "We couldn't load your meals. Please refresh and try again.");
    }
}

async function deleteMeal(id) {
    if (!id) return;
    try {
        await remove(ref(database, `users/${formattedEmail}/nutrition/${id}`));
        await loadMeals();
    } catch (error) {
        console.error("Error deleting meal:", error);
        alert("We couldn't delete that meal. Please try again.");
    }
}

function fillMealForm(meal) {
    document.getElementById("meal-type").value = meal.type || "";
    document.getElementById("food-name").value = meal.name || "";
    document.getElementById("calories").value = meal.calories ?? "";
    document.getElementById("protein").value = meal.protein ?? "";
    document.getElementById("carbs").value = meal.carbs ?? "";
    document.getElementById("fats").value = meal.fats ?? "";
    document.getElementById("meal-date").value = meal.date || "";
    currentMealId = meal.id;
    const submit = document.querySelector(".log-meal-btn");
    if (submit) {
        submit.innerHTML = "";
        submit.append(createIcon("fa-solid fa-pen"));
        submit.append(document.createTextNode(" Update meal"));
    }
    document.querySelector(".meal-form-container")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function editMeal(meal) {
    fillMealForm(meal);
}

function resetMealForm() {
    const form = document.getElementById("meal-form");
    form.reset();
    document.getElementById("meal-date").valueAsDate = new Date();
    currentMealId = null;
    const submit = document.querySelector(".log-meal-btn");
    if (submit) {
        submit.innerHTML = "";
        submit.append(createIcon("fa-solid fa-check"));
        submit.append(document.createTextNode(" Log meal"));
    }
}

async function saveMeal(event) {
    event.preventDefault();
    const form = event.currentTarget;
    if (!form.reportValidity()) return;

    const meal = {
        type: document.getElementById("meal-type").value,
        name: document.getElementById("food-name").value.trim(),
        calories: Number(document.getElementById("calories").value) || 0,
        protein: Number(document.getElementById("protein").value) || 0,
        carbs: Number(document.getElementById("carbs").value) || 0,
        fats: Number(document.getElementById("fats").value) || 0,
        date: document.getElementById("meal-date").value,
    };

    try {
        if (currentMealId) {
            await update(ref(database, `users/${formattedEmail}/nutrition/${currentMealId}`), { ...meal, updated: Date.now() });
        } else {
            await set(push(ref(database, `users/${formattedEmail}/nutrition`)), { ...meal, timestamp: Date.now() });
        }
        resetMealForm();
        await loadMeals();
    } catch (error) {
        console.error("Error saving meal:", error);
        alert("We couldn't save that meal. Please try again.");
    }
}

document.addEventListener("DOMContentLoaded", () => {
    const dateInput = document.getElementById("meal-date");
    if (dateInput) dateInput.valueAsDate = new Date();

    document.getElementById("meal-form")?.addEventListener("submit", saveMeal);
    document.getElementById("date-filter")?.addEventListener("change", applyFilters);
    document.getElementById("meal-filter")?.addEventListener("change", applyFilters);
    document.getElementById("food-search")?.addEventListener("input", applyFilters);

    initCharts();

    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "tracker.html";
            return;
        }
        formattedEmail = formatEmail(user.email);
        loadMeals();
    });
});
