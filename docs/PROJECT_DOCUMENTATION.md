# ARMS — Auditing & Ration Management System
## Comprehensive Technical & Architecture Documentation

**Author / Lead Developer:** Andualem Koriya  
**Organization:** Ethiopian Air Force  
**System Designation:** ARMS (Auditing & Ration Management System)  
**Document Version:** 2.0.0  
**Target Environment:** Web / Offline-First SPA / Vercel Serverless / Mobile Termux  

---

## 1. System Overview & Purpose

### 1.1 Purpose
The **Auditing and Ration Management System (ARMS)** is a mission-critical, military-grade logistics and financial management platform purpose-built for the **Ethiopian Air Force**. The application streamlines and automates the tracking of personnel manpower, daily food rations, store inventory and procurement, income, multi-category expenditures, and complex financial and ration audits.

### 1.2 Core Capabilities
* **Manpower Management:** Tracks active personnel across service branches (Air Force, Ground Force, Navy, Special Force, Commando, Civil), ranks, and contribution types (Payroll, Full Cash, Half Cash, Transient, Pension).
* **Store & Inventory Operations:** Tracks stock levels with automatic **Weighted Average Cost (WAC)** price recalculation upon receiving orders, stock issuance, and transfer between accounting months.
* **Daily Ration Deduction & Food Scheduling:** Calculates daily consumption based on active manpower and custom recipe scaling, automatically deducting ingredients from inventory and recording historical ration logs.
* **Income & Expenditure Accounting:** Comprehensive ledger for food sales, subsidies (financial and goods), transfers, market purchases, wage payments, and member refunds.
* **Automated & Manual Military Auditing:** Real-time multi-ledger balancing, automated debit/credit balancing, automated client-side PDF audit report generation via `html2pdf.js`, and side-by-side reconciliation calculations.
* **Military Intelligence Notebook:** Categorized mission notes, operational incidents, and logistics planning logs with export capabilities.
* **AI-Powered Logistics & Chat Assistant:** Integrated with Google Gemini via a serverless proxy for predictive logistics consumption analysis, inventory replenishment alerts, recipe optimization, and natural language database auditing in English and Amharic.
* **Ethiopian Calendar Engine:** Native Julian Day Number (JDN) conversion engine supporting 13 Ethiopian months (including Pagume leap cycles) with full Amharic date picker integration.
* **Decentralized Data Persistence:** Cloudless, database-free architecture where each user's complete data state is synced directly to their own GitHub or Gitea repository as JSON files using Personal Access Tokens (PAT).

### 1.3 Architectural Model
ARMS uses a **hybrid client-first architecture**:
1. **Client Layer:** Full React SPA with offline-first `localStorage` caching and direct browser-to-GitHub synchronization.
2. **Serverless AI Proxy Layer:** A secure Node/Express backend (`/api/*` and `server.ts`) hosting the Gemini AI interface to prevent client-side leakage of secret API keys.

```
+-----------------------------------------------------------------------+
|                             Client Browser                            |
|  +-----------------------------------------------------------------+  |
|  |                 React 19 SPA (Vite + HashRouter)                |  |
|  |  [Pages: Home, Income, Expenditure, Store, Audit, Notebook, ...] |  |
|  +--------------------------------+--------------------------------+  |
|                                   |                                   |
|            +----------------------+----------------------+            |
|            |                                             |            |
|            v                                             v            |
|   +-------------------+                         +-----------------+   |
|   |   localStorage    |                         |  GitHub / Gitea |   |
|   |  (Offline Cache)  |                         |    REST API     |   |
|   +-------------------+                         +--------+--------+   |
|                                                          |            |
+----------------------------------------------------------|------------+
                                                           | JSON Sync
+----------------------------------------------------------|------------+
|                Backend / Vercel Serverless               |            |
|  +----------------------------------------------------+  |            |
|  | Express API Proxy (/api/gemini/*)                  |  |            |
|  | - analyzeDataServer                                |  |            |
|  | - chatWithAIServer                                 |  |            |
|  | - performLogisticsAnalysisServer                   |  |            |
|  | - Fallback: gemini-3.5-flash -> flash-lite -> etc. |  |            |
|  +------------------------+---------------------------+  |            |
|                           |                                           |
|                           v                                           |
|               +-----------------------+                               |
|               | Google Gemini API     |                               |
|               +-----------------------+                               |
+-----------------------------------------------------------------------+
```

