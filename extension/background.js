// LiReader background service worker (MV3).
// On toolbar-icon click, ask the current tab's content script to toggle the reader.
chrome.action.onClicked.addListener((tab) => {
  if (tab && tab.id != null) {
    chrome.tabs.sendMessage(tab.id, { type: "toggle-reader" }).catch(() => {
      // No content script on this page (e.g. edge:// or a store page) — ignore.
    });
  }
});

// Fetch proxy for the content script (dictionary / Wikipedia / translation).
// Supports GET and POST (with headers/body) and a configurable timeout.
chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
  if (msg && msg.type === "lireader-fetch" && typeof msg.url === "string") {
    const timeout = (typeof msg.timeout === "number") ? msg.timeout : 15000;
    const controller = new AbortController();
    let timer = null;
    if (timeout > 0) timer = setTimeout(() => controller.abort(), timeout);
    const opts = {
      method: msg.method || "GET",
      headers: msg.headers || {},
      signal: controller.signal,
    };
    if (msg.body != null) opts.body = msg.body;
    fetch(msg.url, opts)
      .then(async (r) => {
        clearTimeout(timer);
        const text = await r.text();
        sendResponse({ ok: r.ok, status: r.status, text });
      })
      .catch((err) => {
        clearTimeout(timer);
        const reason = (err && err.name === "AbortError")
          ? "timed out after " + timeout + "ms"
          : String(err);
        sendResponse({ ok: false, error: reason });
      });
    return true; // keep the channel open for the async sendResponse
  }
});
