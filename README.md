<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />

# 🛡️ ARMS: Ethiopian Air Force Audit & Ration Management System
### 🇪🇹 የአዲት እና ሬሽን አስተዳደር ሲስተም

[![Made with React](https://img.shields.io/badge/Made%20with-React-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)](https://www.typescriptlang.org/)
[![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)](https://vitejs.dev/)
[![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)](https://tailwindcss.com/)

</div>

---

## 📋 Overview
**ARMS** is a modern, high-performance, and secure management dashboard designed explicitly for tracking logistics, inventory metrics, and financial workflows. Integrated with cutting-edge client-side automated cloud sync capabilities and an intelligence-driven AI companion, ARMS delivers high-efficiency localized enterprise management out of the box.

---

## ✨ Key Features

### 💵 Financials & Auditing
* **Income & Expenditure Tracking:** Log financial transactions with precision tools.
* **Audit Center:** In-depth balance calculations and financial health scoring systems.

### 📦 Logistics & Inventory
* **Store & Supply Management:** Track physical assets, equipment updates, and stock levels seamlessly.
* **Live Ethiopian Date & Time Engine:** Fully customized localized calendar matrix (`EthiopianDate.ts`) baked directly into the system state.

### ☁️ Serverless Git-DB Sync (Decentralized Database)
* **Zero-Backend Infrastructure:** Works entirely client-side using regular GitHub repositories as secure, dynamic databases.
* **Autonomous Versioning:** Instantly backs up and pulls changes globally via encrypted API handling.

### 🧠 Advanced AI Studio Integration
* **Gemini AI Core:** Built-in generative artificial intelligence for logic processing, semantic search, and autonomous data parsing.

---

## ⚡ Quick Start: Instant Online Usage

No installation required! If you do not want to set up a local development server, you can use the fully functional system deployed live on the cloud right now.

> 🌐 **Live Web Application URL:** [https://arms-sandy.vercel.app/](https://arms-sandy.vercel.app/)

### How to use the live version:
1. Open the **Live Link** above.
2. Bypass the gateway login using the default trial admin credentials:
   * **Username:** `admin`
   * **Password:** `admin`
3. Go directly to **Database Administration (ዳታቤዝ አስተዳደር)** from the menu sidebar.
4. Input your own GitHub Parameters (**Username, Repo Name, Target JSON file, and PAT Key**).
5. The cloud application will instantly bind itself to your personal repository, allowing you to use it as a persistent production system immediately!

---

## 📸 Interface Preview

| 🔐 Secure Gateway | 📊 Command Dashboard |
|---|---|
| <img src="assets/screenshots/login.png" width="380" alt="Login Page"/> | <img src="assets/screenshots/home.png" width="380" alt="Home Dashboard"/> |

| 🗂️ Navigation Engine | 🎛️ Cloud DB Management |
|---|---|
| <img src="assets/screenshots/sub_menus.png" width="380" alt="Sub Menus Options"/> | <img src="assets/screenshots/db_administration.png" width="380" alt="Database Control Studio"/> |

---

## 🚀 Getting Started (Run Locally)

### Prerequisites
* **Node.js** (LTS version 24 recommended)
* **Git** installed on your client terminal (or Termux)

### 🛠️ Execution Roadmap

#### 1. Quick Setup (Automated Environment-Aware Script)
The project includes an intelligent `install.sh` script that automatically detects your platform (Native Termux, PRoot Distro Kali Linux, or Desktop Linux) and shell environment (`bash` or `zsh`), and provisions the correct environment along with Node.js and dependencies:

```bash
chmod +x install.sh
./install.sh
```

> 💡 **What the script does behind the scenes:**
> * **Native Termux:** Uses `pkg` package manager to clean and deploy Node.js instantly.
> * **PRoot Distro Kali Linux:** Cleans old broken apt-node structures, installs **NVM (Node Version Manager)**, configures environment paths for either `~/.bashrc` or `~/.zshrc` dynamically, upgrades environment runtime to Node.js v24, and runs dependency mapping.
> 
> 

*Alternatively, if you prefer manual environment configuration, run:*

```bash
npm install

```

#### 2. Configure Environment Variables

To unlock the intelligent search and cognitive features of the built-in AI companion, create a `.env.local` file in your root folder and append your unique Gemini token:

```ini
VITE_GEMINI_API_KEY=your_actual_gemini_api_key_here

```

#### 3. Launch Development Server

Boot up the fast local runtime server:

```bash
npm run dev

```

---

## 🔄 How to Change the Admin Username and Password

Because the system operates entirely client-side without relying on an external SQL backend database, the security gate check is handled right within the primary application routing. You can change these default credentials to your own custom values by editing the source code directly:

1. Open the file: **`App.tsx`**
2. Locate the verification block on **line 51**:
```typescript
if (username === 'admin' && password === 'admin') {

```


3. Swap out the default `'admin'` strings with your new preferred credentials:
```typescript
if (username === 'your_custom_user' && password === 'your_secure_password') {

```


4. Save the file.
5. **Apply Changes:**
* **Locally:** The development server will auto-reload with your new password.
* **Production/Web:** Commit and push the update to GitHub (`git add App.tsx && git commit -m "Update admin credentials" && git push`), and Vercel will automatically rebuild your live deployment instantly.



---

## 🗄️ Production Deployment & Cloud Database Configuration

The system is fully independent and production-ready with zero traditional server maintenance costs. To link the operational ledger data to your permanent persistent cloud storage, navigate directly to **Database Administration (ዳታቤዝ አስተዳደር)** inside the application and provide your parameters:

1. **GitHub Owner:** Input your unique GitHub account username (e.g., `ANK-369`).
2. **Repository Target:** Give it the target storage container repo name (e.g., `ARMS`).
3. **Data File Identifier:** Set your preferred JSON filename endpoint (e.g., `arms_db.json`).
4. **Personal Access Token (PAT):** Pass your secure GitHub token (`ghp_...`).

> ⚠️ **Security Warning:** Keep your Personal Access Token strictly private. The dashboard handles these queries directly via client-side API loops ensuring data remains isolated inside your authorized network boundaries.

---

## 📌 Project Status, Scope & Operational Disclaimer

> ⚠️ **Important Classification Note:** **ARMS** is currently an independent, grassroots software initiative. It is **not** an officially mandated, force-wide enterprise deployment across the entire Ethiopian Air Force infrastructure, nor has it received formal institutional acknowledgment at the command level yet.

### ⚡ Current Operational Impact

While the project is currently in its active development phase with many features yet to be integrated, it is fully functional and completely optimized for specific localized use cases. Currently, a small subset of personnel (the creator and close operational colleagues) utilize this system daily to:

* 📉 **Minimize Operational Risk:** Replaces disjointed manual file tracking with a centralized database structure.
* ⏱️ **Optimize Time Management:** Dramatically shortens data retrieval and log updates from hours to seconds.
* 🎯 **Eliminate Human Error:** Automated accounting metrics drastically reduce input discrepancies.
* ⚖️ **Heighten Accountability:** Creates an immutable client-side record of adjustments, bringing high transparency to logistics management.

### 🗺️ Future Roadmap & Upcoming Features

The system is designed to scale into a robust, multi-role enterprise ecosystem. Future development phases will implement granular Role-Based Access Control (RBAC) to deploy specialized dashboards tailored for specific logistics and monitoring tasks:

* **📦 Storekeeper (Store Man) Dashboard:** Tailored interface for physical asset tracking, real-time stock allocation checks, and warehouse intake logs.
* **🛒 Procurement (Buyers) Hub:** Streamlined workspace for managing supplier data, incoming purchase requests, and budget tracking.
* **📊 Financial Audit Interface:** Advanced analytical data views for internal auditors to track fiscal discrepancies and run balance scorecards.
* **👥 Review Committee Leadership Portal:** A high-level decision-making dashboard allowing committee chairs to review system recommendations, approve or reject log adjustments, and sign off on audit completions.
* **🛡️ Higher Command Controller & Admin Console:** A specialized dashboard designed strictly for senior security controllers and system administrators. This view focuses exclusively on:
* **Immutable Log Reviews:** Comprehensive, real-time security tracking of all user interactions.
* **Administrative Actions Only:** Isolated override controls and system-wide security auditing to ensure absolute accountability without exposing tactical data unnecessarily.



### 🔒 Architectural & Approval Milestones

Before presenting a formal case study to leadership for official institutional deployment, the system will undergo:

1. **Security Hardening:** Implementing standard cryptographic safeguards to protect local storage structures.
2. **Offline Optimization:** Enhancing client-side synchronization pipelines to maintain smooth performance in low-bandwidth or isolated mobile environments (such as Termux deployments).
3. **AI Search Refinement:** Expanding the embedded Gemini AI Core to handle semantic searching across the multi-role logs.

Once these rigorous security and performance metrics are fully satisfied, a formal case study and live demonstration will be presented to leadership to obtain official institutional approval and broader deployment authorization.

```

```