---

## 2. Technology Stack

| Layer | Technologies | Notes |
| :--- | :--- | :--- |
| **Frontend Framework** | React 19.x, TypeScript 5.x, Vite | High-performance client SPA using `@vitejs/plugin-react` |
| **Routing** | React Router DOM (`HashRouter`) | Hash-based routing ensures compatibility with static hosts and offline environments |
| **Styling & UI** | Tailwind CSS v4, Lucide React | Custom dark military aesthetic (`gold-500`, `military-900`, `slate-950`) |
| **Data Visualization** | Recharts, D3 utilities | Dynamic analytics charts for budget consumption and store metrics |
| **Document Generation** | `html2pdf.js`, Custom HTML/Doc Generators | Generates formal military PDF/DOC audit reports directly on client |
| **Backend & AI Proxy** | Node.js, Express 4.x, `@google/genai` SDK | Serverless Express endpoints bundled with `esbuild` for Vercel/Node |
| **Date & Calendar** | Custom Julian Day Number (JDN) Algorithm | Exact Ethiopian calendar conversion with 13-month support |
| **Data Synchronization** | GitHub REST API v3 (Octokit/Fetch) | Dynamic sequence allocation and base64 UTF-8 JSON syncing |

---

## 3. Project & File Structure

```
├── .env.example                # Blueprint for required environment variables
├── App.tsx                     # Main React application shell, routing, auth guards
├── api/
│   └── index.ts                # Vercel serverless Express entry point (/api/*)
├── components/
│   ├── ConfirmDialog.tsx       # Reusable styled modal confirmation dialog
│   ├── CustomSelect.tsx        # Searchable custom dropdown component
│   ├── DataTools.tsx           # Export (JSON/CSV/DOC) and Import toolbar with validation
│   ├── DuplicateResolutionModal.tsx # Side-by-side conflict resolver for imports/merges
│   ├── EthiopianDatePicker.tsx # 3-dropdown selector (Day/Month/Year) with leap calculation
│   ├── GroupedRankSelect.tsx   # Hierarchical military rank selector by branch
│   ├── Layout.tsx              # Application layout: header, collapsible sidebar, date filter
│   └── SmartInput.tsx          # Autocomplete text input with recent entry suggestions
├── contexts/
│   ├── DateContext.tsx         # Active Ethiopian month & year state provider
│   ├── LanguageContext.tsx     # Bilingual (English/Amharic) translation dictionary and hook
│   └── SidebarContext.tsx      # Global sidebar open/collapsed state
├── docs/
│   └── PROJECT_DOCUMENTATION.md # Complete technical and architectural documentation
├── index.html                  # HTML5 entry point with viewport and typography settings
├── main.tsx                    # React DOM root bootstrapping
├── metadata.json               # Platform capabilities and application metadata
├── package.json                # Dependencies, scripts, and build configuration
├── pages/
│   ├── About.tsx               # System credits, developer information, and military specs
│   ├── AdminDashboard.tsx      # System administration, credential manager, database metrics
│   ├── Audit.tsx               # Automated Audit, Manual Audit, and Reconciliation calculation tabs
│   ├── DataEditor.tsx          # Direct multi-table database records editor and data cleaner
│   ├── DbAdministration.tsx    # GitHub synchronization settings, manual backup, and API keys
│   ├── EthiopianDatePicker.tsx # (Legacy/Unused) Early prototype picker
│   ├── Expenditure.tsx         # Market purchases, wage payments, and other expenses
│   ├── Home.tsx                # Central dashboard overview, KPI metric cards, and charts
│   ├── Income.tsx              # Manpower roster, items sold, subsidies, and refunds
│   ├── Login.tsx               # Two-tier login terminal, recovery challenge, secret key access
│   ├── Notebook.tsx            # Operational logbook, incident logging, and strategy notes
│   ├── Search.tsx              # Global multi-collection search and Gemini AI interactive chat
│   └── Store.tsx               # Inventory, store orders (receive & stock in), food program
├── server/
│   └── gemini.ts               # Server-side Gemini AI integration with model fallback chain
├── server.ts                   # Full-stack local development & standalone production server
├── services/
│   ├── csvExport.ts            # CSV formatted exporter utility
│   ├── dataTransfer.ts         # Data import parsing, schema validation, merge algorithms
│   ├── db.ts                   # Database state engine, SHA-256 auth, CRUD, ration processors
│   ├── ethiopianDate.ts        # Julian Day Number calendar converter and formatting helpers
│   ├── geminiService.ts        # Client-side API caller for serverless Gemini endpoints
│   └── githubService.ts        # GitHub sync, dynamic sequence allocation, base64 encoding
├── tsconfig.json               # TypeScript compiler configuration
├── types.ts                    # Core TypeScript models, interfaces, and military enums
├── vercel.json                 # Vercel serverless routing and SPA fallback rewrite configuration
└── vite.config.ts              # Vite bundler configuration and Tailwind CSS plugins
```

