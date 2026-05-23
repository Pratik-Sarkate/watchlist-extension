(() => {
  "use strict";

  // ─── Storage Bridge ───────────────────────────────────────────────────────────
  const StorageBridge = {
    _resolvers: {},
    _counter: 0,
    _fetchCounter: 0,

    init() {
      window.addEventListener("message", (e) => {
        if (e.source !== window) return;
        if (e.data?.type === "TV_WL_DATA_RESPONSE") {
          const resolve = this._resolvers["get"];
          if (resolve) {
            delete this._resolvers["get"];
            resolve(e.data.data);
          }
        }
        if (e.data?.type === "TV_WL_SAVE_ACK") {
          const resolve = this._resolvers["save"];
          if (resolve) {
            delete this._resolvers["save"];
            resolve();
          }
        }
        if (e.data?.type === "TV_WL_FETCH_RESPONSE") {
          const resolver = this._resolvers["fetch_" + e.data.requestId];
          if (resolver) {
            delete this._resolvers["fetch_" + e.data.requestId];
            const response = new Response(e.data.body, {
              status: e.data.status,
              statusText: e.data.statusText,
              headers: e.data.headers,
            });
            resolver.resolve(response);
          }
        }
        if (e.data?.type === "TV_WL_FETCH_ERROR") {
          const resolver = this._resolvers["fetch_" + e.data.requestId];
          if (resolver) {
            delete this._resolvers["fetch_" + e.data.requestId];
            resolver.reject(new Error(e.data.error));
          }
        }
      });
    },

    async get() {
      return new Promise((resolve) => {
        this._resolvers["get"] = resolve;
        window.postMessage({ type: "TV_WL_GET_DATA" }, "*");
      });
    },

    async save(data) {
      return new Promise((resolve) => {
        this._resolvers["save"] = resolve;
        window.postMessage({ type: "TV_WL_SAVE_DATA", payload: data }, "*");
      });
    },

    async fetch(url, options) {
      return new Promise((resolve, reject) => {
        const requestId = this._fetchCounter++;
        this._resolvers["fetch_" + requestId] = { resolve, reject };
        window.postMessage(
          { type: "TV_WL_FETCH", url, options, requestId },
          "*",
        );
      });
    },
  };

  StorageBridge.init();

  // ─── Data Cache ───────────────────────────────────────────────────────────────
  // Robust cache system with change tracking
  let cachedData = null;
  let cacheTimestamp = null;
  let lastStorageCheckTime = null;
  let initCachePromise = null; // Prevent concurrent initialization
  const CACHE_TTL = 500; // Milliseconds - how long to trust cache before re-checking storage

  async function initializeCache() {
    // If already initializing or initialized, return the promise/void
    if (initCachePromise) {
      console.log("[TV-WL] Cache init already in progress, waiting...");
      return initCachePromise;
    }

    initCachePromise = (async () => {
      try {
        console.log("[TV-WL] Initializing cache...");
        cachedData = await getData();
        cacheTimestamp = Date.now();
        console.log(
          "[TV-WL] ✅ Cache initialized with",
          cachedData.watchlists.length,
          "watchlists at",
          new Date(cacheTimestamp).toISOString(),
        );
      } catch (e) {
        console.error("[TV-WL] Cache initialization failed:", e);
        cachedData = createDefaultData();
        cacheTimestamp = Date.now();
      }
    })();

    return initCachePromise;
  }

  async function getCachedData() {
    // If cache is not initialized yet, wait for initialization to complete
    if (!cachedData || !cacheTimestamp) {
      await initializeCache();
      return cachedData;
    }

    // If cache is fresh enough, use it
    const age = Date.now() - cacheTimestamp;
    if (age < CACHE_TTL) {
      return cachedData;
    }

    // Cache is stale, refresh from storage
    console.log(
      "[TV-WL] Cache is stale (",
      age,
      "ms old), refreshing from storage",
    );
    try {
      const freshData = await getData();
      cachedData = freshData;
      cacheTimestamp = Date.now();
      return cachedData;
    } catch (e) {
      console.error("[TV-WL] Failed to refresh cache:", e);
      // Return stale cache if refresh fails
      return cachedData;
    }
  }

  function invalidateCache() {
    console.log("[TV-WL] Cache invalidated - will refresh on next request");
    cacheTimestamp = 0; // Mark as expired
  }
  const COLORS = ["red", "orange", "green", "purple", "blue", "cyan", "pink"];
  const COLOR_HEX = {
    red: "#ef5350",
    orange: "#ff9800",
    green: "#26a69a",
    purple: "#9c27b0",
    blue: "#2196f3",
    cyan: "#00bcd4",
    pink: "#e91e63",
  };

  function createDefaultData() {
    const now = new Date().toISOString();
    return {
      watchlists: [
        // ── Custom Lists ──────────────────────────────────────────────
        {
          id: Date.now() + 1,
          type: "custom",
          name: "Nifty 50 Top Picks",
          symbols: [
            "NSE:RELIANCE",
            "NSE:TCS",
            "NSE:HDFCBANK",
            "NSE:INFY",
            "NSE:ICICIBANK",
            "NSE:HINDUNILVR",
            "NSE:SBIN",
            "NSE:BHARTIARTL",
            "NSE:ITC",
            "NSE:KOTAKBANK",
          ],
          active: false,
          shared: false,
          color: null,
          description: "Top Nifty 50 constituents",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 2,
          type: "custom",
          name: "Auto Sector",
          symbols: [
            "NSE:MARUTI",
            "NSE:TATAMOTORS",
            "NSE:M_M",
            "NSE:BAJAJ_AUTO",
            "NSE:HEROMOTOCO",
            "NSE:EICHERMOT",
            "NSE:TVSMOTOR",
            "NSE:ASHOKLEY",
            "NSE:BALKRISIND",
            "NSE:BHARATFORG",
            "NSE:MRF",
            "NSE:EXIDEIND",
            "NSE:BOSCHLTD",
            "NSE:AMARAJABAT",
            "NSE:MOTHERSUMI",
          ],
          active: false,
          shared: false,
          color: null,
          description: "NSE Auto index constituents",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 3,
          type: "custom",
          name: "IT Sector",
          symbols: [
            "NSE:TCS",
            "NSE:INFY",
            "NSE:WIPRO",
            "NSE:HCLTECH",
            "NSE:TECHM",
            "NSE:LTIM",
            "NSE:MPHASIS",
            "NSE:COFORGE",
            "NSE:PERSISTENT",
            "NSE:OFSS",
          ],
          active: false,
          shared: false,
          color: null,
          description: "NSE IT index constituents",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 4,
          type: "custom",
          name: "Banking & Finance",
          symbols: [
            "NSE:HDFCBANK",
            "NSE:ICICIBANK",
            "NSE:SBIN",
            "NSE:KOTAKBANK",
            "NSE:AXISBANK",
            "NSE:INDUSINDBK",
            "NSE:BANKBARODA",
            "NSE:PNB",
            "NSE:FEDERALBNK",
            "NSE:IDFCFIRSTB",
            "NSE:BAJFINANCE",
            "NSE:BAJAJFINSV",
          ],
          active: false,
          shared: false,
          color: null,
          description: "Banking & NBFC stocks",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 5,
          type: "custom",
          name: "Pharma & Healthcare",
          symbols: [
            "NSE:SUNPHARMA",
            "NSE:DRREDDY",
            "NSE:CIPLA",
            "NSE:DIVISLAB",
            "NSE:BIOCON",
            "NSE:LUPIN",
            "NSE:AUROPHARMA",
            "NSE:GLAND",
            "NSE:TORNTPHARM",
            "NSE:ALKEM",
          ],
          active: false,
          shared: false,
          color: null,
          description: "Pharma sector picks",
          created: now,
          modified: now,
        },
        // ── Colored Lists ─────────────────────────────────────────────
        {
          id: Date.now() + 10,
          type: "colored",
          name: "Strong Buy",
          color: "green",
          symbols: [
            "NSE:RELIANCE",
            "NSE:TCS",
            "NSE:HDFCBANK",
            "NSE:INFY",
            "NSE:ICICIBANK",
          ],
          active: false,
          shared: false,
          description: "High conviction longs",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 11,
          type: "colored",
          name: "Watchlist",
          color: "blue",
          symbols: [
            "NSE:ADANIENT",
            "NSE:ADANIPORTS",
            "NSE:POWERGRID",
            "NSE:NTPC",
            "NSE:ONGC",
          ],
          active: false,
          shared: false,
          description: "Stocks to watch",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 12,
          type: "colored",
          name: "Caution",
          color: "orange",
          symbols: ["NSE:ZOMATO", "NSE:PAYTM", "NSE:NYKAA", "NSE:POLICYBZR"],
          active: false,
          shared: false,
          description: "High risk / volatile",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 13,
          type: "colored",
          name: "Avoid / Short",
          color: "red",
          symbols: [],
          active: false,
          shared: false,
          description: "Stocks to avoid",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 14,
          type: "colored",
          name: "Swing Trades",
          color: "purple",
          symbols: [
            "NSE:TATASTEEL",
            "NSE:HINDALCO",
            "NSE:VEDL",
            "NSE:SAIL",
            "NSE:JSWSTEEL",
          ],
          active: false,
          shared: false,
          description: "Active swing trade setups",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 15,
          type: "colored",
          name: "Momentum",
          color: "cyan",
          symbols: [
            "NSE:BAJFINANCE",
            "NSE:DIXON",
            "NSE:POLYCAB",
            "NSE:ASTRAL",
            "NSE:SUPREMEIND",
          ],
          active: false,
          shared: false,
          description: "High momentum stocks",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 16,
          type: "colored",
          name: "Speculative",
          color: "pink",
          symbols: [],
          active: false,
          shared: false,
          description: "High risk speculative bets",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 17,
          type: "colored",
          name: "Pending",
          color: "red",
          symbols: [],
          active: false,
          shared: false,
          description: "Stocks to review",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 18,
          type: "colored",
          name: "Holdings",
          color: "orange",
          symbols: [],
          active: false,
          shared: false,
          description: "Current portfolio",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 19,
          type: "colored",
          name: "Tracking",
          color: "green",
          symbols: [],
          active: false,
          shared: false,
          description: "Stocks to track",
          created: now,
          modified: now,
        },
        {
          id: Date.now() + 20,
          type: "colored",
          name: "Watchlist",
          color: "blue",
          symbols: [],
          active: false,
          shared: false,
          description: "General watchlist",
          created: now,
          modified: now,
        },
      ],
    };
  }

  async function getData() {
    let data = await StorageBridge.get();
    if (!data) {
      data = createDefaultData();
      await StorageBridge.save(data);
    }

    // Fix old data: ensure all colored lists have valid IDs (not null)
    // This helps migrate from old versions where IDs were null
    const needsFix = data.watchlists.some((w) => w.type === "colored" && !w.id);
    if (needsFix) {
      data.watchlists = data.watchlists.map((w) => {
        if (w.type === "colored" && !w.id) {
          return {
            ...w,
            id: Date.now() + Math.random(),
            created: new Date().toISOString(),
            modified: new Date().toISOString(),
          };
        }
        return w;
      });
      await StorageBridge.save(data);
    }

    // Remove duplicate colored lists (keep first of each color, remove others)
    const seenColors = new Set();
    const uniqueColoredLists = [];
    let hasDuplicates = false;

    data.watchlists.forEach((w) => {
      if (w.type === "colored") {
        if (!seenColors.has(w.color)) {
          seenColors.add(w.color);
          uniqueColoredLists.push(w);
        } else {
          hasDuplicates = true;
          console.log(
            `[TV-WL] Removing duplicate ${w.color} list: "${w.name}"`,
          );
        }
      }
    });

    if (hasDuplicates) {
      // Rebuild watchlist array with custom lists + unique colored lists
      data.watchlists = [
        ...data.watchlists.filter((w) => w.type === "custom"),
        ...uniqueColoredLists,
      ];
      await StorageBridge.save(data);
    }

    // Ensure all 7 colors always exist (add missing ones with empty symbols)
    const existingColors = data.watchlists
      .filter((w) => w.type === "colored")
      .map((w) => w.color);
    const now = new Date().toISOString();
    let addedColors = false;
    COLORS.forEach((c) => {
      if (!existingColors.includes(c)) {
        data.watchlists.push({
          id: Date.now() + Math.random(),
          type: "colored",
          name: `${c.charAt(0).toUpperCase()}${c.slice(1)} List`,
          active: false,
          color: c,
          symbols: [],
          shared: false,
          description: null,
          created: now,
          modified: now,
        });
        addedColors = true;
      }
    });

    // Ensure all colored lists have names (fix old data)
    data.watchlists.forEach((w) => {
      if (w.type === "colored" && (!w.name || w.name.trim() === "")) {
        w.name = `${w.color.charAt(0).toUpperCase()}${w.color.slice(1)} List`;
      }
    });

    // If we added any new colors or fixed names, persist the updated list
    if (addedColors || hasDuplicates) {
      await StorageBridge.save(data);
    }
    return data;
  }

  async function saveData(data) {
    data.watchlists.forEach((w) => {
      w.modified = new Date().toISOString();
    });
    await StorageBridge.save(data);
    // Immediately update cache with new data
    cachedData = data;
    cacheTimestamp = Date.now();
    console.log("[TV-WL] ✅ Data saved and cache updated");
  }

  // ─── URL Interception ─────────────────────────────────────────────────────────
  const INTERCEPT_BASE = "/api/v1/symbols_list/";

  // Monitor storage changes and invalidate cache
  const watchStorageChanges = () => {
    window.addEventListener("message", (e) => {
      if (e.source !== window) return;
      // When content.js responds with data, mark cache as potentially stale
      if (e.data?.type === "TV_WL_DATA_RESPONSE") {
        // Don't invalidate on simple reads, only on writes
      }
      if (e.data?.type === "TV_WL_SAVE_ACK") {
        // Storage was updated externally, refresh cache soon
        console.log("[TV-WL] Storage updated by save operation");
      }
    });
  };
  watchStorageChanges();

  function shouldIntercept(url) {
    try {
      const u = new URL(url, location.href);
      // Match both relative paths (/api/v1/symbols_list/...) and full URLs
      const pathname = u.pathname;
      return pathname.includes(INTERCEPT_BASE);
    } catch {
      return false;
    }
  }

  // Parse pathname → { listType, id }
  // /api/v1/symbols_list/custom           → { listType:'custom', id:null }
  // /api/v1/symbols_list/custom/50480543  → { listType:'custom', id:'50480543' }
  // /api/v1/symbols_list/colored/red      → { listType:'colored', id:null } (color names are not IDs)
  // /api/v1/symbols_list/all              → { listType:'all',    id:null }
  function parseEndpoint(url) {
    try {
      const u = new URL(url, location.href);
      const idx = u.pathname.indexOf(INTERCEPT_BASE);
      const rest = u.pathname
        .slice(idx + INTERCEPT_BASE.length)
        .replace(/^\//, "");
      const parts = rest.split("/").filter(Boolean);
      const listType = parts[0] || "all";
      let id = parts[1] || null;

      // If the "id" is a color name, it's not really an ID—ignore it
      if (COLORS.includes(id)) {
        id = null;
      }

      return { listType, id };
    } catch {
      return { listType: "all", id: null };
    }
  }

  async function buildResponse(url) {
    // Use robust cache with TTL and auto-refresh
    const data = await getCachedData();
    const { listType, id } = parseEndpoint(url);
    let list = data.watchlists;

    console.log("[TV-WL] buildResponse: listType=", listType, "id=", id);
    console.log("[TV-WL] Total watchlists in storage:", data.watchlists.length);

    if (listType === "custom") list = list.filter((w) => w.type === "custom");
    else if (listType === "colored")
      list = list.filter((w) => w.type === "colored");
    else if (listType === "active")
      list = list.filter((w) => w.active === true);
    // "all" → no filter

    console.log(
      "[TV-WL] After filtering:",
      list.length,
      "items of type",
      listType,
    );

    // Single-item request (e.g. /custom/50480543)
    if (id) {
      const item = list.find((w) => String(w.id) === String(id));
      if (!item) {
        console.log("[TV-WL] Item with ID", id, "not found");
        return new Response(JSON.stringify({ error: "Not found" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      console.log("[TV-WL] Returning single item:", item.name);
      const sanitized = sanitizeWatchlistItem(item);
      return new Response(JSON.stringify(sanitized), {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      });
    }

    console.log("[TV-WL] Returning array of", list.length, "items");
    const sanitized = list.map(sanitizeWatchlistItem);
    const responseBody = JSON.stringify(sanitized);
    console.log(
      "[TV-WL] Response body first 200 chars:",
      responseBody.substring(0, 200),
    );
    return new Response(responseBody, {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    });
  }

  // Ensure watchlist items have all required fields TradingView expects
  function sanitizeWatchlistItem(item) {
    return {
      id: item.id,
      type: item.type || "custom",
      name: item.name || "Unnamed",
      symbols: Array.isArray(item.symbols) ? item.symbols : [],
      color: item.color || null,
      active: item.active === true,
      shared: item.shared === true,
      description: item.description || null,
      created: item.created || new Date().toISOString(),
      modified: item.modified || new Date().toISOString(),
    };
  }

  // Intercept fetch
  const originalFetch = window.fetch;
  window.fetch = async function (input, init) {
    const url =
      typeof input === "string"
        ? input
        : input instanceof Request
          ? input.url
          : String(input);
    if (shouldIntercept(url)) {
      console.log("[TV-WL] ✅ Fetch Intercepted:", url);
      console.log("[TV-WL] Parsed endpoint:", parseEndpoint(url));
      const response = await buildResponse(url);
      console.log("[TV-WL] Returning custom response:", response.status);
      return response;
    }
    return originalFetch.apply(this, arguments);
  };

  // Intercept XHR
  const OrigXHR = window.XMLHttpRequest;
  function PatchedXHR() {
    const xhr = new OrigXHR();
    let _url = "";
    const origOpen = xhr.open.bind(xhr);
    xhr.open = function (method, url, ...rest) {
      _url = url;
      return origOpen(method, url, ...rest);
    };
    const origSend = xhr.send.bind(xhr);
    xhr.send = function (...args) {
      if (shouldIntercept(_url)) {
        console.log("[TV-WL] XHR Intercepted:", _url);
        buildResponse(_url).then(async (res) => {
          const text = await res.text();
          Object.defineProperty(xhr, "readyState", { get: () => 4 });
          Object.defineProperty(xhr, "status", { get: () => 200 });
          Object.defineProperty(xhr, "responseText", { get: () => text });
          Object.defineProperty(xhr, "response", { get: () => text });
          xhr.dispatchEvent(new Event("load"));
          xhr.dispatchEvent(new Event("loadend"));
          if (xhr.onload) xhr.onload(new Event("load"));
          if (xhr.onreadystatechange)
            xhr.onreadystatechange(new Event("readystatechange"));
        });
        return;
      }
      return origSend(...args);
    };
    return xhr;
  }
  PatchedXHR.prototype = OrigXHR.prototype;
  window.XMLHttpRequest = PatchedXHR;

  // ─── Active Symbol Tracker ────────────────────────────────────────────────────
  let activeSymbol = null;

  function extractSymbolFromUrl(url) {
    try {
      const u = new URL(url);
      const sym = u.searchParams.get("symbol");
      return sym ? decodeURIComponent(sym) : null;
    } catch {
      return null;
    }
  }

  // Observe scanner requests
  const origFetchForSym = window.fetch;
  window.fetch = (function (orig) {
    return async function (input, init) {
      const url =
        typeof input === "string"
          ? input
          : input instanceof Request
            ? input.url
            : String(input);
      if (url.includes("scanner.tradingview.com/symbol")) {
        const sym = extractSymbolFromUrl(url);
        if (sym) {
          activeSymbol = sym;
          updatePanelSymbol(sym);
        }
      }
      return orig.apply(this, arguments);
    };
  })(window.fetch);

  // ─── UI ───────────────────────────────────────────────────────────────────────
  let panelOpen = false;
  let currentListId = null; // null means no active list selected for +
  let appData = null;

  async function refreshData() {
    appData = await getData();
    // Also update cache whenever UI refreshes
    cachedData = appData;
    cacheTimestamp = Date.now();
    return appData;
  }

  function updatePanelSymbol(sym) {
    const btn = document.getElementById("tvwl-add-btn");
    if (btn) {
      const label = sym ? sym.split(":").pop() : "+ Add";
      btn.textContent = sym ? `+ ${label}` : "+ Add";
      btn.title = sym ? `Add ${sym} to active list` : "No symbol selected";
    }
  }

  function debugLogData() {
    console.clear();
    console.log(
      "%c📋 TradingView Watchlist Data Debug",
      "font-size: 16px; font-weight: bold; color: #2196f3;",
    );
    if (appData) {
      console.log("✅ In-Memory Cache:", appData);
      console.table(
        appData.watchlists.map((w) => ({
          ID: w.id,
          Name: w.name,
          Type: w.type,
          Color: w.color,
          Symbols: w.symbols.length,
          Created: w.created,
        })),
      );
      console.log("Total Watchlists:", appData.watchlists.length);
      console.log(
        "Colored Lists:",
        appData.watchlists.filter((w) => w.type === "colored").length,
      );
      console.log(
        "Custom Lists:",
        appData.watchlists.filter((w) => w.type === "custom").length,
      );
    }
  }

  function injectStyles() {
    if (document.getElementById("tvwl-styles")) return;
    const style = document.createElement("style");
    style.id = "tvwl-styles";
    style.textContent = `
      #tvwl-root {
        position: fixed;
        bottom: 24px;
        right: 24px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
        font-size: 13px;
        color: #d1d4dc;
      }
      #tvwl-fab-row {
        display: flex;
        flex-direction: column;
        align-items: flex-end;
        gap: 8px;
      }
      .tvwl-fab {
        width: 44px; height: 44px;
        border-radius: 50%;
        background: #2962ff;
        color: #fff;
        border: none;
        cursor: pointer;
        font-size: 20px;
        display: flex; align-items: center; justify-content: center;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        transition: background 0.2s, transform 0.1s;
        flex-shrink: 0;
      }
      .tvwl-fab:hover { background: #1a47cc; transform: scale(1.08); }
      #tvwl-add-btn {
        min-width: 80px; width: auto; height: 36px;
        border-radius: 18px;
        background: #26a69a;
        color: #fff; border: none; cursor: pointer;
        font-size: 12px; font-weight: 600;
        padding: 0 14px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
        transition: background 0.2s, transform 0.1s;
        white-space: nowrap;
        max-width: 160px; overflow: hidden; text-overflow: ellipsis;
      }
      #tvwl-add-btn:hover { background: #1e897a; transform: scale(1.05); }
      #tvwl-color-bar {
        display: flex; gap: 6px; align-items: center;
        background: #1e222d;
        border-radius: 24px;
        padding: 6px 10px;
        box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      }
      .tvwl-color-dot {
        width: 26px; height: 26px;
        border-radius: 50%;
        cursor: pointer;
        border: 2px solid transparent;
        transition: transform 0.15s, border-color 0.15s;
        flex-shrink: 0;
      }
      .tvwl-color-dot:hover { transform: scale(1.2); border-color: #fff; }
      #tvwl-panel {
        position: fixed;
        bottom: 100px;
        right: 24px;
        width: 320px;
        max-height: 70vh;
        background: #1e222d;
        border-radius: 12px;
        box-shadow: 0 8px 32px rgba(0,0,0,0.7);
        display: none;
        flex-direction: column;
        overflow: hidden;
        z-index: 999999;
        border: 1px solid #2a2e39;
      }
      #tvwl-panel.open { display: flex; }
      #tvwl-panel-header {
        padding: 14px 16px 10px;
        font-size: 14px; font-weight: 700;
        color: #d1d4dc;
        border-bottom: 1px solid #2a2e39;
        display: flex; justify-content: space-between; align-items: center;
        flex-shrink: 0;
      }
      #tvwl-panel-header button {
        background: none; border: none; color: #787b86; cursor: pointer; font-size: 16px;
        padding: 0; line-height: 1;
      }
      #tvwl-panel-header button:hover { color: #d1d4dc; }
      #tvwl-list-container {
        overflow-y: auto;
        flex: 1;
        padding: 8px 0;
      }
      #tvwl-list-container::-webkit-scrollbar { width: 4px; }
      #tvwl-list-container::-webkit-scrollbar-track { background: transparent; }
      #tvwl-list-container::-webkit-scrollbar-thumb { background: #363a45; border-radius: 2px; }
      .tvwl-list-item {
        padding: 10px 16px;
        cursor: pointer;
        display: flex;
        align-items: center;
        gap: 10px;
        border-radius: 6px;
        margin: 2px 8px;
        transition: background 0.15s;
        position: relative;
      }
      .tvwl-list-item:hover { background: #2a2e39; }
      .tvwl-list-item.active-list { background: #2962ff22; border: 1px solid #2962ff44; }
      .tvwl-list-item-icon {
        width: 14px; height: 14px; border-radius: 50%; flex-shrink: 0;
      }
      .tvwl-list-item-name {
        flex: 1; font-size: 13px; color: #d1d4dc; font-weight: 500;
        white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
      }
      .tvwl-list-item-count {
        font-size: 11px; color: #787b86; flex-shrink: 0;
      }
      .tvwl-list-actions {
        display: none; gap: 4px; flex-shrink: 0;
      }
      .tvwl-list-item:hover .tvwl-list-actions { display: flex; }
      .tvwl-icon-btn {
        background: none; border: none; cursor: pointer;
        color: #787b86; padding: 2px 4px; border-radius: 4px;
        font-size: 13px; line-height: 1;
        transition: color 0.15s, background 0.15s;
      }
      .tvwl-icon-btn:hover { color: #d1d4dc; background: #363a45; }
      .tvwl-icon-btn.danger:hover { color: #ef5350; background: #ef535020; }
      #tvwl-search-bar {
        padding: 8px 12px;
        border-bottom: 1px solid #2a2e39;
        flex-shrink: 0;
      }
      #tvwl-search-input {
        width: 100%; padding: 6px 10px;
        background: #131722; border: 1px solid #363a45;
        border-radius: 6px; color: #d1d4dc; font-size: 12px;
        box-sizing: border-box; outline: none;
      }
      #tvwl-search-input:focus { border-color: #2962ff; }
      #tvwl-panel-footer {
        padding: 10px 16px;
        border-top: 1px solid #2a2e39;
        flex-shrink: 0;
        display: flex; flex-direction: column; gap: 6px;
      }
      #tvwl-add-list-btn {
        width: 100%;
        padding: 8px;
        background: #2962ff;
        color: #fff; border: none; border-radius: 6px;
        cursor: pointer; font-size: 13px; font-weight: 600;
        transition: background 0.2s;
      }
      #tvwl-add-list-btn:hover { background: #1a47cc; }
      .tvwl-footer-row {
        display: flex; gap: 6px;
      }
      .tvwl-footer-btn {
        flex: 1; padding: 7px 6px;
        border: none; border-radius: 6px;
        cursor: pointer; font-size: 11px; font-weight: 600;
        transition: opacity 0.2s;
      }
      .tvwl-footer-btn:hover { opacity: 0.85; }
      .tvwl-btn-export { background: #363a45; color: #d1d4dc; }
      .tvwl-btn-import { background: #363a45; color: #d1d4dc; }
      .tvwl-btn-csv { background: #26a69a22; color: #26a69a; border: 1px solid #26a69a44; }
      .tvwl-btn-sync { background: #9c27b022; color: #9c27b0; border: 1px solid #9c27b044; }
      /* Modal */
      .tvwl-modal-overlay {
        position: fixed; inset: 0; background: rgba(0,0,0,0.7);
        z-index: 9999999; display: flex; align-items: center; justify-content: center;
      }
      .tvwl-modal {
        background: #1e222d; border-radius: 12px;
        padding: 24px; width: 340px; max-width: 90vw;
        box-shadow: 0 8px 32px rgba(0,0,0,0.8);
        border: 1px solid #2a2e39;
        color: #d1d4dc;
      }
      .tvwl-modal h3 { margin: 0 0 16px; font-size: 15px; font-weight: 700; }
      .tvwl-modal input, .tvwl-modal select {
        width: 100%; padding: 8px 10px;
        background: #131722; border: 1px solid #363a45;
        border-radius: 6px; color: #d1d4dc; font-size: 13px;
        box-sizing: border-box; margin-bottom: 12px;
        outline: none;
      }
      .tvwl-modal input:focus, .tvwl-modal select:focus { border-color: #2962ff; }
      .tvwl-modal-btns { display: flex; gap: 8px; justify-content: flex-end; margin-top: 4px; }
      .tvwl-modal-btns button {
        padding: 8px 16px; border-radius: 6px; border: none;
        cursor: pointer; font-size: 13px; font-weight: 600;
        transition: opacity 0.2s;
      }
      .tvwl-modal-btns button:hover { opacity: 0.85; }
      .tvwl-btn-primary { background: #2962ff; color: #fff; }
      .tvwl-btn-secondary { background: #363a45; color: #d1d4dc; }
      .tvwl-color-picker { display: flex; gap: 8px; flex-wrap: wrap; margin-bottom: 12px; }
      .tvwl-color-opt {
        width: 28px; height: 28px; border-radius: 50%; cursor: pointer;
        border: 2px solid transparent; transition: border-color 0.15s, transform 0.15s;
      }
      .tvwl-color-opt:hover { transform: scale(1.1); }
      .tvwl-color-opt.selected { border-color: #fff; }
      /* Symbol list in detail view */
      .tvwl-sym-list { list-style: none; padding: 0; margin: 0; }
      .tvwl-sym-item {
        display: flex; align-items: center; justify-content: space-between;
        padding: 6px 0; border-bottom: 1px solid #2a2e3940;
        font-size: 12px; color: #b2b5be;
      }
      .tvwl-sym-item:last-child { border-bottom: none; }
      .tvwl-type-badge {
        font-size: 10px; padding: 2px 6px; border-radius: 4px;
        background: #2a2e39; color: #787b86; margin-left: 4px;
      }
      /* Method tabs */
      .tvwl-method-tab {
        transition: all 0.2s;
      }
      .tvwl-method-tab-active {
        color: #2196f3;
        border-bottom-color: #2196f3;
      }
    `;
    document.head.appendChild(style);
  }

  function createUI() {
    if (document.getElementById("tvwl-root")) return;
    injectStyles();

    const root = document.createElement("div");
    root.id = "tvwl-root";

    // Panel
    const panel = document.createElement("div");
    panel.id = "tvwl-panel";
    panel.innerHTML = `
      <div id="tvwl-panel-header">
        <span>📋 My Watchlists</span>
        <div style="display: flex; gap: 4px;">
          <button id="tvwl-debug-btn" title="Debug: Log data to console" style="background: none; border: none; color: #787b86; cursor: pointer; font-size: 14px; padding: 0; line-height: 1;">🐛</button>
          <button id="tvwl-panel-close" title="Close" style="background: none; border: none; color: #787b86; cursor: pointer; font-size: 14px; padding: 0; line-height: 1;">✕</button>
        </div>
      </div>
      <div id="tvwl-search-bar">
        <input id="tvwl-search-input" type="text" placeholder="🔍 Search watchlists..." />
      </div>
      <div id="tvwl-list-container"></div>
      <div id="tvwl-panel-footer">
        <button id="tvwl-add-list-btn">+ New Watchlist</button>
        <div class="tvwl-footer-row">
          <button class="tvwl-footer-btn tvwl-btn-export" id="tvwl-export-btn">⬇ Export JSON</button>
          <button class="tvwl-footer-btn tvwl-btn-import" id="tvwl-import-btn">⬆ Import JSON</button>
          <button class="tvwl-footer-btn tvwl-btn-csv" id="tvwl-csv-btn">📄 CSV</button>
        </div>
        <div class="tvwl-footer-row">
          <button class="tvwl-footer-btn tvwl-btn-sync" id="tvwl-sync-btn" style="flex: 1;">🔄 MongoDB Sync</button>
        </div>
      </div>
    `;

    // FAB row
    const fabRow = document.createElement("div");
    fabRow.id = "tvwl-fab-row";

    // Color bar
    const colorBar = document.createElement("div");
    colorBar.id = "tvwl-color-bar";
    colorBar.title = "Add current stock to colored list";
    COLORS.forEach((color) => {
      const dot = document.createElement("div");
      dot.className = "tvwl-color-dot";
      dot.style.background = COLOR_HEX[color];
      dot.title = `Add to ${color} list`;
      dot.addEventListener("click", () => onColorDotClick(color));
      colorBar.appendChild(dot);
    });

    // Add button
    const addBtn = document.createElement("button");
    addBtn.id = "tvwl-add-btn";
    addBtn.textContent = "+ Add";
    addBtn.title = "Add current stock to active list";
    addBtn.addEventListener("click", onAddBtnClick);

    // FAB toggle
    const fabBtn = document.createElement("button");
    fabBtn.className = "tvwl-fab";
    fabBtn.id = "tvwl-fab";
    fabBtn.title = "Toggle Watchlists";
    fabBtn.textContent = "☰";
    fabBtn.addEventListener("click", togglePanel);

    fabRow.appendChild(colorBar);
    fabRow.appendChild(addBtn);
    fabRow.appendChild(fabBtn);

    root.appendChild(panel);
    root.appendChild(fabRow);
    document.body.appendChild(root);

    document
      .getElementById("tvwl-panel-close")
      .addEventListener("click", togglePanel);
    document
      .getElementById("tvwl-add-list-btn")
      .addEventListener("click", showNewListModal);
    document
      .getElementById("tvwl-debug-btn")
      .addEventListener("click", debugLogData);
    document
      .getElementById("tvwl-export-btn")
      .addEventListener("click", exportJSON);
    document
      .getElementById("tvwl-import-btn")
      .addEventListener("click", importJSON);
    document
      .getElementById("tvwl-csv-btn")
      .addEventListener("click", importCSV);
    document
      .getElementById("tvwl-sync-btn")
      .addEventListener("click", showMongoDBModal);
    document
      .getElementById("tvwl-search-input")
      .addEventListener("input", (e) => {
        renderListPanel(e.target.value.trim().toLowerCase());
      });
  }

  async function renderListPanel(searchQuery = "") {
    const data = await refreshData();
    const container = document.getElementById("tvwl-list-container");
    if (!container) return;
    container.innerHTML = "";

    const q = searchQuery.toLowerCase();

    // Group: custom first, then colored
    const customs = data.watchlists.filter(
      (w) => w.type === "custom" && (!q || w.name.toLowerCase().includes(q)),
    );
    const colored = data.watchlists.filter(
      (w) => w.type === "colored" && (!q || w.name.toLowerCase().includes(q)),
    );

    if (customs.length > 0) {
      const header = document.createElement("div");
      header.style.cssText =
        "padding: 6px 16px 2px; font-size: 10px; color: #787b86; text-transform: uppercase; letter-spacing: 0.08em;";
      header.textContent = "Custom Lists";
      container.appendChild(header);
      customs.forEach((w) => container.appendChild(createListItem(w)));
    }

    if (colored.length > 0) {
      const header = document.createElement("div");
      header.style.cssText =
        "padding: 10px 16px 2px; font-size: 10px; color: #787b86; text-transform: uppercase; letter-spacing: 0.08em;";
      header.textContent = "Colored Lists";
      container.appendChild(header);
      colored.forEach((w) => container.appendChild(createListItem(w)));
    }
  }

  function createListItem(watchlist) {
    const item = document.createElement("div");
    item.className =
      "tvwl-list-item" + (currentListId === watchlist.id ? " active-list" : "");
    item.dataset.id = watchlist.id;

    const icon = document.createElement("div");
    icon.className = "tvwl-list-item-icon";
    icon.style.background =
      watchlist.type === "colored"
        ? COLOR_HEX[watchlist.color] || "#787b86"
        : "#2962ff";

    const name = document.createElement("div");
    name.className = "tvwl-list-item-name";
    name.textContent =
      watchlist.name ||
      (watchlist.type === "colored"
        ? `${watchlist.color?.charAt(0).toUpperCase()}${watchlist.color?.slice(1)} List`
        : "Unnamed");

    const count = document.createElement("div");
    count.className = "tvwl-list-item-count";
    count.textContent = `${watchlist.symbols?.length || 0}`;

    const actions = document.createElement("div");
    actions.className = "tvwl-list-actions";

    const viewBtn = document.createElement("button");
    viewBtn.className = "tvwl-icon-btn";
    viewBtn.textContent = "👁";
    viewBtn.title = "View symbols";
    viewBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showDetailModal(watchlist.id);
    });

    const editBtn = document.createElement("button");
    editBtn.className = "tvwl-icon-btn";
    editBtn.textContent = "✏️";
    editBtn.title = "Rename";
    editBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      showRenameModal(watchlist.id);
    });

    const delBtn = document.createElement("button");
    delBtn.className = "tvwl-icon-btn danger";
    delBtn.textContent = "🗑";
    delBtn.title = "Delete list";
    delBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteList(watchlist.id);
    });

    const clearBtn = document.createElement("button");
    clearBtn.className = "tvwl-icon-btn danger";
    clearBtn.textContent = "🧹";
    clearBtn.title = "Clear all symbols";
    clearBtn.addEventListener("click", (e) => {
      e.stopPropagation();
      clearListSymbols(watchlist.id);
    });

    actions.appendChild(viewBtn);
    actions.appendChild(editBtn);
    actions.appendChild(clearBtn);
    if (watchlist.type === "custom") actions.appendChild(delBtn);

    item.appendChild(icon);
    item.appendChild(name);
    item.appendChild(count);
    item.appendChild(actions);

    // Click to set as active list
    item.addEventListener("click", () => setActiveList(watchlist.id));

    return item;
  }

  function setActiveList(id) {
    currentListId = id;
    renderListPanel();
    // highlight
    document.querySelectorAll(".tvwl-list-item").forEach((el) => {
      el.classList.toggle("active-list", el.dataset.id == id);
    });
  }

  function togglePanel() {
    panelOpen = !panelOpen;
    const panel = document.getElementById("tvwl-panel");
    if (!panel) return;
    if (panelOpen) {
      panel.classList.add("open");
      const q =
        document
          .getElementById("tvwl-search-input")
          ?.value?.trim()
          .toLowerCase() || "";
      renderListPanel(q);
    } else {
      panel.classList.remove("open");
    }
  }

  async function onAddBtnClick() {
    if (!activeSymbol) {
      showToast(
        "No active stock selected. Open a stock on TradingView first.",
        "warn",
      );
      return;
    }
    if (!currentListId) {
      showToast("Select a watchlist first by clicking on it.", "warn");
      return;
    }
    const data = await refreshData();
    const list = data.watchlists.find((w) => w.id == currentListId);
    if (!list) {
      showToast("List not found", "error");
      return;
    }
    if (list.symbols.includes(activeSymbol)) {
      showToast(
        `${activeSymbol} already in "${list.name || list.color} list"`,
        "warn",
      );
      return;
    }
    list.symbols.push(activeSymbol);
    await saveData(data);
    appData = data;
    showToast(
      `Added ${activeSymbol} to "${list.name || list.color + " list"}"`,
      "success",
    );
    refreshPanel();
  }

  async function onColorDotClick(color) {
    if (!activeSymbol) {
      showToast("No active stock. Open a chart on TradingView first.", "warn");
      return;
    }
    const data = await refreshData();
    const list = data.watchlists.find(
      (w) => w.type === "colored" && w.color === color,
    );
    if (!list) {
      showToast("Color list not found", "error");
      return;
    }
    if (list.symbols.includes(activeSymbol)) {
      showToast(`${activeSymbol} already in ${color} list`, "warn");
      return;
    }
    list.symbols.push(activeSymbol);
    await saveData(data);
    appData = data;
    showToast(`Added ${activeSymbol} to ${color} list`, "success");
    refreshPanel();
  }

  // ─── Modals ───────────────────────────────────────────────────────────────────
  function showModal(html, onMount) {
    const overlay = document.createElement("div");
    overlay.className = "tvwl-modal-overlay";
    overlay.innerHTML = `<div class="tvwl-modal">${html}</div>`;
    overlay.addEventListener("click", (e) => {
      if (e.target === overlay) overlay.remove();
    });
    document.body.appendChild(overlay);
    if (onMount) onMount(overlay);
    return overlay;
  }

  function showNewListModal() {
    let selectedColor = null;
    let selectedType = "custom";

    const overlay = showModal(
      `
      <h3>New Watchlist</h3>
      <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;">Type</label>
      <select id="tvwl-new-type">
        <option value="custom">Custom</option>
        <option value="colored">Colored</option>
      </select>
      <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;">Name</label>
      <input id="tvwl-new-name" placeholder="Watchlist name" />
      <div id="tvwl-color-section" style="display:none;">
        <label style="font-size:12px;color:#787b86;display:block;margin-bottom:6px;">Color</label>
        <div class="tvwl-color-picker" id="tvwl-new-color-picker"></div>
      </div>
      <div class="tvwl-modal-btns">
        <button class="tvwl-btn-secondary" id="tvwl-modal-cancel">Cancel</button>
        <button class="tvwl-btn-primary" id="tvwl-modal-confirm">Create</button>
      </div>
    `,
      (overlay) => {
        const picker = overlay.querySelector("#tvwl-new-color-picker");
        COLORS.forEach((c) => {
          const dot = document.createElement("div");
          dot.className = "tvwl-color-opt";
          dot.style.background = COLOR_HEX[c];
          dot.dataset.color = c;
          dot.addEventListener("click", () => {
            selectedColor = c;
            picker
              .querySelectorAll(".tvwl-color-opt")
              .forEach((d) => d.classList.remove("selected"));
            dot.classList.add("selected");
          });
          picker.appendChild(dot);
        });

        overlay
          .querySelector("#tvwl-new-type")
          .addEventListener("change", (e) => {
            selectedType = e.target.value;
            overlay.querySelector("#tvwl-color-section").style.display =
              selectedType === "colored" ? "block" : "none";
          });

        overlay
          .querySelector("#tvwl-modal-cancel")
          .addEventListener("click", () => overlay.remove());
        overlay
          .querySelector("#tvwl-modal-confirm")
          .addEventListener("click", async () => {
            const name = overlay.querySelector("#tvwl-new-name").value.trim();
            if (!name && selectedType === "custom") {
              showToast("Enter a name", "warn");
              return;
            }
            if (selectedType === "colored" && !selectedColor) {
              showToast("Pick a color", "warn");
              return;
            }
            const data = await refreshData();
            const newList = {
              id: Date.now(),
              type: selectedType,
              name: name || "",
              symbols: [],
              active: false,
              shared: false,
              color: selectedType === "colored" ? selectedColor : null,
              description: null,
              created: new Date().toISOString(),
              modified: new Date().toISOString(),
            };
            data.watchlists.push(newList);
            await saveData(data);
            overlay.remove();
            showToast(
              `Created "${name || selectedColor + " list"}"`,
              "success",
            );
            refreshPanel();
          });
      },
    );
  }

  function showRenameModal(id) {
    const list = appData?.watchlists?.find((w) => w.id == id);
    if (!list) return;

    showModal(
      `
      <h3>Rename Watchlist</h3>
      <input id="tvwl-rename-input" value="${list.name || ""}" placeholder="New name" />
      <div class="tvwl-modal-btns">
        <button class="tvwl-btn-secondary" id="tvwl-modal-cancel">Cancel</button>
        <button class="tvwl-btn-primary" id="tvwl-modal-confirm">Save</button>
      </div>
    `,
      async (overlay) => {
        const inp = overlay.querySelector("#tvwl-rename-input");
        inp.focus();
        inp.select();
        overlay
          .querySelector("#tvwl-modal-cancel")
          .addEventListener("click", () => overlay.remove());
        overlay
          .querySelector("#tvwl-modal-confirm")
          .addEventListener("click", async () => {
            const newName = inp.value.trim();
            const data = await refreshData();
            const l = data.watchlists.find((w) => w.id == id);
            if (l) l.name = newName;
            await saveData(data);
            overlay.remove();
            showToast("Renamed!", "success");
            refreshPanel();
          });
      },
    );
  }

  function showDetailModal(id) {
    refreshData().then((data) => {
      const list = data.watchlists.find((w) => w.id == id);
      if (!list) return;

      const displayName =
        list.name ||
        (list.color
          ? `${list.color.charAt(0).toUpperCase()}${list.color.slice(1)} List`
          : "Unnamed");
      const colorDot = list.color
        ? `<span style="display:inline-block;width:10px;height:10px;border-radius:50%;background:${COLOR_HEX[list.color]};margin-right:6px;"></span>`
        : "";

      showModal(
        `
        <h3>${colorDot}${displayName} <span style="font-size:11px;color:#787b86;">(${list.symbols?.length || 0} symbols)</span></h3>
        <div style="margin-bottom:12px;display:flex;gap:8px;">
          <input id="tvwl-add-sym-input" placeholder="Add symbol (e.g. NSE:RELIANCE)" style="flex:1;margin-bottom:0;" />
          <button class="tvwl-btn-primary" id="tvwl-add-sym-btn" style="padding:8px 12px;border-radius:6px;border:none;cursor:pointer;font-weight:600;white-space:nowrap;">Add</button>
        </div>
        <div style="max-height:300px;overflow-y:auto;">
          <ul class="tvwl-sym-list" id="tvwl-sym-list">
            ${(list.symbols || [])
              .map(
                (s) => `
              <li class="tvwl-sym-item">
                <span>${s}</span>
                <button class="tvwl-icon-btn danger tvwl-remove-sym" data-sym="${s}" title="Remove" style="font-size:12px;">✕</button>
              </li>`,
              )
              .join("")}
          </ul>
          ${!list.symbols?.length ? '<p style="color:#787b86;text-align:center;font-size:12px;padding:16px 0;">No symbols yet</p>' : ""}
        </div>
        <div class="tvwl-modal-btns" style="margin-top:12px;">
          <button class="tvwl-btn-secondary" id="tvwl-modal-close">Close</button>
        </div>
      `,
        async (overlay) => {
          overlay
            .querySelector("#tvwl-modal-close")
            .addEventListener("click", () => overlay.remove());

          overlay
            .querySelector("#tvwl-add-sym-btn")
            .addEventListener("click", async () => {
              const val = overlay
                .querySelector("#tvwl-add-sym-input")
                .value.trim()
                .toUpperCase();
              if (!val) return;
              const d = await refreshData();
              const l = d.watchlists.find((w) => w.id == id);
              if (l && !l.symbols.includes(val)) {
                l.symbols.push(val);
                await saveData(d);
                overlay.remove();
                showDetailModal(id);
                refreshPanel();
              } else {
                showToast("Symbol already exists or list not found", "warn");
              }
            });

          overlay.querySelectorAll(".tvwl-remove-sym").forEach((btn) => {
            btn.addEventListener("click", async () => {
              const sym = btn.dataset.sym;
              const d = await refreshData();
              const l = d.watchlists.find((w) => w.id == id);
              if (l) l.symbols = l.symbols.filter((s) => s !== sym);
              await saveData(d);
              overlay.remove();
              showDetailModal(id);
              refreshPanel();
              showToast(`Removed ${sym}`, "success");
            });
          });
        },
      );
    });
  }

  function refreshPanel() {
    if (!panelOpen) return;
    const q =
      document
        .getElementById("tvwl-search-input")
        ?.value?.trim()
        .toLowerCase() || "";
    renderListPanel(q);
  }

  async function clearListSymbols(id) {
    const data = await refreshData();
    const list = data.watchlists.find((w) => w.id == id);
    if (!list) return;
    if (
      !confirm(
        `Clear all ${list.symbols.length} symbols from "${list.name || list.color + " list"}"?`,
      )
    )
      return;
    list.symbols = [];
    await saveData(data);
    showToast(`Cleared "${list.name || list.color + " list"}"`, "success");
    refreshPanel();
  }

  // ─── Export / Import JSON ─────────────────────────────────────────────────────
  async function exportJSON() {
    const data = await refreshData();
    const json = JSON.stringify(data, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `watchlists-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast("Exported watchlists as JSON", "success");
  }

  function importJSON() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        if (!parsed.watchlists || !Array.isArray(parsed.watchlists)) {
          showToast("Invalid JSON: missing watchlists array", "error");
          return;
        }
        const data = await refreshData();
        // Merge: add imported lists that don't already exist by name+type
        let added = 0;
        parsed.watchlists.forEach((w) => {
          const exists = data.watchlists.find(
            (x) => x.name === w.name && x.type === w.type,
          );
          if (!exists) {
            data.watchlists.push({ ...w, id: Date.now() + Math.random() });
            added++;
          }
        });
        await saveData(data);
        showToast(`Imported ${added} new watchlist(s)`, "success");
        refreshPanel();
      } catch (e) {
        showToast("Failed to parse JSON file", "error");
      }
    });
    input.click();
  }

  // ─── CSV Import ───────────────────────────────────────────────────────────────
  function parseCSVSymbols(csvText) {
    const lines = csvText.split(/\r?\n/).filter((l) => l.trim());
    if (lines.length === 0) return [];

    // Find "Symbol" column index in header
    const header = lines[0].split(",").map((h) => h.trim().replace(/"/g, ""));
    const symIdx = header.findIndex((h) => h.toLowerCase() === "symbol");
    if (symIdx === -1) {
      showToast('CSV must have a "Symbol" column header', "error");
      return [];
    }

    const symbols = [];
    for (let i = 1; i < lines.length; i++) {
      const cols = lines[i].split(",").map((c) => c.trim().replace(/"/g, ""));
      const raw = cols[symIdx];
      if (!raw) continue;
      // Replace hyphens with underscores and prefix NSE:
      const formatted = "NSE:" + raw.replace(/-/g, "_");
      symbols.push(formatted);
    }
    return symbols;
  }

  function importCSV() {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".csv,text/csv";
    input.addEventListener("change", async () => {
      const file = input.files[0];
      if (!file) return;
      const text = await file.text();
      const symbols = parseCSVSymbols(text);
      if (symbols.length === 0) {
        showToast("No symbols found in CSV", "warn");
        return;
      }
      // Show a modal to let user pick which watchlist to append to
      showCSVTargetModal(symbols);
    });
    input.click();
  }

  function showCSVTargetModal(symbols) {
    const data = appData;
    if (!data) return;
    const options = data.watchlists
      .map(
        (w) =>
          `<option value="${w.id}">${w.name || w.color + " list"} (${w.symbols.length})</option>`,
      )
      .join("");

    showModal(
      `
      <h3>📄 Import ${symbols.length} Symbols from CSV</h3>
      <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;">Append to watchlist</label>
      <select id="tvwl-csv-target">${options}</select>
      <div style="font-size:11px;color:#787b86;margin-bottom:12px;">
        Preview: ${symbols.slice(0, 5).join(", ")}${symbols.length > 5 ? ` … +${symbols.length - 5} more` : ""}
      </div>
      <div class="tvwl-modal-btns">
        <button class="tvwl-btn-secondary" id="tvwl-modal-cancel">Cancel</button>
        <button class="tvwl-btn-primary" id="tvwl-modal-confirm">Append</button>
      </div>
    `,
      async (overlay) => {
        overlay
          .querySelector("#tvwl-modal-cancel")
          .addEventListener("click", () => overlay.remove());
        overlay
          .querySelector("#tvwl-modal-confirm")
          .addEventListener("click", async () => {
            const targetId = overlay.querySelector("#tvwl-csv-target").value;
            const d = await refreshData();
            const list = d.watchlists.find((w) => String(w.id) === targetId);
            if (!list) {
              showToast("Target list not found", "error");
              return;
            }
            let added = 0;
            symbols.forEach((s) => {
              if (!list.symbols.includes(s)) {
                list.symbols.push(s);
                added++;
              }
            });
            await saveData(d);
            overlay.remove();
            showToast(
              `Added ${added} symbol(s) to "${list.name || list.color + " list"}"`,
              "success",
            );
            refreshPanel();
          });
      },
    );
  }

  // ─── Backend Configuration ────────────────────────────────────────────────────
  // Update this with your deployed backend URL
  const BACKEND_BASE_URL = "https://watchlist-backend-w7ac.onrender.com";
  // const BACKEND_BASE_URL = "http://localhost:3000";

  // ─── MongoDB Sync with Custom Backend API ────────────────────────────────────
  function showMongoDBModal() {
    const overlay = showModal(
      `
      <h3>🔄 MongoDB Cloud Sync</h3>
      <div id="tvwl-mongo-setup" style="display:block;">
        <p style="font-size:12px;color:#787b86;margin-bottom:12px;">
          Backup your watchlists to MongoDB via Cloud Functions.
          <a href="https://mongodb.com/cloud/atlas" target="_blank" style="color:#2196f3;text-decoration:none;">Create MongoDB Atlas</a>
        </p>

        <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;">MongoDB Connection String</label>
        <input id="tvwl-mongo-conn-str" type="password" placeholder="mongodb+srv://user:pass@cluster.mongodb.net/..." />

        <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;margin-top:8px;">Database Name</label>
        <input id="tvwl-mongo-database" type="text" placeholder="e.g., tradingview" />

        <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;margin-top:8px;">Collection Name</label>
        <input id="tvwl-mongo-collection" type="text" placeholder="e.g., watchlists" />

        <label style="font-size:12px;color:#787b86;display:block;margin-bottom:4px;margin-top:8px;">User ID</label>
        <input id="tvwl-mongo-user-id" type="text" placeholder="e.g., user@email.com" />

        <div class="tvwl-modal-btns" style="margin-top:16px;">
          <button class="tvwl-btn-secondary" id="tvwl-mongo-test-btn">Test Connection</button>
          <button class="tvwl-btn-primary" id="tvwl-mongo-save-creds">Save & Continue</button>
        </div>

        <div id="tvwl-mongo-status" style="font-size:11px;color:#787b86;margin-top:12px;display:none;"></div>
      </div>

      <!-- Backup/Restore Section -->
      <div id="tvwl-mongo-actions" style="display:none;">
        <div style="font-size:12px;color:#787b86;margin-bottom:12px;">
          <strong>Database:</strong> <span id="tvwl-mongo-database-display"></span><br/>
          <strong>Collection:</strong> <span id="tvwl-mongo-collection-display"></span><br/>
          <strong>User ID:</strong> <span id="tvwl-mongo-user-id-display"></span>
          <a href="#" id="tvwl-mongo-change-creds" style="color:#787b86;text-decoration:none;margin-left:8px;font-size:10px;display:block;margin-top:8px;">(change configuration)</a>
        </div>
        <div class="tvwl-modal-btns">
          <button class="tvwl-btn-secondary" id="tvwl-mongo-restore">⬇ Restore</button>
          <button class="tvwl-btn-primary" id="tvwl-mongo-backup">⬆ Backup Now</button>
        </div>
      </div>
    `,
      (overlay) => {
        // Load saved configuration
        const savedConnStr = localStorage.getItem("tvwl-mongo-conn-str");
        const savedDatabase = localStorage.getItem("tvwl-mongo-database");
        const savedCollection = localStorage.getItem("tvwl-mongo-collection");
        const savedUserId = localStorage.getItem("tvwl-mongo-user-id");

        // If all configured, show actions section
        if (savedConnStr && savedDatabase && savedCollection && savedUserId) {
          overlay.querySelector("#tvwl-mongo-setup").style.display = "none";
          overlay.querySelector("#tvwl-mongo-actions").style.display = "block";
          overlay.querySelector("#tvwl-mongo-database-display").textContent =
            savedDatabase;
          overlay.querySelector("#tvwl-mongo-collection-display").textContent =
            savedCollection;
          overlay.querySelector("#tvwl-mongo-user-id-display").textContent =
            savedUserId;
        } else {
          // Pre-fill if available
          if (savedConnStr)
            overlay.querySelector("#tvwl-mongo-conn-str").value = savedConnStr;
          if (savedDatabase)
            overlay.querySelector("#tvwl-mongo-database").value = savedDatabase;
          if (savedCollection)
            overlay.querySelector("#tvwl-mongo-collection").value =
              savedCollection;
          if (savedUserId)
            overlay.querySelector("#tvwl-mongo-user-id").value = savedUserId;
        }

        // Test connection button
        overlay
          .querySelector("#tvwl-mongo-test-btn")
          .addEventListener("click", async () => {
            const connStr = overlay
              .querySelector("#tvwl-mongo-conn-str")
              .value.trim();
            if (!connStr) {
              showToast("Enter connection string first", "warn");
              return;
            }

            const statusEl = overlay.querySelector("#tvwl-mongo-status");
            statusEl.style.display = "block";
            statusEl.textContent = "Testing...";

            try {
              const response = await StorageBridge.fetch(
                `${BACKEND_BASE_URL}/healthCheck`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ connectionString: connStr }),
                },
              );
              const result = await response.json();
              if (result.success) {
                statusEl.textContent = "✅ Connection successful!";
                statusEl.style.color = "#26a69a";
              } else {
                statusEl.textContent = `❌ ${result.error}`;
                statusEl.style.color = "#ef5350";
              }
            } catch (error) {
              statusEl.textContent = `❌ ${error.message}`;
              statusEl.style.color = "#ef5350";
            }
          });

        // Save configuration
        overlay
          .querySelector("#tvwl-mongo-save-creds")
          .addEventListener("click", () => {
            const connStr = overlay
              .querySelector("#tvwl-mongo-conn-str")
              .value.trim();
            const database = overlay
              .querySelector("#tvwl-mongo-database")
              .value.trim();
            const collection = overlay
              .querySelector("#tvwl-mongo-collection")
              .value.trim();
            const userId = overlay
              .querySelector("#tvwl-mongo-user-id")
              .value.trim();

            if (!connStr || !database || !collection || !userId) {
              showToast("All fields are required", "warn");
              return;
            }

            localStorage.setItem("tvwl-mongo-conn-str", connStr);
            localStorage.setItem("tvwl-mongo-database", database);
            localStorage.setItem("tvwl-mongo-collection", collection);
            localStorage.setItem("tvwl-mongo-user-id", userId);

            showToast("Configuration saved", "success");

            overlay.querySelector("#tvwl-mongo-setup").style.display = "none";
            overlay.querySelector("#tvwl-mongo-actions").style.display =
              "block";
            overlay.querySelector("#tvwl-mongo-database-display").textContent =
              database;
            overlay.querySelector(
              "#tvwl-mongo-collection-display",
            ).textContent = collection;
            overlay.querySelector("#tvwl-mongo-user-id-display").textContent =
              userId;
          });

        // Change configuration
        overlay
          .querySelector("#tvwl-mongo-change-creds")
          .addEventListener("click", (e) => {
            e.preventDefault();
            overlay.querySelector("#tvwl-mongo-setup").style.display = "block";
            overlay.querySelector("#tvwl-mongo-actions").style.display = "none";
          });

        // Backup
        overlay
          .querySelector("#tvwl-mongo-backup")
          .addEventListener("click", async () => {
            const statusEl =
              overlay
                .querySelector("#tvwl-mongo-actions")
                .parentElement.querySelector("#tvwl-mongo-status") ||
              document.createElement("div");
            statusEl.style.cssText =
              "font-size:11px;color:#787b86;margin-top:12px;";
            statusEl.textContent = "Uploading...";
            if (!statusEl.parentElement) overlay.appendChild(statusEl);

            try {
              const data = await refreshData();
              const connStr = localStorage.getItem("tvwl-mongo-conn-str");
              const database = localStorage.getItem("tvwl-mongo-database");
              const collection = localStorage.getItem("tvwl-mongo-collection");
              const userId = localStorage.getItem("tvwl-mongo-user-id");

              const response = await StorageBridge.fetch(
                `${BACKEND_BASE_URL}/saveWatchlists`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    connectionString: connStr,
                    database: database,
                    collection: collection,
                    watchlists: data.watchlists,
                    userId: userId,
                  }),
                },
              );

              const result = await response.json();
              if (result.success) {
                statusEl.textContent = "✅ Backup complete!";
                statusEl.style.color = "#26a69a";
                setTimeout(() => statusEl.remove(), 3000);
                showToast("Watchlists backed up successfully", "success");
              } else {
                throw new Error(result.error);
              }
            } catch (error) {
              statusEl.textContent = `❌ ${error.message}`;
              statusEl.style.color = "#ef5350";
              console.error("[Backup Error]", error);
            }
          });

        // Restore
        overlay
          .querySelector("#tvwl-mongo-restore")
          .addEventListener("click", async () => {
            const statusEl =
              overlay
                .querySelector("#tvwl-mongo-actions")
                .parentElement.querySelector("#tvwl-mongo-status") ||
              document.createElement("div");
            statusEl.style.cssText =
              "font-size:11px;color:#787b86;margin-top:12px;";
            statusEl.textContent = "Downloading...";
            if (!statusEl.parentElement) overlay.appendChild(statusEl);

            try {
              const connStr = localStorage.getItem("tvwl-mongo-conn-str");
              const database = localStorage.getItem("tvwl-mongo-database");
              const collection = localStorage.getItem("tvwl-mongo-collection");
              const userId = localStorage.getItem("tvwl-mongo-user-id");

              const response = await StorageBridge.fetch(
                `${BACKEND_BASE_URL}/fetchWatchlists`,
                {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    connectionString: connStr,
                    database: database,
                    collection: collection,
                    userId: userId,
                  }),
                },
              );

              const result = await response.json();
              if (result.success && result.data && result.data.watchlists) {
                await saveData({ watchlists: result.data.watchlists });
                statusEl.textContent = "✅ Restore complete!";
                statusEl.style.color = "#26a69a";
                setTimeout(() => {
                  overlay.remove();
                  refreshPanel();
                }, 1500);
                showToast("Watchlists restored successfully", "success");
              } else {
                throw new Error(result.error || "No backup found");
              }
            } catch (error) {
              statusEl.textContent = `❌ ${error.message}`;
              statusEl.style.color = "#ef5350";
              console.error("[Restore Error]", error);
            }
          });
      },
    );
  }

  async function deleteList(id) {
    if (!confirm("Delete this watchlist?")) return;
    const data = await refreshData();
    data.watchlists = data.watchlists.filter((w) => w.id != id);
    await saveData(data);
    if (currentListId == id) currentListId = null;
    showToast("Deleted", "success");
    refreshPanel();
  }

  // ─── Toast ────────────────────────────────────────────────────────────────────
  function showToast(message, type = "success") {
    const colors = { success: "#26a69a", warn: "#ff9800", error: "#ef5350" };
    const toast = document.createElement("div");
    toast.style.cssText = `
      position: fixed; bottom: 80px; right: 24px;
      background: ${colors[type] || colors.success};
      color: #fff; padding: 10px 16px; border-radius: 8px;
      font-size: 13px; font-family: -apple-system, sans-serif;
      box-shadow: 0 4px 16px rgba(0,0,0,0.5);
      z-index: 9999999; max-width: 280px;
      animation: tvwlFadeIn 0.2s ease;
    `;
    toast.textContent = message;
    if (!document.getElementById("tvwl-toast-style")) {
      const s = document.createElement("style");
      s.id = "tvwl-toast-style";
      s.textContent = `@keyframes tvwlFadeIn { from { opacity:0; transform: translateY(8px); } to { opacity:1; transform: none; } }`;
      document.head.appendChild(s);
    }
    document.body.appendChild(toast);
    setTimeout(() => toast.remove(), 3000);
  }

  // ─── Init ─────────────────────────────────────────────────────────────────────
  async function init() {
    console.log("[TV-WL] === EXTENSION INIT START ===");
    // Initialize cache BEFORE creating UI or allowing interceptions
    await initializeCache();
    console.log("[TV-WL] Cache ready, now creating UI");

    if (document.readyState === "loading") {
      document.addEventListener("DOMContentLoaded", () => {
        createUI();
      });
    } else {
      createUI();
    }
    console.log("[TV-WL] === EXTENSION INIT COMPLETE ===");
  }

  init();

  // Re-check for active symbol from current URL
  window.addEventListener("load", () => {
    // Try to extract from current page URL if it's a scanner URL
    const currentUrl = location.href;
    if (currentUrl.includes("symbol=")) {
      const sym = extractSymbolFromUrl(currentUrl);
      if (sym) {
        activeSymbol = sym;
        updatePanelSymbol(sym);
      }
    }
  });
})();
