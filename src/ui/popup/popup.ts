import { navigateToFavorites, navigateToStats, navigateToTestTools, navigateToOptions, navigateToThemeSettings, navigateToDatabaseStats, navigateToWatchStats, navigateToWatchHistory } from "./popup-progress.js";
import { openExtensionPage } from "./popup-runtime.js";
import { initThemedPage } from "../../themes/index.js";
import { getValue } from "../../database/implementations/index.js";
import { isLlmConfigured } from "../../engine/llm-client.js";

function formatTime(timestamp: number | null): string {
  if (!timestamp) {
    return "-";
  }
  const date = new Date(timestamp);
  return `${date.getMonth() + 1}/${date.getDate()} ${date
    .getHours()
    .toString()
    .padStart(2, "0")}:${date.getMinutes().toString().padStart(2, "0")}`;
}

function setText(id: string, value: string): void {
  const el = document.getElementById(id);
  if (el) {
    el.textContent = value;
  }
}

async function loadStatus(): Promise<void> {
  try {
    const settings = await getValue<{ userId?: number }>("settings");
    const userId = settings?.userId;
    const userIdEl = document.getElementById("status-user-id");

    if (userIdEl) {
      if (userId) {
        userIdEl.textContent = String(userId);
      } else {
        userIdEl.textContent = "未设置";
        userIdEl.style.color = "#ff6b6b";
        userIdEl.style.cursor = "pointer";
        userIdEl.title = "点击前往设置页面";
        userIdEl.addEventListener("click", () => {
          navigateToOptions();
        });
      }
    }
  } catch (error) {
    console.error("[popup] Failed to load status:", error);
  }
}

function bindButtons(): void {
  const btnStats = document.getElementById("btn-stats");
  if (btnStats) {
    btnStats.addEventListener("click", (event) => {
      console.log("[popup] btn-stats clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToStats();
    });
  }

  const btnWatchStats = document.getElementById("btn-watch-stats");
  if (btnWatchStats) {
    btnWatchStats.addEventListener("click", (event) => {
      console.log("[popup] btn-watch-stats clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToWatchStats();
    });
  }

  const btnWatchHistory = document.getElementById("btn-watch-history");
  if (btnWatchHistory) {
    btnWatchHistory.addEventListener("click", (event) => {
      console.log("[popup] btn-watch-history clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToWatchHistory();
    });
  }

  const btnFavorites = document.getElementById("btn-favorites");
  if (btnFavorites) {
    btnFavorites.addEventListener("click", (event) => {
      console.log("[popup] btn-favorites clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToFavorites();
    });
  }

  const btnInterestStats = document.getElementById("btn-interest-stats");
  if (btnInterestStats) {
    btnInterestStats.addEventListener("click", (event) => {
      console.log("[popup] btn-interest-stats clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToWatchStats();
    });
  }

  const btnThemeSettings = document.getElementById("btn-theme-settings");
  if (btnThemeSettings) {
    btnThemeSettings.addEventListener("click", (event) => {
      console.log("[popup] btn-theme-settings clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToThemeSettings();
    });
  }

  const btnSettings = document.getElementById("btn-settings");
  if (btnSettings) {
    btnSettings.addEventListener("click", (event) => {
      console.log("[popup] btn-settings clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToOptions();
    });
  }

  const btnDatabaseStats = document.getElementById("btn-database-stats");
  if (btnDatabaseStats) {
    btnDatabaseStats.addEventListener("click", (event) => {
      console.log("[popup] btn-database-stats clicked");
      event.preventDefault();
      event.stopPropagation();
      navigateToDatabaseStats();
    });
  }
}

async function checkLlmConfiguration(): Promise<void> {
  try {
    const configured = await isLlmConfigured();
    const btnInterestStats = document.getElementById("btn-interest-stats") as HTMLButtonElement | null;
    
    if (btnInterestStats && !configured) {
      // 禁用按钮
      btnInterestStats.disabled = true;
      btnInterestStats.style.opacity = "0.5";
      btnInterestStats.style.cursor = "not-allowed";
      
      // 添加警告提示
      btnInterestStats.title = "兴趣分析功能需要LLM API配置。请前往设置页面配置。";
      btnInterestStats.style.pointerEvents = "none";
      
      // 添加警告标记
      const badge = document.createElement('span');
      badge.style.position = "absolute";
      badge.style.top = "-5px";
      badge.style.right = "-5px";
      badge.style.backgroundColor = "#ff6b6b";
      badge.style.color = "white";
      badge.style.borderRadius = "50%";
      badge.style.width = "18px";
      badge.style.height = "18px";
      badge.style.display = "flex";
      badge.style.alignItems = "center";
      badge.style.justifyContent = "center";
      badge.style.fontSize = "12px";
      badge.style.fontWeight = "bold";
      badge.title = "需要配置";
      badge.textContent = "!";
      
      btnInterestStats.style.position = "relative";
      btnInterestStats.appendChild(badge);
    }
  } catch (error) {
    console.error("[popup] Failed to check LLM configuration:", error);
  }
}

export function initPopup(): void {
  if (typeof document === "undefined") {
    return;
  }
  initThemedPage("popup");
  bindButtons();
  void loadStatus();
  void checkLlmConfiguration();
}

if (typeof document !== "undefined") {
  initPopup();
}