---

## 4. Detailed Component & Service Breakdown

### 4.1 Core Application & Routing (`App.tsx`)
* Uses `HashRouter` to prevent 404 routing errors on static file hosts and offline containers.
* Manages authentication states:
  * Logged out (`isAuthenticated === false`) -> renders `pages/Login.tsx`.
  * Authenticated user -> wraps all routes inside `components/Layout.tsx`.
* Routes configured:
  * `/` -> `Home.tsx` (Dashboard)
  * `/income` -> `Income.tsx`
  * `/expenditure` -> `Expenditure.tsx`
  * `/store` -> `Store.tsx`
  * `/audit` -> `Audit.tsx`
  * `/notebook` -> `Notebook.tsx`
  * `/search` -> `Search.tsx`
  * `/editor` -> `DataEditor.tsx`
  * `/admin` -> `AdminDashboard.tsx` (Admin only)
  * `/db-admin` -> `DbAdministration.tsx`
  * `/about` -> `About.tsx`

### 4.2 Database Engine & Local Services (`services/db.ts`)
* **State Management:** Manages `AppData` in `localStorage` under the key `arms_database`.
* **Shared Database Mode:** If a secret key session is active, operations target `arms_shared_database` with read-only protections.
* **Auto-Save & Push:** Every mutation (`saveDB`, `smartUpsertItem`) persists locally and triggers an asynchronous background sync to GitHub via `pushToGitHub`.
* **Inventory Weighted Average Cost (WAC):**
  When receiving store orders via `processStoreOrder`:
  $$\text{New Average Price} = \frac{(\text{Old Qty} \times \text{Old Price}) + (\text{Received Qty} \times \text{Final Price})}{\text{Old Qty} + \text{Received Qty}}$$
* **Ration Deduction Processing (`processRationDeduction`):**
  Iterates over requested menu ingredients, locates matching items in inventory, calculates costs, reduces stock quantity (clamped to $\ge 0$), and writes an immutable record to `rationHistory`.
* **Safe Fresh Start (`clearDatabaseDataForFreshStart`):**
  Clears transactional collections (manpower, expenses, inventory, etc.) while preserving user credentials, security questions, and GitHub configuration.

### 4.3 GitHub Synchronization Engine (`services/githubService.ts`)
* **Decentralized Model:** Connects directly to the GitHub REST API (`https://api.github.com/repos/:owner/:repo/contents/:path`) using the user's PAT.
* **Dynamic Folder & Sequence Allocation:**
  1. Date is derived from the active Ethiopian month and year.
  2. Ethiopian month is mapped to an English folder name (e.g. `11` + `2018` $\rightarrow$ `july2018`).
  3. Probes the GitHub directory for existing sequence files (`arms001.json`, `arms002.json`, ...).
  4. Allocates the next numerical filename for new users or targets the existing file for returning users.
* **UTF-8 Safe Base64 Encoding:** Implements native byte array encoding using `TextEncoder` and `TextDecoder` to guarantee non-corrupted serialization of Amharic characters.

### 4.4 Ethiopian Calendar Engine (`services/ethiopianDate.ts`)
* Implements an accurate astronomical Julian Day Number (JDN) conversion algorithm:
  * **Gregorian to JDN:** Computes JDN from Gregorian day, month, and year.
  * **JDN to Ethiopian:** Converts JDN using the Ethiopian epoch offset ($1723856$).
