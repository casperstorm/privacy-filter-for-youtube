const BUTTON_ID = "privacy-filter-youtube-toggle";
const OVERLAY_ID = "privacy-filter-youtube-overlay";
const STORAGE_KEY = "privacy-filter-youtube-enabled";

let enabled = sessionStorage.getItem(STORAGE_KEY) === "1";
let syncTimer = null;
let lastUrl = window.location.href;

function isWatchPage() {
  return window.location.pathname === "/watch";
}

function getButtonHost() {
  return (
    document.querySelector("#top-level-buttons-computed") ||
    document.querySelector("ytd-menu-renderer #top-level-buttons-computed") ||
    document.querySelector("ytd-watch-metadata #actions #top-level-buttons-computed") ||
    document.querySelector("ytd-watch-metadata #actions-inner") ||
    document.querySelector("ytd-watch-metadata #menu")
  );
}

function getPlayerHost() {
  return (
    document.querySelector("#player-container") ||
    document.querySelector("#player-container-outer") ||
    document.querySelector("ytd-player") ||
    document.querySelector("#movie_player")
  );
}

function ensureOverlay() {
  const playerHost = getPlayerHost();

  if (!playerHost) {
    return;
  }

  let overlay = document.getElementById(OVERLAY_ID);
  if (!overlay) {
    overlay = document.createElement("div");
    overlay.id = OVERLAY_ID;
    overlay.setAttribute("aria-hidden", "true");
    overlay.style.position = "absolute";
    overlay.style.inset = "0";
    overlay.style.background = "#000";
    overlay.style.pointerEvents = "none";
    overlay.style.zIndex = "2147483647";
  }

  const computedPosition = window.getComputedStyle(playerHost).position;
  if (computedPosition === "static") {
    playerHost.style.position = "relative";
  }

  if (!playerHost.contains(overlay)) {
    playerHost.appendChild(overlay);
  }

  overlay.style.display = enabled && isWatchPage() ? "block" : "none";
}

function updateButtonState(button) {
  button.textContent = enabled ? "Show video" : "Hide video";
  button.setAttribute("aria-pressed", enabled ? "true" : "false");
  button.style.background = enabled ? "rgba(255, 255, 255, 0.16)" : "rgba(255, 255, 255, 0.08)";
}

function toggleOverlay() {
  enabled = !enabled;
  sessionStorage.setItem(STORAGE_KEY, enabled ? "1" : "0");

  const button = document.getElementById(BUTTON_ID);
  if (button) {
    updateButtonState(button);
  }

  ensureOverlay();
}

function ensureButton() {
  const buttonHost = getButtonHost();
  if (!buttonHost || !isWatchPage()) {
    return;
  }

  let button = document.getElementById(BUTTON_ID);
  if (!button) {
    button = document.createElement("button");
    button.id = BUTTON_ID;
    button.type = "button";
    button.addEventListener("click", toggleOverlay);
    button.style.border = "none";
    button.style.borderRadius = "18px";
    button.style.color = "#fff";
    button.style.cursor = "pointer";
    button.style.font = "500 1.4rem/3.6rem Roboto, Arial, sans-serif";
    button.style.height = "36px";
    button.style.flex = "0 0 auto";
    button.style.marginRight = "8px";
    button.style.padding = "0 18px";
    button.style.whiteSpace = "nowrap";
  }

  updateButtonState(button);

  if (button.parentElement !== buttonHost) {
    button.remove();
    buttonHost.prepend(button);
  } else if (buttonHost.firstElementChild !== button) {
    buttonHost.prepend(button);
  }
}

function cleanupWhenLeavingWatchPage() {
  if (isWatchPage()) {
    return;
  }

  const button = document.getElementById(BUTTON_ID);
  if (button) {
    button.remove();
  }

  const overlay = document.getElementById(OVERLAY_ID);
  if (overlay) {
    overlay.style.display = "none";
  }
}

function syncUi() {
  if (!isWatchPage()) {
    cleanupWhenLeavingWatchPage();
    return;
  }

  ensureButton();
  ensureOverlay();
}

function scheduleSync() {
  if (syncTimer !== null) {
    window.clearTimeout(syncTimer);
  }

  syncTimer = window.setTimeout(() => {
    syncTimer = null;
    syncUi();

    if (isWatchPage() && (!getButtonHost() || !getPlayerHost())) {
      scheduleSync();
    }
  }, 250);
}

function handlePotentialNavigation() {
  if (window.location.href === lastUrl) {
    return;
  }

  lastUrl = window.location.href;
  scheduleSync();
}

window.addEventListener("yt-navigate-finish", scheduleSync);
window.addEventListener("load", scheduleSync);
window.addEventListener("popstate", handlePotentialNavigation);

const originalPushState = history.pushState;
history.pushState = function (...args) {
  const result = originalPushState.apply(this, args);
  handlePotentialNavigation();
  return result;
};

const originalReplaceState = history.replaceState;
history.replaceState = function (...args) {
  const result = originalReplaceState.apply(this, args);
  handlePotentialNavigation();
  return result;
};

scheduleSync();
