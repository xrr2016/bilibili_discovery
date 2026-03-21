declare const chrome: {
  runtime: {
    sendMessage: (message: unknown, callback?: (response: unknown) => void) => void;
    getURL: (path: string) => string;
    onMessage: {
      addListener: (callback: (message: unknown) => void) => void;
      removeListener: (callback: (message: unknown) => void) => void;
    };
  };
  tabs: {
    create: (options: { url: string }) => void;
    query: (queryInfo: { active?: boolean; currentWindow?: boolean }) => Promise<{ id?: number }[]>;
    update: (tabId: number | undefined, updateProperties: { url: string }) => void;
  };
};

export function hasChromeRuntime(): boolean {
  return typeof chrome !== "undefined";
}

export function sendMessage<T>(type: string): Promise<T | null> {
  if (!hasChromeRuntime()) {
    return Promise.resolve(null);
  }
  return new Promise((resolve) => {
    chrome.runtime.sendMessage({ type }, (response) => {
      resolve((response ?? null) as T | null);
    });
  });
}

export function addRuntimeListener(listener: (message: unknown) => void): void {
  if (hasChromeRuntime()) {
    chrome.runtime.onMessage.addListener(listener);
  }
}

export function removeRuntimeListener(listener: (message: unknown) => void): void {
  if (hasChromeRuntime()) {
    chrome.runtime.onMessage.removeListener(listener);
  }
}

export function openExtensionPage(path: string): void {
  if (hasChromeRuntime()) {
    chrome.tabs.create({ url: chrome.runtime.getURL(path) });
  }
}

export async function navigateCurrentTab(url: string): Promise<void> {
  if (!hasChromeRuntime()) {
    return;
  }
  const activeTab = await chrome.tabs.query({ active: true, currentWindow: true });
  const targetTabId = activeTab[0]?.id;
  chrome.tabs.update(targetTabId, { url });
}