* Supports all 13 Ethiopian months: *Meskerem, Tikimt, Hidar, Tahsas, Tir, Yekatit, Megabit, Miazia, Genbot, Sene, Hamle, Nehasse, Pagume*.
* Accurate Pagume leap day detection: Year $\bmod 4 = 3 \implies 6\text{ days}$; otherwise $5\text{ days}$.

### 4.5 Serverless Gemini AI Engine (`server/gemini.ts` & `api/index.ts`)
* Implements the `@google/genai` TypeScript SDK on the server side.
* **Resilient Multi-Model Fallback Chain:**
  To guarantee uninterrupted service in military command scenarios, requests sequentially try:
  1. `gemini-3.5-flash` (primary fast analysis model)
  2. `gemini-3.1-flash-lite` (lightweight fallback)
  3. `gemini-flash-latest` (stable emergency fallback)
* **Services Hosted:**
  * `analyzeDataServer`: Scans structured JSON database snapshots and computes mathematical answers to user queries.
  * `chatWithAIServer`: Multi-turn conversational military intelligence agent outputting Tailwind-formatted HTML tables.
  * `performLogisticsAnalysisServer`: Takes weekly meal schedules, active manpower count, and inventory stock; executes structured JSON schema generation for ingredient deficits, burn rates, and re-order recommendations.

---

## 5. Authentication & Access Control

```
+-------------------------------------------------------------------+
|                           Login Terminal                          |
|                                                                   |
|   +-----------------------------------------------------------+   |
|   | [ Standard User / Admin Login ]                           |   |
|   | Username: admin / etaf (or custom)                        |   |
|   | Password: SHA-256 verified against localStorage/GitHub    |   |
|   +-----------------------------+-----------------------------+   |
|                                 |                                 |
|            +--------------------+--------------------+            |
|            |                                         |            |
|            v                                         v            |
|   +-------------------------+       +-------------------------+   |
|   |   Forgot Credentials?   |       |    Secret Key Access    |   |
|   |  Answer Challenge Q&A   |       |  (Read-Only Shared DB)  |   |
|   +-------------------------+       +-------------------------+   |
+-------------------------------------------------------------------+
```

### 5.1 Credential Architecture
ARMS supports two distinct operational tiers:
1. **Standard User (`admin`):** Full operational access to day-to-day data entry, store operations, and reports.
   * Default Username: `admin`
   * Default Password Hash: SHA-256 of `admin` (`8c6976e5b541...`)
2. **System Administrator (`etaf`):** Unrestricted access including the `AdminDashboard` to configure global system parameters, purge data, and inspect raw database tables.
   * Default Admin Username: `etaf`
   * Default Admin Password Hash: SHA-256 of `etaf` (`89950db85e...`)

### 5.2 Password Recovery Challenge
* Uses a local security challenge question (Default: *"What is your primary military command / station?"*).
* Default answer: `"air force"` (stored as SHA-256 hash).
* Successfully answering the challenge allows the user to directly overwrite credentials without resetting operational database tables.

### 5.3 Secret Key Sharing & Read-Only Mode
* Users can generate a unique `Secret Key` associated with their database.
* External auditors or commanding officers can enter this secret key on the login screen.
* The system fetches the corresponding monthly JSON snapshot from GitHub, stores it in `arms_shared_database`, and restricts the interface to **read-only mode**, disabling all edit, delete, and import buttons.

---

## 6. Bilingual Localization (English & Amharic)

* Translation strings are stored in `contexts/LanguageContext.tsx` in a structured dictionary:
  ```typescript
  export const dictionary: Record<string, { en: string; am: string }> = { ... };
  ```
* Accessed throughout the app via the `t(key)` helper hook:
  ```tsx
  const { t, language, setLanguage } = useLanguage();
  return <button>{t('authenticate')}</button>;
  ```
* The Amharic localization covers 100% of the user interface, including navigation menus, date pickers, form labels, dialogs, error messages, and AI system prompts.

---

## 7. Build, Run & Development Guide

### 7.1 Prerequisites
* **Node.js:** v18.0.0 or higher
* **npm:** v9.0.0 or higher

