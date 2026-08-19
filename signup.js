import {
    auth,
    database,
    createUserWithEmailAndPassword,
    ref,
    set,
    update,
    get,
    signOut,
} from "./firebaseConfig.js";
import { signInWithPopup, googleProvider } from "./components/google-auth.js";

function formatEmail(email) {
    return email.toLowerCase().replace(/\./g, "_dot_").replace(/@/g, "_at_");
}

function getISTTime() {
    return new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Kolkata",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
    }).format(new Date()).replace(",", "");
}

function setStatus(message, type = "") {
    const statusMessage = document.getElementById("statusMessage");
    if (!statusMessage) return;
    statusMessage.textContent = message;
    statusMessage.className = `status-text ${type}`.trim();
}

async function saveGoogleProfile(user) {
    if (!user?.email) throw new Error("Google did not provide an email address.");

    const email = user.email.toLowerCase();
    const formattedEmail = formatEmail(email);
    const profileRef = ref(database, `users/${formattedEmail}/personal_information`);
    const profileSnapshot = await get(profileRef);

    if (!profileSnapshot.exists()) {
        await set(profileRef, {
            name: user.displayName || "FitFlow User",
            email,
            uid: user.uid,
            photoURL: user.photoURL || "",
            auth_provider: "google",
        });

        await set(ref(database, `users/${formattedEmail}/login_activity`), {
            account_created: getISTTime(),
            auth_provider: "google",
        });
    } else {
        await update(profileRef, {
            uid: user.uid,
            email,
            photoURL: user.photoURL || profileSnapshot.val()?.photoURL || "",
            auth_provider: "google",
        });
    }
}

document.addEventListener("DOMContentLoaded", function () {
    const signUpBtn = document.getElementById("signUpBtn");
    const googleSignUpBtn = document.getElementById("googleSignUpBtn");
    const name = document.getElementById("name");
    const email = document.getElementById("email");
    const password = document.getElementById("password");
    const confirmPassword = document.getElementById("confirmPassword");

    const nameError = document.getElementById("nameError");
    const emailError = document.getElementById("emailError");
    const passwordError = document.getElementById("passwordError");
    const confirmPasswordError = document.getElementById("confirmPasswordError");

    signUpBtn?.addEventListener("click", signup);
    googleSignUpBtn?.addEventListener("click", signUpWithGoogle);

    name?.addEventListener("focus", () => { nameError.style.display = "none"; });
    email?.addEventListener("focus", () => { emailError.style.display = "none"; });
    password?.addEventListener("focus", () => { passwordError.style.display = "none"; });
    confirmPassword?.addEventListener("focus", () => { confirmPasswordError.style.display = "none"; });
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
    const signUpBtn = document.getElementById("signUpBtn");

    nameError.style.display = "none";
    emailError.style.display = "none";
    passwordError.style.display = "none";
    confirmPasswordError.style.display = "none";
    setStatus("");

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
            auth_provider: "password",
        });

        await set(ref(database, `users/${formattedEmail}/login_activity`), {
            account_created: creationTime,
            auth_provider: "password",
        });

        await signOut(auth);
        setStatus("Account created successfully. Redirecting you to login...", "success");

        document.getElementById("name").value = "";
        document.getElementById("email").value = "";
        document.getElementById("password").value = "";
        document.getElementById("confirmPassword").value = "";

        setTimeout(() => window.location.replace("login.html?registered=1"), 800);
    } catch (error) {
        console.error("Signup failed:", error);
        setStatus(error.code === "auth/email-already-in-use" ? "User already exists." : "Some error occurred. Please try again later.", "error");
        resetButton();
    }

    function resetButton() {
        signUpBtn.disabled = false;
        signUpBtn.innerHTML = "Create account";
    }
}

async function signUpWithGoogle() {
    const button = document.getElementById("googleSignUpBtn");
    if (!button) return;

    const originalContent = button.innerHTML;
    button.disabled = true;
    button.innerHTML = '<span class="auth-button-spinner" aria-hidden="true"></span><span>Connecting to Google...</span>';
    setStatus("Opening secure Google sign-up...", "loading");

    try {
        const result = await signInWithPopup(auth, googleProvider);
        await saveGoogleProfile(result.user);
        setStatus("Google account connected. Opening your FitFlow dashboard...", "success");
        setTimeout(() => window.location.replace("dashboard.html"), 500);
    } catch (error) {
        console.error("Google sign-up failed:", error);
        if (error.code === "auth/popup-closed-by-user") {
            setStatus("Google sign-up was cancelled.", "error");
        } else if (error.code === "auth/unauthorized-domain") {
            setStatus("This website is not authorized for Google sign-in. Add the FitFlow domain in Firebase Authentication settings.", "error");
        } else if (error.code === "auth/account-exists-with-different-credential") {
            setStatus("This Google email already has a FitFlow account. Use Log In with your existing credentials.", "error");
        } else {
            setStatus("Google sign-up could not be completed. Please try again.", "error");
        }
    } finally {
        button.disabled = false;
        button.innerHTML = originalContent;
    }
}

function validateEmail(email) {
    return /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(email);
}

function validatePassword(password) {
    return password.length >= 6;
}

function setupPasswordToggles() {
    document.querySelectorAll(".toggle-password").forEach((toggle) => {
        if (toggle.dataset.bound === "true") return;
        toggle.dataset.bound = "true";
        toggle.addEventListener("click", function () {
            const inputField = document.getElementById(this.getAttribute("data-target"));
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
