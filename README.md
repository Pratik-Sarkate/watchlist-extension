# TradingView Unlimited Watchlist — Chrome Extension

A Chrome extension that gives you **unlimited watchlists** on TradingView, stored in your browser's local storage (via `chrome.storage.local`).

---

## Features

- ✅ **Intercepts** `/api/v1/symbols_list/all|custom|active|colored` and injects your local watchlist data
- ✅ **+ Add Button** — shows the currently active stock name; click to add it to the selected list
- ✅ **Color Bar** — 7 colored dots (red, orange, green, purple, blue, cyan, pink); click to add the active stock to that color's list
- ✅ **Toggle Panel** — lists all your watchlists (custom + colored), with:
  - Set active list (click on any list)
  - View & manage symbols in a list
  - Rename any list
  - Add / remove individual symbols
  - Create new custom or colored lists
  - Delete custom lists
- ✅ **Toast notifications** for all actions
- ✅ All data persists in `chrome.storage.local`

---

## Installation

1. Open Chrome and navigate to `chrome://extensions/`
2. Enable **Developer Mode** (top-right toggle)
3. Click **Load unpacked**
4. Select the `trading-view` folder
5. Navigate to [TradingView](https://www.tradingview.com) — the UI will appear in the bottom-right corner

---

## Usage

### Active Stock Detection

The extension auto-detects the active stock by monitoring `scanner.tradingview.com/symbol?symbol=...` requests made by TradingView when you open a chart or search for a symbol.

### Adding a Stock

1. Open any chart/symbol on TradingView
2. The **`+ SYMBOL`** button (bottom-right) will show the current stock
3. Click a list in the panel to make it "active", then click **`+ SYMBOL`** to add it
4. OR click any **color dot** to directly add to that color list

### Managing Watchlists

- Click **☰** to open the watchlists panel
- Click a list name to set it as the active list
- Hover over a list to see action buttons (👁 view, ✏️ rename, 🗑 delete)
- Click **+ New Watchlist** to create a custom or colored list

---

## File Structure

```
trading-view/
├── manifest.json      # Extension manifest (MV3)
├── content.js         # Runs in page context, bridges chrome.storage ↔ injected.js
├── injected.js        # Main logic: fetch interception + UI
└── README.md
```

---

## Future Improvements

- Sync watchlists to a remote MongoDB instance (free tier)
- Import/Export watchlists as JSON
- Drag-and-drop to reorder symbols
- Search/filter within watchlists
