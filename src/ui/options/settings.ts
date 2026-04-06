import { getValue, setValue, type AppSettings as Settings } from "../../database/implementations/index.js";

export const DEFAULT_SETTINGS: Settings = {
  cacheHours: 24,
  userId: null,
  apiBaseUrl: "https://api.deepseek.com",
  apiModel: "deepseek-chat",
  apiKey: "",
  imageCacheRetentionDays: 30
};

export function normalizeSettings(input: Partial<Settings>): Settings {
  const cacheHoursRaw = Number(input.cacheHours ?? DEFAULT_SETTINGS.cacheHours);
  const cacheHours = Math.min(168, Math.max(1, cacheHoursRaw));
  const userIdRaw = Number(input.userId);
  const userId = Number.isFinite(userIdRaw) && userIdRaw > 0 ? userIdRaw : null;
  const apiBaseUrl = String(input.apiBaseUrl ?? DEFAULT_SETTINGS.apiBaseUrl).trim();
  const apiModel = String(input.apiModel ?? DEFAULT_SETTINGS.apiModel).trim();
  const apiKey = String(input.apiKey ?? DEFAULT_SETTINGS.apiKey).trim();
  const imageCacheRetentionDaysRaw = Number(
    input.imageCacheRetentionDays ?? DEFAULT_SETTINGS.imageCacheRetentionDays
  );
  const imageCacheRetentionDays: Settings["imageCacheRetentionDays"] =
    imageCacheRetentionDaysRaw === 7 ||
    imageCacheRetentionDaysRaw === 30 ||
    imageCacheRetentionDaysRaw === 180 ||
    imageCacheRetentionDaysRaw === 365
      ? imageCacheRetentionDaysRaw
      : DEFAULT_SETTINGS.imageCacheRetentionDays;

  return {
    cacheHours,
    userId,
    apiBaseUrl,
    apiModel,
    apiKey,
    imageCacheRetentionDays
  };
}

export async function loadSettings(): Promise<Settings> {
  const saved = (await getValue<Settings>("settings")) ?? DEFAULT_SETTINGS;
  return normalizeSettings(saved);
}

export async function saveSettings(settings: Settings): Promise<void> {
  await setValue("settings", settings);
  if (settings.userId) {
    await setValue("userId", settings.userId);
  }
}
