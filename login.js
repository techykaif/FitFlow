import {
    auth,
    database,
    signInWithEmailAndPassword,
    ref,
    update,
    get,
} from "./firebaseConfig.js";

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

async function generateDeviceId() {
    const info =
        navigator.userAgent +
        navigator.language +
        screen.width +
        screen.height +
        screen.colorDepth +
        navigator.platform;

    const encoder = new TextEncoder();
    const data = encoder.encode(info);
    const hashBuffer = await crypto.subtle.digest("SHA-256", data);
    const hashArray = Array.from(new Uint8Array(hashBuffer));
    const hashHex = hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
    return "device_" + hashHex.slice(0, 16);
}

async function getDeviceId() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = await generateDeviceId();
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
}

function getCurrentIST() {
    const now = new Date();
    const options = {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    };
    return new Intl.DateTimeFormat("en-GB", options).format(now).replace(",", "");
}

function showRegistrationConfirmation() {
    const params = new URLSearchParams(window.location.search);
    if (params.get("registered") !== "1") return;

    const message = document.createElement("div");
    message.className = "registration-success-message";
    message.setAttribute("role", "status");
    message.innerHTML = '<i class="fa-solid fa-circle-check" aria-hidden="true"></i><span>Account created successfully. Log in with your new credentials to continue.</span>';

    const loginContainer = document.querySelector(".login-container");
    const form = document.getElementById("loginForm");
    if (loginContainer && form) loginContainer.insertBefore(message, form);

    window.history.replaceState({}, document.title, window.location.pathname);
}

document.addEventListener("DOMContentLoaded", function () {
    const loginBtn = document.getElementById("loginBtn");
    const emailInput = document.getElementById("email");
    const passwordInput = document.getElementById("password");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");

    loginBtn.addEventListener("click", login);

    emailInput.addEventListener("focus", () => {
        emailError.style.display = "none";
    });
    passwordInput.addEventListener("focus", () => {
        passwordError.style.display = "none";
    });

    showRegistrationConfirmation();
});

export async function login() {
    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value.trim();
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const loadingMessage = document.getElementById("loadingMessage");
    const incorrectMessage = document.getElementById("incorrectMessage");

    if (!validateEmail(email)) {
        emailError.textContent = "Please enter a valid email address";
        emailError.style.display = "block";
        return;
    }

    if (!validatePassword(password)) {
        passwordError.textContent = "Password must be at least 6 characters long";
        passwordError.style.display = "block";
        return;
    }

    loadingMessage.style.display = "block";
    incorrectMessage.style.display = "none";

    try {
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const formattedEmail = formatEmail(email);
        const currentLoginTime = getCurrentIST();
        const loginRef = ref(database, `users/${formattedEmail}/login_activity`);
        const deviceId = await getDeviceId();

        const snapshot = await get(loginRef);
        const loginData = snapshot.val();
        let previousLogins = [];

        if (loginData?.last_login) {
            previousLogins = loginData.previous_logins || [];
            previousLogins.push(loginData.last_login);
        }

        await update(loginRef, {
            last_login: currentLoginTime,
            previous_logins: previousLogins,
        });

        const sessionsRef = ref(database, `users/${formattedEmail}/sessions`);
        const sessionsSnapshot = await get(sessionsRef);
        const sessions = sessionsSnapshot.val() || {};
        const sessionUpdates = {};

        Object.keys(sessions).forEach((key) => {
            sessionUpdates[`users/${formattedEmail}/sessions/${key}/active`] = false;
        });

        sessionUpdates[`users/${formattedEmail}/sessions/${deviceId}/active`] = true;
        sessionUpdates[`users/${formattedEmail}/sessions/${deviceId}/lastLogin`] = currentLoginTime;

        await update(ref(database), sessionUpdates);

        window.location.href = "dashboard.html";
    } catch (error) {
        console.error("Login failed:", error.message);
        incorrectMessage.style.display = "block";
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
    } finally {
        loadingMessage.style.display = "none";
    }
}

function validateEmail(email) {
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

document.addEventListener("DOMContentLoaded", () => {
    const toggle = document.getElementById("togglePassword");
    if (!toggle) return;

    toggle.addEventListener("click", function () {
        const passwordField = document.getElementById("password");
        const icon = this.querySelector("i");
        const isPassword = passwordField.type === "password";

        passwordField.type = isPassword ? "text" : "password";
        if (icon) {
            icon.classList.toggle("fa-eye", !isPassword);
            icon.classList.toggle("fa-eye-slash", isPassword);
        }
    });
});
