import type { WatchHistoryPageState } from "./types.js";

export function createInitialWatchHistoryState(): WatchHistoryPageState {
  return {
    loading: false,
    keyword: "",
    creatorKeyword: "",
    tagKeyword: "",
    includeTagIds: [],
    excludeTagIds: [],
    durationMin: "",
    durationMax: "",
    watchDurationMin: "",
    watchDurationMax: "",
    progressMin: "",
    progressMax: "",
    publishDateStart: "",
    publishDateEnd: "",
    watchDateStart: "",
    watchDateEnd: "",
    completeFilter: "all",
    rewatchFilter: "all",
    includeInvalid: false,
    sortBy: "endTime",
    sortOrder: "desc",
    currentPage: 0,
    pageSize: 10
  };
}

export function formatDuration(totalSeconds: number): string {
  const safe = Math.max(0, Math.floor(totalSeconds));
  const hours = Math.floor(safe / 3600);
  const minutes = Math.floor((safe % 3600) / 60);
  const seconds = safe % 60;

  if (hours > 0) {
    return `${hours}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  }

  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

export function formatDate(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

export function formatDateTime(timestamp?: number): string {
  if (!timestamp) {
    return "-";
  }

  const date = new Date(timestamp);
  return `${formatDate(timestamp)} ${String(date.getHours()).padStart(2, "0")}:${String(date.getMinutes()).padStart(2, "0")}`;
}

export function formatProgress(progress: number): string {
  return `${Math.round(progress * 100)}%`;
}

export function parseOptionalNumber(value: string): number | undefined {
  const normalized = value.trim();
  if (!normalized) {
    return undefined;
  }

  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function parseDateInput(value: string, endOfDay = false): number | undefined {
  if (!value) {
    return undefined;
  }

  const date = new Date(`${value}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (endOfDay) {
    date.setHours(23, 59, 59, 999);
  }

  return date.getTime();
}

export function clampProgressInput(value: string): number | undefined {
  const parsed = parseOptionalNumber(value);
  if (parsed === undefined) {
    return undefined;
  }

  return parsed / 100;
}
