// background.js
// Handles all fetch requests from content scripts.
// Runs in the service worker context — completely invisible to ad blockers.

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type !== "TV_WL_BG_FETCH") return false;

  const { url, options } = message;

  fetch(url, options)
    .then(async (response) => {
      const text = await response.text();
      sendResponse({
        ok: true,
        status: response.status,
        statusText: response.statusText,
        body: text,
        headers: Object.fromEntries(response.headers.entries()),
      });
    })
    .catch((error) => {
      sendResponse({ ok: false, error: error.message });
    });

  // Return true to keep the message channel open for the async response
  return true;
});
