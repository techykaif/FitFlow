import "./components/icon-system.js";
import { auth, database, ref, get, onAuthStateChanged } from "./firebaseConfig.js";
import { generateAIInsights } from "./insights.js";

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

onAuthStateChanged(auth, async (user) => {
    if (!user) {
        window.location.href = "login.html";
        return;
    }

    const formattedEmail = formatEmail(user.email);
    const userRef = ref(database, `users/${formattedEmail}/personal_information`);

    try {
        generateAIInsights(formattedEmail);
        const snapshot = await get(userRef);

        if (snapshot.exists()) {
            const userData = snapshot.val();
            const name = userData.name || user.displayName || "User";
            document.getElementById("user-name").textContent = name;

            const welcomeName = document.getElementById("user-name1");
            if (welcomeName) welcomeName.textContent = name;

            renderAvatar(document.getElementById("user-avatar"), user, name);
        }
    } catch (error) {
        console.error("Error fetching user data:", error);
    }
});
