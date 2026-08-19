// Import and configure Firebase
import {
    auth,
    database,
    createUserWithEmailAndPassword,
    ref,
    set,
    signOut,
} from "./firebaseConfig.js";

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function getISTTime() {
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

document.addEventListener("DOMContentLoaded", function () {
    const signUpBtn = document.getElementById("signUpBtn");
    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");

    signUpBtn.addEventListener("click", signup);

    name.addEventListener("focus", () => { nameError.style.display = "none"; });
    email.addEventListener("focus", () => { emailError.style.display = "none"; });
    password.addEventListener("focus", () => { passwordError.style.display = "none"; });
    confirmPassword.addEventListener("focus", () => { confirmPasswordError.style.display = "none"; });
});

export async function signup() {
    const name = document.getElementById("name").value.trim();
    const email = document.getElementById("email").value.trim().toLowerCase();
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");
    const statusMessage = document.getElementById("statusMessage");
    const signUpBtn = document.getElementById("signUpBtn");

    nameError.style.display = "none";
    emailError.style.display = "none";
    passwordError.style.display = "none";
    confirmPasswordError.style.display = "none";
    statusMessage.textContent = "";
    statusMessage.style.color = "";

    let isValid = true;

    if (!name) {
        nameError.textContent = "Please enter your name";
        nameError.style.display = "block";
        isValid = false;
    }
    if (!validateEmail(email)) {
        emailError.textContent = "Please enter a valid email address";
        emailError.style.display = "block";
        isValid = false;
    }
    if (!validatePassword(password)) {
        passwordError.textContent = "Password must be at least 6 characters long";
        passwordError.style.display = "block";
        isValid = false;
    }
    if (password !== confirmPassword) {
        confirmPasswordError.textContent = "Passwords do not match";
        confirmPasswordError.style.display = "block";
        isValid = false;
    }

    if (!isValid) return;

    signUpBtn.disabled = true;
    signUpBtn.innerHTML = `<span class="loader"></span> Creating account...`;

    try {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        const formattedEmail = formatEmail(email);
        const creationTime = getISTTime();

        await set(ref(database, `users/${formattedEmail}/personal_information`), {
            name,
            email,
            uid: user.uid,
        });

        await set(ref(database, `users/${formattedEmail}/login_activity`), {
            account_created: creationTime,
        });

        // Firebase signs a newly registered user in automatically. End that
        // session so registration always finishes at the login screen.
        await signOut(auth);

        statusMessage.textContent = "Account created successfully. Redirecting you to login...";
        statusMessage.style.color = "#0f9b8e";

        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        document.getElementById("confirmPassword").value = "";

        setTimeout(() => {
            window.location.replace("login.html?registered=1");
        }, 800);
    } catch (error) {
        console.error("Signup failed:", error);

        if (error.code === "auth/email-already-in-use") {
            statusMessage.textContent = "User already exists.";
        } else {
            statusMessage.textContent = "Some error occurred. Please try again later.";
        }

        statusMessage.style.color = "red";
        resetButton();
    }

    function resetButton() {
        signUpBtn.disabled = false;
        signUpBtn.innerHTML = "Sign Up";
    }
}

function validateEmail(email) {
    const regex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    return regex.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((toggle) => {
        if (toggle.dataset.bound === "true") return;
        toggle.dataset.bound = "true";

        toggle.addEventListener("click", function () {
            const targetId = this.getAttribute("data-target");
            const inputField = document.getElementById(targetId);
            const icon = this.querySelector("i");

            if (!inputField) return;

            const isPassword = inputField.type === "password";
            inputField.type = isPassword ? "text" : "password";

            if (icon) {
                icon.classList.toggle("fa-eye", !isPassword);
                icon.classList.toggle("fa-eye-slash", isPassword);
            }
        });
    });
}

document.addEventListener("DOMContentLoaded", setupPasswordToggles, { once: true });