### 7.2 Installation & Running
```bash
# 1. Install dependencies
npm install

# 2. Configure Environment Variables
cp .env.example .env.local
# Add your GEMINI_API_KEY inside .env.local

# 3. Start Development Server (Runs on port 3000)
npm run dev

# 4. Open in browser
# http://localhost:3000
```

### 7.3 Production Build
```bash
# Builds Vite client into dist/ and bundles server.ts into dist/server.cjs via esbuild
npm run build

# Start the compiled production server
npm start
```

---

## 8. Deployment Architecture (Vercel)

ARMS is configured for continuous zero-config deployment on **Vercel**:

* `vercel.json` maps incoming requests:
  * `/api/*` routes are handled by the serverless Express function `api/index.ts`.
  * All frontend navigation routes are rewritten to `/index.html` to support the SPA router.
* Serverless functions in `api/index.ts` automatically load environment variables and invoke `server/gemini.ts`.

```json
{
  "version": 2,
  "builds": [
    { "src": "api/index.ts", "use": "@vercel/node" },
    { "src": "package.json", "use": "@vercel/static-build" }
  ],
  "routes": [
    { "src": "/api/(.*)", "dest": "/api/index.ts" },
    { "src": "/(.*)", "dest": "/index.html" }
  ]
}
```

---

## 9. Troubleshooting & Maintenance

| Symptom | Probable Cause | Corrective Action |
| :--- | :--- | :--- |
| **GitHub Sync Fails (401 / 403)** | Personal Access Token expired or missing `repo` scope | Generate a classic GitHub PAT with `repo` (full control) scope in GitHub Settings and update it in **DB Administration**. |
| **GitHub Sync Fails (404)** | Repository name or owner typo, or repository is private without adequate token permissions | Verify the exact repository name on GitHub (create the repo if it doesn't exist). |
| **AI Features Return Quota / Error** | Gemini API key is missing, invalid, or rate-limited | Verify that `GEMINI_API_KEY` is set in the server environment or enter a custom key in **DB Administration**. The multi-model fallback will automatically switch models if a quota error occurs. |
| **Date Shows Invalid Day in Pagume** | Date exceeds Pagume length (5 days, or 6 in leap years) | The date picker automatically clamps dates. If an imported file has invalid dates, use the **Data Editor** page to correct the day. |
| **Forgotten Login Password** | Credentials modified and forgotten | Click **Forgot Password?** on the login page and answer the security recovery question (Default: `"air force"`). |

---

## 10. Legacy & Deprecated Files

The following files exist in the repository as legacy artifacts from previous development iterations and are retained for historical reference only:

1. **`ethiopianDate.ts` (Root directory):**
   * *Status:* Deprecated / Superseded.
   * *Reason:* An early rough date converter. Fully replaced by the mathematically rigorous Julian Day Number algorithm in `services/ethiopianDate.ts`.
2. **`pages/EthiopianDatePicker.tsx`:**
   * *Status:* Deprecated / Unused.
   * *Reason:* Early prototype date picker component. Fully replaced by `components/EthiopianDatePicker.tsx`, which integrates `CustomSelect` and responsive Pagume leap year calculation.
3. **`arms` (Root directory):**
   * *Status:* Termux Launcher Script.
   * *Reason:* Bash launch script for running ARMS locally on Android smartphones via the Termux terminal environment (`com.termux`).

---

## 11. Domain Glossary & Military Logistics Concepts

* **Quartermaster / Ration Officer:** Officer responsible for provisioning food, computing daily consumption, and maintaining adequate emergency reserves.
* **Payroll Manpower:** Active military personnel whose rations are subsidized via central payroll deduction.
* **Full Cash / Half Cash Manpower:** Personnel or civilian contractors paying partial or full out-of-pocket cash contributions for messing facility access.
* **Transient Personnel:** Temporary duty or visiting personnel attached to the mess for short duration.
* **Weighted Average Cost (WAC):** Inventory valuation method where every incoming batch of goods recalculates the unit price across all existing stock.
* **Pagume (ጳጉሜ):** The 13th month of the Ethiopian calendar, consisting of 5 days (6 days during a leap year occurring every 4 years).
* **Julian Day Number (JDN):** Continuous count of days since the beginning of the Julian Period, used by ARMS to achieve astronomical precision in converting Gregorian timestamps to the Ethiopian calendar.
