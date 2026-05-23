// content.js
const _script = document.createElement("script");
_script.src = chrome.runtime.getURL("injected.js");
_script.async = false;
_script.onload = () => console.log("[TV-WL] Interceptor script loaded");
_script.onerror = () =>
  console.error("[TV-WL] Failed to load interceptor script");
(document.head || document.documentElement).appendChild(_script);

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

  // ↓ Now routes through background service worker instead of content script fetch
  if (event.data?.type === "TV_WL_FETCH") {
    const { url, options, requestId } = event.data;
    try {
      const result = await chrome.runtime.sendMessage({
        type: "TV_WL_BG_FETCH",
        url,
        options,
      });

      if (!result.ok) throw new Error(result.error);

      window.postMessage(
        {
          type: "TV_WL_FETCH_RESPONSE",
          requestId,
          status: result.status,
          statusText: result.statusText,
          body: result.body,
          headers: result.headers,
        },
        "*",
      );
    } catch (error) {
      window.postMessage(
        {
          type: "TV_WL_FETCH_ERROR",
          requestId,
          error: error.message,
        },
        "*",
      );
    }
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
