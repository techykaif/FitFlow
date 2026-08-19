function toggleMenu() {
    const menuBar = document.getElementById('tooltip');
    if (!menuBar) return;
    menuBar.style.display = menuBar.style.display === 'flex' ? 'none' : 'flex';

    window.authReady?.then(() => {
        if (!window.isUserLoggedIn) return;
        const hideAuthLinks = () => {
            document.querySelectorAll("#tooltip ol li a[href='login.html'], #tooltip ol li a[href='signup.html']")
                .forEach((el) => { if (el.parentElement) el.parentElement.style.display = 'none'; });
        };
        hideAuthLinks();
        setTimeout(hideAuthLinks, 100);
    });
}

function mountPublicFooter() {
    const existing = document.querySelector('footer');
    if (!existing || existing.dataset.fitflowStandard === 'true') return;

    existing.dataset.fitflowStandard = 'true';
    existing.innerHTML = `
        <div class="footer-content">
            <div class="footer-column footer-brand">
                <a class="footer-logo" href="index.html"><img src="logo.webp" alt="FitFlow logo"><span>FitFlow</span></a>
                <p>A personal wellness companion built around actionable feedback, not data entry for its own sake.</p>
            </div>
            <div class="footer-column"><h4>Product</h4><ul>
                <li><a href="index.html">Home</a></li><li><a href="features.html">Features</a></li><li><a href="tracker.html">Tracker</a></li><li><a href="about.html">About FitFlow</a></li>
            </ul></div>
            <div class="footer-column"><h4>Account</h4><ul>
                <li><a href="login.html">Log in</a></li><li><a href="signup.html">Create account</a></li><li><a href="support.html">Support</a></li><li><a href="contact.html">Contact</a></li>
            </ul></div>
            <div class="footer-column"><h4>Developer</h4><ul>
                <li><a href="https://techykaif.netlify.app" target="_blank" rel="noopener noreferrer">Portfolio</a></li>
                <li><a href="https://github.com/techykaif" target="_blank" rel="noopener noreferrer">GitHub profile</a></li>
                <li><a href="https://github.com/techykaif/FitFlow" target="_blank" rel="noopener noreferrer">FitFlow repository</a></li>
            </ul></div>
        </div>
        <div class="footer-bottom"><p>© 2026 FitFlow. Built as an open-source product project.</p>
            <div class="social-media">
                <a href="https://github.com/techykaif/FitFlow" target="_blank" rel="noopener noreferrer" aria-label="FitFlow on GitHub"><i class="fa-brands fa-github"></i></a>
                <a href="https://techykaif.netlify.app" target="_blank" rel="noopener noreferrer" aria-label="Developer portfolio"><i class="fa-solid fa-globe"></i></a>
            </div>
        </div>`;
}

function replaceFakeTestimonials() {
    const section = document.querySelector('.enhanced-testimonials');
    if (!section) return;
    section.innerHTML = `
        <div class="section-header">
            <h2>Designed for <span class="highlight">real routines</span></h2>
            <p>FitFlow focuses on the part most trackers miss: what the user should do after seeing the data.</p>
        </div>
        <div class="testimonial-container fitflow-principles">
            <article class="testimonial-card active"><div class="quote-icon"><i class="fas fa-list-check"></i></div><h3>Log once, learn over time</h3><p class="testimonial-text">A small amount of consistent data becomes useful when FitFlow can compare it across days and weeks.</p></article>
            <article class="testimonial-card"><div class="quote-icon"><i class="fas fa-arrow-trend-up"></i></div><h3>Review patterns, not perfection</h3><p class="testimonial-text">Progress views make consistency visible without pretending that one number tells the whole story.</p></article>
            <article class="testimonial-card"><div class="quote-icon"><i class="fas fa-person-walking"></i></div><h3>Leave with a next step</h3><p class="testimonial-text">The dashboard turns recent records into a small, explainable action so there is a reason to return.</p></article>
        </div>`;
}

function initPublicPolish() {
    mountPublicFooter();
    replaceFakeTestimonials();

    document.querySelectorAll('#nav-menu a').forEach((link) => {
        link.addEventListener('mouseenter', (event) => {
            const title = link.getAttribute('title');
            if (!title || document.querySelector('.custom-tooltip')) return;
            const tooltip = document.createElement('div');
            tooltip.className = 'custom-tooltip';
            tooltip.textContent = title;
            document.body.appendChild(tooltip);
            tooltip.style.left = `${event.pageX}px`;
            tooltip.style.top = `${event.pageY + 30}px`;
        });
        link.addEventListener('mouseleave', () => document.querySelector('.custom-tooltip')?.remove());
    });

    document.addEventListener('click', (event) => {
        const menuBar = document.getElementById('tooltip');
        const menuToggle = document.querySelector('.menu-toggle');
        if (menuBar && menuToggle && !menuBar.contains(event.target) && !menuToggle.contains(event.target)) menuBar.style.display = 'none';
    });

    document.querySelector('.menu-toggle')?.addEventListener('click', (event) => event.stopPropagation());
}

if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', initPublicPolish, { once: true });
else initPublicPolish();
