const ICON_MAP = {
  "📊": "fa-chart-pie",
  "👟": "fa-shoe-prints",
  "📈": "fa-chart-line",
  "🍎": "fa-apple-whole",
  "💤": "fa-moon",
  "⚙️": "fa-gear",
  "🔍": "fa-magnifying-glass",
  "🔔": "fa-bell",
  "🛌": "fa-bed",
  "🏃": "fa-person-running",
  "🧠": "fa-lightbulb",
  "💡": "fa-lightbulb",
  "🏆": "fa-trophy",
  "😴": "fa-moon",
  "😌": "fa-face-smile",
  "😊": "fa-face-smile",
  "🥦": "fa-leaf",
  "💧": "fa-droplet",
  "🔥": "fa-fire",
  "⏰": "fa-clock",
  "🎯": "fa-bullseye",
  "💾": "fa-floppy-disk",
  "❌": "fa-xmark"
};

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

const iconPattern = new RegExp(Object.keys(ICON_MAP).map(escapeRegExp).join("|"), "gu");

function replacePremiumIcons(root = document.body) {
  if (!root) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script,style,textarea")) return NodeFilter.FILTER_REJECT;
      if (!node.nodeValue) return NodeFilter.FILTER_REJECT;
      iconPattern.lastIndex = 0;
      return iconPattern.test(node.nodeValue) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const textNodes = [];
  while (walker.nextNode()) textNodes.push(walker.currentNode);

  textNodes.forEach((node) => {
    const fragment = document.createDocumentFragment();
    let lastIndex = 0;
    const text = node.nodeValue;
    iconPattern.lastIndex = 0;
    let match;

    while ((match = iconPattern.exec(text)) !== null) {
      if (match.index > lastIndex) fragment.appendChild(document.createTextNode(text.slice(lastIndex, match.index)));
      const icon = document.createElement("i");
      icon.className = `fa-solid ${ICON_MAP[match[0]]} premium-icon`;
      icon.setAttribute("aria-hidden", "true");
      fragment.appendChild(icon);
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < text.length) fragment.appendChild(document.createTextNode(text.slice(lastIndex)));
    node.replaceWith(fragment);
  });
}

function initPremiumIcons() {
  replacePremiumIcons();
  const observer = new MutationObserver((mutations) => {
    mutations.forEach(({ addedNodes }) => {
      addedNodes.forEach((node) => {
        if (node.nodeType === Node.ELEMENT_NODE) replacePremiumIcons(node);
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) replacePremiumIcons(node.parentElement);
      });
    });
  });
  observer.observe(document.body, { childList: true, subtree: true });
}

if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", initPremiumIcons, { once: true });
else initPremiumIcons();
