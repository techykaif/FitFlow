import "./components/icon-system.js";
import { auth, database, ref, get, update, onAuthStateChanged, signOut } from "./firebaseConfig.js";

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function getDeviceId() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId);
    }
    return deviceId;
}

function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;
    document.body.appendChild(toast);
    requestAnimationFrame(() => toast.classList.add("show"));
    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 300);
    }, 3000);
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

const changePass = document.getElementById("changePasswordBtn");
const logoutBtn = document.getElementById("logoutBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const dashboardBtn = document.getElementById("dashboardBtn");
const nameInput = document.getElementById("name");

let currentUser = null;

onAuthStateChanged(auth, async (user) => {
    currentUser = user;

    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const formattedEmail = formatEmail(user.email);
    const userRef = ref(database, `users/${formattedEmail}/personal_information`);

    try {
        const snapshot = await get(userRef);
        const userData = snapshot.exists() ? snapshot.val() : {};
        const name = userData.name || user.displayName || "User";

        document.getElementById("user-name").textContent = name;
        document.getElementById("user-email").textContent = user.email || "No Email";
        nameInput.value = name;
        renderAvatar(document.getElementById("user-avatar"), user, name);

        const isGoogleAccount = user.providerData.some((provider) => provider.providerId === "google.com");
        if (isGoogleAccount) {
            changePass.title = "Google accounts manage passwords through Google";
            changePass.innerHTML = '<i class="fa-brands fa-google" aria-hidden="true"></i><span>Managed by Google</span>';
        }
    } catch (error) {
        console.error("Error loading settings:", error);
        showToast("Unable to load your profile right now.", "error");
    }
});

changePass?.addEventListener("click", () => {
    if (currentUser?.providerData.some((provider) => provider.providerId === "google.com")) {
        showToast("This account uses Google Sign-In. Manage your password through Google.", "error");
        return;
    }
    window.location.href = "changepassword.html";
});

saveChangesBtn?.addEventListener("click", async () => {
    const newName = nameInput.value.trim();
    if (!newName) {
        showToast("Name cannot be empty.", "error");
        nameInput.focus();
        return;
    }
    if (!currentUser?.email) return;

    saveChangesBtn.disabled = true;
    try {
        const formattedEmail = formatEmail(currentUser.email);
        const userRef = ref(database, `users/${formattedEmail}/personal_information`);
        await update(userRef, { name: newName });
        document.getElementById("user-name").textContent = newName;
        renderAvatar(document.getElementById("user-avatar"), currentUser, newName);
        showToast("Name updated successfully!", "success");
    } catch (error) {
        console.error("Error updating name:", error);
        showToast("Unable to update your name. Please try again.", "error");
    } finally {
        saveChangesBtn.disabled = false;
    }
});

logoutBtn?.addEventListener("click", async () => {
    try {
        const user = auth.currentUser;
        if (user?.email) {
            const formattedEmail = formatEmail(user.email);
            const deviceId = getDeviceId();
            await update(ref(database, `users/${formattedEmail}/sessions/${deviceId}`), { active: false });
        }

        await signOut(auth);
        showToast("Logged out successfully!", "success");
        setTimeout(() => (window.location.href = "login.html"), 900);
    } catch (error) {
        console.error("Error signing out:", error);
        showToast("Unable to sign out. Please try again.", "error");
    }
});

dashboardBtn?.addEventListener("click", () => {
    window.location.href = "dashboard.html";
});
