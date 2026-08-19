document.addEventListener("DOMContentLoaded", () => {
    const form = document.getElementById("contact-support-form");
    const feedback = document.getElementById("cs-feedback");
    if (!form) return;

    form.addEventListener("submit", (event) => {
        event.preventDefault();

        const name = document.getElementById("cs-name")?.value.trim();
        const email = document.getElementById("cs-email")?.value.trim();
        const topic = document.getElementById("cs-topic")?.value || "Support request";
        const message = document.getElementById("cs-message")?.value.trim();

        if (!name || !email || !message || !form.checkValidity()) {
            form.reportValidity();
            return;
        }

        const subject = encodeURIComponent(`FitFlow — ${topic}`);
        const body = encodeURIComponent([
            `Name: ${name}`,
            `Email: ${email}`,
            `Reason: ${topic}`,
            "",
            message
        ].join("\n"));

        const mailto = `mailto:fitflow71@gmail.com?subject=${subject}&body=${body}`;
        window.location.href = mailto;

        if (feedback) {
            feedback.hidden = false;
            feedback.textContent = "Your email app should now be ready with the message. If it did not open, use the direct email address above.";
        }
    });
});
