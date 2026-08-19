function createSidebar() {
  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";

  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop() || "index.html";

  sidebar.innerHTML = `
    <div class="logo">
      <a class="brand" href="index.html" aria-label="FitFlow home">
        <img src="logo.webp" alt="" class="brand-icon">
        <span>FitFlow</span>
      </a>
    </div>
    <button class="close-sidebar-btn" type="button" aria-label="Close navigation"><i class="fa-solid fa-xmark premium-icon" aria-hidden="true"></i></button>
    <nav class="nav" aria-label="Primary navigation">
      <ul>
        <li class="${pageName === "dashboard.html" ? "active" : ""}">
          <a href="dashboard.html"${pageName === "dashboard.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-chart-pie premium-icon" aria-hidden="true"></i> Dashboard</a>
        </li>
        <li class="${pageName === "progress.html" ? "active" : ""}">
          <a href="progress.html"${pageName === "progress.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-chart-line premium-icon" aria-hidden="true"></i> Progress</a>
        </li>
        <li class="${pageName === "activites.html" ? "active" : ""}">
          <a href="activites.html"${pageName === "activites.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-shoe-prints premium-icon" aria-hidden="true"></i> Activities</a>
        </li>
        <li class="${pageName === "nutrition.html" ? "active" : ""}">
          <a href="nutrition.html"${pageName === "nutrition.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-apple-whole premium-icon" aria-hidden="true"></i> Nutrition</a>
        </li>
        <li class="${pageName === "sleep.html" ? "active" : ""}">
          <a href="sleep.html"${pageName === "sleep.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-moon premium-icon" aria-hidden="true"></i> Sleep</a>
        </li>
        <li class="${pageName === "settings.html" ? "active" : ""}">
          <a href="settings.html"${pageName === "settings.html" ? ' aria-current="page"' : ""}><i class="fa-solid fa-gear premium-icon" aria-hidden="true"></i> Settings</a>
        </li>
      </ul>
    </nav>
    <div class="user-profile">
      <div class="avatar" id="user-avatar">JD</div>
      <div class="user-info">
        <h4 id="user-name">Loading...</h4>
      </div>
    </div>
  `;

  return sidebar;
}

function setupMobileMenu() {
  const dashboard = document.querySelector(".dashboard");
  const header = document.querySelector(".header");
  const sidebar = document.querySelector(".sidebar");
  if (!dashboard || !header || !sidebar) return;

  let hamburger = document.querySelector(".hamburger-menu");
  if (!hamburger) {
    hamburger = document.createElement("button");
    hamburger.className = "hamburger-menu";
    hamburger.type = "button";
    hamburger.setAttribute("aria-label", "Open navigation");
    hamburger.setAttribute("aria-expanded", "false");
    hamburger.setAttribute("aria-controls", "fitflow-sidebar");
    hamburger.innerHTML = `<i class="fa-solid fa-bars premium-icon" aria-hidden="true"></i>`;
    hamburger.style.cssText = `
      display: none;
      background: none;
      border: none;
      font-size: 20px;
      cursor: pointer;
      margin-right: 15px;
    `;
    header.prepend(hamburger);
  }

  sidebar.id = "fitflow-sidebar";
  const closeSidebarBtn = sidebar.querySelector(".close-sidebar-btn");
  closeSidebarBtn.style.cssText = `
    display: none;
    position: absolute;
    top: 25px;
    right: 15px;
    background: none;
    border: none;
    font-size: 18px;
    cursor: pointer;
  `;

  const setSidebarOpen = (open) => {
    sidebar.classList.toggle("active", open);
    hamburger.setAttribute("aria-expanded", String(open));
    hamburger.setAttribute("aria-label", open ? "Close navigation" : "Open navigation");
  };

  const mediaQuery = window.matchMedia("(max-width: 768px)");

  function handleScreenChange(e) {
    if (e.matches) {
      hamburger.style.display = "block";
      closeSidebarBtn.style.display = "block";
    } else {
      hamburger.style.display = "none";
      closeSidebarBtn.style.display = "none";
      setSidebarOpen(false);
    }
  }

  mediaQuery.addEventListener("change", handleScreenChange);
  handleScreenChange(mediaQuery);

  hamburger.addEventListener("click", () => {
    setSidebarOpen(!sidebar.classList.contains("active"));
  });

  closeSidebarBtn.addEventListener("click", () => setSidebarOpen(false));
  sidebar.querySelectorAll("a").forEach((link) => link.addEventListener("click", () => setSidebarOpen(false)));
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && sidebar.classList.contains("active")) {
      setSidebarOpen(false);
      hamburger.focus();
    }
  });
}

function initSidebar() {
  const dashboard = document.querySelector(".dashboard");

  if (dashboard) {
    const existingSidebar = document.querySelector(".sidebar");
    const newSidebar = createSidebar();

    if (existingSidebar) {
      dashboard.replaceChild(newSidebar, existingSidebar);
    } else {
      dashboard.prepend(newSidebar);
    }

    setupMobileMenu();
    loadUserData();
  }
}

function loadUserData() {
  // User information is hydrated by the page-level auth/data modules.
}

export { initSidebar };
