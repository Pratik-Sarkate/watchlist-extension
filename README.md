# TradingView Unlimited Watchlist — Chrome Extension

A Chrome extension that gives you **unlimited watchlists** on TradingView, stored in your browser's local storage (via `chrome.storage.local`) with optional **cloud backup via MongoDB**.

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
  - **Clear all symbols** from a list (🧹 button)
- ✅ **Search/Filter** — search watchlists by name in real-time
- ✅ **Export/Import JSON** — backup and restore all watchlists as JSON files
- ✅ **CSV Import** — upload a CSV file with a "Symbol" column; auto-formats to NSE:SYMBOL (replaces `-` with `_`)
- ✅ **Cloud Sync** — backup/restore watchlists to MongoDB via custom backend:
  - One-click backup and restore
  - Cloud persistence across devices
  - Flexible backend configuration
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
- Click a list name to set it as the "active" list for the **+ Add** button
- Hover over a list to see action buttons:
  - **👁** — View symbols in this list
  - **✏️** — Rename the list
  - **🧹** — Clear all symbols from the list
  - **🗑** — Delete the list (custom lists only)
- Click **+ New Watchlist** to create a custom or colored list

### Search/Filter Watchlists

- Use the **🔍 Search** box at the top of the panel to filter watchlists by name in real-time

### Export & Import Watchlists

**Export to JSON:**

- Click **⬇ Export JSON** at the bottom of the panel
- Your browser will download a `.json` file with all watchlists
- Use this to backup or share with others

**Import from JSON:**

- Click **⬆ Import JSON** and select a previously exported JSON file
- New watchlists will be merged (duplicates by name+type are skipped)

### CSV Import

- Click **📄 CSV** and select a CSV file with a **"Symbol"** column header
- Extension auto-formats symbols as `NSE:SYMBOL_NAME` (replaces `-` with `_`)
- Select which watchlist to append the symbols to
- Duplicates are automatically skipped

### MongoDB Cloud Sync

**Setup (One-time):**

1. Deploy your backend API with these endpoints:
   - `POST /saveWatchlists` — Save watchlists to MongoDB
   - `POST /fetchWatchlists` — Fetch watchlists from MongoDB
   - `POST /healthCheck` — Test connection
   - `GET /status` — Health check

2. Update the backend URL in `injected.js` (line ~1733):

   ```javascript
   const BACKEND_BASE_URL = "https://your-backend-domain.com";
   ```

3. In the extension, click **🔄 MongoDB Sync** and configure:
   - **MongoDB Connection String** — `mongodb+srv://user:pass@cluster.mongodb.net/...`
   - **Database Name** — e.g., `tradingview`
   - **Collection Name** — e.g., `watchlists`
   - **User ID** — unique identifier (e.g., email)

4. Click **Test Connection** to verify, then **Save & Continue**

**Backup Watchlists:**

1. Click **🔄 MongoDB Sync**
2. Click **⬆ Backup Now**
3. Your watchlists are now stored in MongoDB

**Restore Watchlists:**

1. Click **🔄 MongoDB Sync**
2. Click **⬇ Restore**
3. All backed-up watchlists will be restored to your browser

**Benefits:**

- ✅ Access watchlists across different devices
- ✅ Cloud backup (never lose your lists)
- ✅ Use any MongoDB instance (Atlas, self-hosted, etc.)

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

- ~~Sync watchlists to a remote MongoDB instance (free tier)~~ ✅ **DONE**
- ~~Import/Export watchlists as JSON~~ ✅ **DONE**
- ~~Search/filter within watchlists~~ ✅ **DONE**
- ~~Clear button to clear all stocks of that particular list~~ ✅ **DONE**
- ~~Upload CSV to any watchlist~~ ✅ **DONE**
- ~~Drag-and-drop to reorder symbols~~ (planned)
- ~~Sync across devices with cloud authentication~~ (planned)
