function createSidebar() {
  const sidebar = document.createElement("aside");
  sidebar.className = "sidebar";

  const currentPath = window.location.pathname;
  const pageName = currentPath.split("/").pop() || "index.html";

  sidebar.innerHTML = `
    <div class="logo">
      <h2 style="cursor: pointer;font-weight: 700 !important;font-size: 1.5rem !important;
    line-height: 1.2;
    margin-bottom: 0.5rem; " onclick="window.location.href='index.html'">FitFlow</h2>
    </div>
    <button class="close-sidebar-btn" aria-label="Close navigation"><i class="fa-solid fa-xmark premium-icon" aria-hidden="true"></i></button>
    <nav class="nav" aria-label="Primary navigation">
      <ul>
        <li class="${pageName === "dashboard.html" ? "active" : ""}">
          <a href="dashboard.html"><i class="fa-solid fa-chart-pie premium-icon" aria-hidden="true"></i> Dashboard</a>
        </li>
        <li class="${pageName === "progress.html" ? "active" : ""}">
          <a href="progress.html"><i class="fa-solid fa-chart-line premium-icon" aria-hidden="true"></i> Progress</a>
        </li>
        <li class="${pageName === "activites.html" ? "active" : ""}">
          <a href="activites.html"><i class="fa-solid fa-shoe-prints premium-icon" aria-hidden="true"></i> Activities</a>
        </li>
        <li class="${pageName === "nutrition.html" ? "active" : ""}">
          <a href="nutrition.html"><i class="fa-solid fa-apple-whole premium-icon" aria-hidden="true"></i> Nutrition</a>
        </li>
        <li class="${pageName === "sleep.html" ? "active" : ""}">
          <a href="sleep.html"><i class="fa-solid fa-moon premium-icon" aria-hidden="true"></i> Sleep</a>
        </li>
        <li class="${pageName === "settings.html" ? "active" : ""}">
          <a href="settings.html"><i class="fa-solid fa-gear premium-icon" aria-hidden="true"></i> Settings</a>
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

// Mobile sidebar setup
function setupMobileMenu() {
  const dashboard = document.querySelector(".dashboard");
  const header = document.querySelector(".header");
  const sidebar = document.querySelector(".sidebar");

  let hamburger = document.querySelector(".hamburger-menu");
  if (!hamburger) {
    hamburger = document.createElement("button");
    hamburger.className = "hamburger-menu";
    hamburger.setAttribute("aria-label", "Open navigation");
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

  const mediaQuery = window.matchMedia("(max-width: 768px)");

  function handleScreenChange(e) {
    if (e.matches) {
      hamburger.style.display = "block";
      closeSidebarBtn.style.display = "block";
    } else {
      hamburger.style.display = "none";
      closeSidebarBtn.style.display = "none";
      sidebar.classList.remove("active");
    }
  }

  mediaQuery.addEventListener("change", handleScreenChange);
  handleScreenChange(mediaQuery);

  hamburger.addEventListener("click", () => {
    sidebar.classList.toggle("active");
  });

  closeSidebarBtn.addEventListener("click", () => {
    sidebar.classList.remove("active");
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
  // Load user info here
}

export { initSidebar };
