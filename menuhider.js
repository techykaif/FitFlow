import { auth, database, ref, get, signOut, onAuthStateChanged } from "/firebaseConfig.js";

// Session validation is intentionally separate from public navigation.
// Public pages keep the same navigation whether the visitor is signed in or not.
function getDeviceId() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = "device-" + Math.random().toString(36).substring(2, 15);
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
}

function formatEmail(email) {
    return email.replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function showToast(message) {
    const toast = document.getElementById("toast");
    if (!toast) return;

    toast.textContent = message;
    toast.style.display = "block";

    setTimeout(() => {
        toast.style.display = "none";
    }, 3000);
}

async function checkSession(user) {
    const emailKey = formatEmail(user.email);
    const sessionRef = ref(database, `users/${emailKey}/sessions/${getDeviceId()}`);

    try {
        const snapshot = await get(sessionRef);
        const sessionData = snapshot.val();

        if (!snapshot.exists() || sessionData.active === false) {
            showToast("Session expired or logged out from another device.");
            clearInterval(window.sessionCheckInterval);
            setTimeout(async () => {
                await signOut(auth);
                window.location.href = "login.html";
            }, 3000);
        }
    } catch (error) {
        console.error("❌ Error checking session:", error);
    }
}

document.addEventListener("DOMContentLoaded", () => {
    onAuthStateChanged(auth, (user) => {
        window.isUserLoggedIn = !!user;

        if (user) {
            checkSession(user);
            window.sessionCheckInterval = setInterval(() => checkSession(user), 2000);
        }
    });
});
