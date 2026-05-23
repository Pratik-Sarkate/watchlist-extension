// Inject the interceptor script (non-blocking).
// Even though it's async, we inject very early (document_start),
// so it runs before most TradingView code.
const _script = document.createElement("script");
_script.src = chrome.runtime.getURL("injected.js");
_script.async = false; // Execute in order, but don't block parsing
_script.onload = () => {
  console.log("[TV-WL] Interceptor script loaded");
};
_script.onerror = () => {
  console.error("[TV-WL] Failed to load interceptor script");
};
(document.head || document.documentElement).appendChild(_script);

// Listen for messages from injected script
window.addEventListener("message", async (event) => {
  if (event.source !== window) return;

  if (event.data?.type === "TV_WL_GET_DATA") {
    const data = await getStorageData();
    window.postMessage({ type: "TV_WL_DATA_RESPONSE", data }, "*");
  }

  if (event.data?.type === "TV_WL_SAVE_DATA") {
    await saveStorageData(event.data.payload);
    window.postMessage({ type: "TV_WL_SAVE_ACK" }, "*");
  }
});

function getStorageData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(["tv_watchlists"], (result) => {
      resolve(result.tv_watchlists || null);
    });
  });
}

function saveStorageData(data) {
  return new Promise((resolve) => {
    chrome.storage.local.set({ tv_watchlists: data }, resolve);
  });
}
