const menuToggle = document.querySelector(".menu-toggle");
const primaryNav = document.querySelector("#primary-nav");

function closeNavigation() {
  if (!menuToggle || !primaryNav) return;
  menuToggle.setAttribute("aria-expanded", "false");
  primaryNav.classList.remove("is-open");
}

if (menuToggle && primaryNav) {
  menuToggle.addEventListener("click", () => {
    const expanded = menuToggle.getAttribute("aria-expanded") === "true";
    menuToggle.setAttribute("aria-expanded", String(!expanded));
    primaryNav.classList.toggle("is-open", !expanded);
  });

  primaryNav.addEventListener("click", (event) => {
    if (event.target instanceof Element && event.target.closest("a")) closeNavigation();
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeNavigation();
  });

  document.addEventListener("click", (event) => {
    if (
      event.target instanceof Node &&
      !menuToggle.contains(event.target) &&
      !primaryNav.contains(event.target)
    ) {
      closeNavigation();
    }
  });
}

const sourceList = document.querySelector("#sources");
const sourceCount = document.querySelector("#sources-count");

const sourceConnections = new Map([
  ["radlab_msl", "Used by the solar-particle-storm event profile in the game scenario."],
  ["osdr", "Real science cards in mission debriefs connect to 5 real NASA space biology studies in the Open Science Data Repository (plants in Moon soil, lettuce on ISS, cosmic ray seed resilience, mice in orbit, Mars gravity)."],
  ["donki", "Space-weather risk from the bundled snapshot or configured service informs the solar-storm event chance."],
  ["comms_delay", "Provides context for the communication-delay learning scenario and Weather Station warning decision."],
  ["opportunity_2018", "Referenced by the dust-storm event, which halves available scenario solar power."],
  ["mars_samples", "The rover trips: one power unit collects one rock sample, like the samples NASA's Perseverance seals for return to Earth."],
  ["nasa_std_3001", "Provides radiation-limit context; the game uses a separate, simplified scenario dose cap."],
]);

function showSourcesMessage(message, state) {
  if (!sourceList || !sourceCount) return;
  const status = document.createElement("p");
  status.className = "sources-status";
  status.textContent = message;
  sourceList.replaceChildren(status);
  sourceCount.textContent = state;
}

async function loadSources() {
  if (!sourceList || !sourceCount) return;

  try {
    const response = await fetch("data/sources.json");
    if (!response.ok) throw new Error(`Source list request failed (${response.status}).`);

    const data = await response.json();
    if (!data || !Array.isArray(data.sources)) {
      throw new Error("Source list has an unexpected format.");
    }

    if (data.sources.length === 0) {
      showSourcesMessage("No project data sources are available right now.", "0 SOURCES");
      return;
    }

    const fragment = document.createDocumentFragment();
    data.sources.forEach((source, index) => {
      const hasUrl = typeof source.url === "string" && source.url.trim() !== "";
      const row = document.createElement(hasUrl ? "a" : "div");
      row.className = "source-row" + (hasUrl ? " is-clickable" : "");

      if (hasUrl) {
        row.href = source.url;
        row.target = "_blank";
        row.rel = "noopener";
        row.setAttribute("aria-label", `View ${source.title} source in a new tab`);
      }

      const topBar = document.createElement("div");
      topBar.className = "source-top-bar";

      const badgeGroup = document.createElement("div");
      badgeGroup.className = "source-badge-group";

      const number = document.createElement("span");
      number.className = "source-index";
      number.textContent = `SRC 0${index + 1}`;

      const provider = document.createElement("span");
      provider.className = "source-provider";
      const dot = document.createElement("span");
      dot.className = "provider-dot";
      dot.setAttribute("aria-hidden", "true");
      provider.append(dot, document.createTextNode(source.provider || "NASA DATASET"));

      badgeGroup.append(number, provider);

      const arrow = document.createElement("span");
      arrow.className = "source-arrow";
      arrow.setAttribute("aria-hidden", "true");
      arrow.textContent = hasUrl ? "Explore source ↗" : "Internal register";

      topBar.append(badgeGroup, arrow);

      const title = document.createElement("h3");
      title.className = "source-title";
      title.textContent = source.title || "Untitled source";

      const description = document.createElement("p");
      description.className = "source-desc";
      description.textContent = source.usedFor || "Project source; additional description is not available.";

      const connection = document.createElement("div");
      connection.className = "source-connection";
      const connectionHeader = document.createElement("div");
      connectionHeader.className = "source-connection-header";
      const connectionIcon = document.createElement("span");
      connectionIcon.className = "connection-icon";
      connectionIcon.setAttribute("aria-hidden", "true");
      connectionIcon.textContent = "◈";
      const connectionLabel = document.createElement("span");
      connectionLabel.textContent = "MISSION INTEGRATION";
      connectionHeader.append(connectionIcon, connectionLabel);

      const connectionText = document.createElement("p");
      connectionText.textContent = sourceConnections.get(source.id) || "This source is listed in the project's shared data register; its specific gameplay connection is not described in the available project data.";
      connection.append(connectionHeader, connectionText);

      row.append(topBar, title, description, connection);
      fragment.append(row);
    });

    sourceList.replaceChildren(fragment);
    sourceCount.textContent = `${data.sources.length} SOURCES`;
  } catch (error) {
    console.warn("Could not load the project data sources.", error);
    showSourcesMessage("The source list could not be loaded. Please try again later.", "UNAVAILABLE");
  }
}

loadSources();

const missionFrame = document.querySelector("#mission-frame");
const gameShell = document.querySelector(".game-shell");
const fullscreenButton = document.querySelector("#fullscreen-button");

if (missionFrame && gameShell && fullscreenButton) {
  fullscreenButton.hidden = false;
  fullscreenButton.disabled = false;

  fullscreenButton.addEventListener("click", async () => {
    try {
      if (!document.fullscreenElement) {
        await gameShell.requestFullscreen();
      } else {
        await document.exitFullscreen();
      }
    } catch (error) {
      console.error("Could not toggle fullscreen mode.", error);
    }
  });
}
