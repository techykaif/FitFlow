import "./components/icon-system.js";
import { auth, database, ref, get, onAuthStateChanged } from "./firebaseConfig.js";
import { generateAIInsights } from "./insights.js";

// Function to format email for Firebase keys
function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

// Check if the user is logged in and fetch data
onAuthStateChanged(auth, (user) => {
    if (!user) {
        // Redirect to login page if the user is not authenticated
        window.location.href = "tracker.html";
    } else {
        // Fetch user data
        const formattedEmail = formatEmail(user.email);
        const userRef = ref(database, `users/${formattedEmail}/personal_information`);
        generateAIInsights(formattedEmail);

        get(userRef)
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const userData = snapshot.val();
                    document.getElementById("user-name").textContent = userData.name || "User";

                    // Check if the element with ID "user-name1" exists before updating it
                    if (document.getElementById("user-name1")) {
                        document.getElementById("user-name1").textContent = userData.name || "User";
                    }

                    // Set avatar (either from Firebase profile pic or initials)
                    const avatarElement = document.getElementById("user-avatar");
                    if (user.photoURL) {
                        avatarElement.innerHTML = `<img src="${user.photoURL}" alt="User Avatar">`;
                    } else {
                        const initials = userData.name ? userData.name[0].toUpperCase() : "U";
                        avatarElement.textContent = initials;
                    }
                }
            })
            .catch((error) => {
                console.error("Error fetching user data:", error);
            });
    }
});
