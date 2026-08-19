import "./components/icon-system.js";
import { auth, database, ref, get, update, onAuthStateChanged, signOut } from "./firebaseConfig.js";

// Function to format email for Firebase keys
function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

// Function to get a consistent device ID (stored in localStorage)
function getDeviceId() {
    let deviceId = localStorage.getItem("deviceId");
    if (!deviceId) {
        deviceId = crypto.randomUUID();
        localStorage.setItem("deviceId", deviceId); // Persist it!
    }
    return deviceId;
}

// Function to show custom toast messages
function showToast(message, type = "success") {
    const toast = document.createElement("div");
    toast.className = `toast ${type}`;
    toast.textContent = message;

    document.body.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("show");
    }, 100);

    setTimeout(() => {
        toast.classList.remove("show");
        setTimeout(() => toast.remove(), 500);
    }, 3000);
}

// Change Password Button
const changePass = document.getElementById("changePasswordBtn");
changePass.addEventListener("click", () => {
    window.location.href = "changepassword.html";
});

// Get UI elements
const logoutBtn = document.getElementById("logoutBtn");
const saveChangesBtn = document.getElementById("saveChangesBtn");
const nameInput = document.getElementById("name");

// Fetch user info and render UI
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "index.html";
    } else {
        const formattedEmail = formatEmail(user.email);
        const userRef = ref(database, `users/${formattedEmail}/personal_information`);

        get(userRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    document.getElementById("user-name").textContent = userData.name || "User";
                    nameInput.value = userData.name || "";
                    document.getElementById("user-email").textContent = userData.email || "No Email";

                    const avatarElement = document.getElementById("user-avatar");
                    if (user.photoURL) {
                        avatarElement.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
                    } else {
                        const initials = userData.name ? userData.name[0].toUpperCase() : "U";
                        avatarElement.textContent = initials;
                    }
                }
            });
    }
});

// Save Changes - Update Name in Firebase
saveChangesBtn.addEventListener("click", () => {
    const newName = nameInput.value.trim();
    if (newName === "") {
        showToast("Name cannot be empty.", "error");
        return;
    }

    onAuthStateChanged(auth, (user) => {
        if (user) {
            const formattedEmail = formatEmail(user.email);
            const userRef = ref(database, `users/${formattedEmail}/personal_information`);

            update(userRef, { name: newName })
                .then(() => {
                    document.getElementById("user-name").textContent = newName;
                    showToast("Name updated successfully!", "success");
                })
                .catch((error) => {
                    showToast("Error updating name: " + error.message, "error");
                });
        }
    });
});

// Logout Button - Device-based Session Logout
document.addEventListener("DOMContentLoaded", () => {
    if (logoutBtn) {
        logoutBtn.addEventListener("click", () => {
            const user = auth.currentUser;

            if (user) {
                const formattedEmail = formatEmail(user.email);
                const deviceId = getDeviceId();
                const sessionRef = ref(database, `users/${formattedEmail}/sessions/${deviceId}`);

                update(sessionRef, { active: false })
                    .then(() => {
                        signOut(auth)
                            .then(() => {
                                showToast("Logged out successfully!", "success");
                                setTimeout(() => (window.location.href = "login.html"), 1500);
                            })
                            .catch((error) => {
                                showToast("Error signing out: " + error.message, "error");
                            });
                    })
                    .catch((error) => {
                        showToast("Error updating session: " + error.message, "error");
                    });
            } else {
                signOut(auth)
                    .then(() => {
                        showToast("Logged out successfully!", "success");
                        setTimeout(() => (window.location.href = "login.html"), 1500);
                    })
                    .catch((error) => {
                        showToast("Error signing out: " + error.message, "error");
                    });
            }
        });
    }
});

// Dashboard Navigation
document.getElementById("dashboardBtn").addEventListener("click", () => {
    window.location.href = "dashboard.html";
});
