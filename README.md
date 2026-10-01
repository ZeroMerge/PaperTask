# PaperTask — Tangible Notion Tasks on Continuous Thermal Paper

<p align="center">
  <img src="public/papertask_icon.png" alt="PaperTask Logo" width="100" />
</p>

<p align="center">
  <strong>Transform your digital Notion tasks into physical, tactile thermal receipts with one tap via Web Bluetooth.</strong>
</p>

<p align="center">
  <a href="https://papertask.zeropropel.com"><img src="https://img.shields.io/badge/Live_Demo-papertask.zeropropel.com-6314ff?style=for-the-badge&logo=googlechrome&logoColor=white" alt="Live Demo" /></a>
  <a href="https://github.com/ZeroMerge/PaperTask"><img src="https://img.shields.io/badge/GitHub-ZeroMerge%2FPaperTask-00213f?style=for-the-badge&logo=github&logoColor=white" alt="GitHub Repo" /></a>
  <a href="LICENSE"><img src="https://img.shields.io/badge/License-MIT-emerald?style=for-the-badge" alt="License" /></a>
  <img src="https://img.shields.io/badge/Web_Bluetooth-Supported-blue?style=for-the-badge&logo=bluetooth&logoColor=white" alt="Web Bluetooth" />
  <img src="https://img.shields.io/badge/PWA-Installable-purple?style=for-the-badge" alt="PWA" />
</p>

---

## 🌟 Try the Live App

👉 **[papertask.zeropropel.com](https://papertask.zeropropel.com)**

No installation or proprietary companion apps required. Open in Google Chrome, Microsoft Edge, or any Web Bluetooth-enabled browser, pair your mini thermal printer, and print directly from your browser!

---

## 📖 What is PaperTask?

**PaperTask** bridges the gap between digital task management in Notion and physical productivity. 

In a world filled with notifications, screen fatigue, and endless digital tabs, PaperTask lets you print your daily priorities onto a **tangible physical receipt roll** or individual sticky labels using inexpensive portable thermal printers (Cat / FunPrint / POS-58).

Tear off your daily mission strip, stick it to your monitor, keyboard, or notebook, and experience the tactile satisfaction of checking items off with an actual pen!

---

## ✨ Key Features

### 🧾 1. Continuous Seamless Roll Printing
* **No Wasted Paper**: Stitch multiple tasks into a single, continuous paper roll with clean dotted tear guides between each card.
* **Task Sequencing**: Reorder tasks with simple Up ($\uparrow$) / Down ($\downarrow$) controls before printing to structure your day in chronological order.

### 🎯 2. Daily Roll Header & Reflection Notes
* **Official Mission Header**: Automatically prepends today's localized calendar date, task count, total estimated focus Pomodoros, and a custom motivational quote or mission title.
* **Pen Reflection Footer**: Appends an *"ALL TASKS COMPLETED"* pen check box and lined reflection notes section at the end of the roll for journaling your day.

### 📡 3. Zero-Driver Web Bluetooth (BLE)
* **Direct Browser-to-Printer**: Communicates directly over the Web Bluetooth API (`0xFFE0` / `0xFF00` GATT services).
* **Hardware-Synchronized Flow Control**: 14ms paced row transmission with periodic buffer drain breathers prevents microcontrollers from dropping packets or stopping halfway.
* **Maximum Contrast**: 16-bit thermal burn energy command (`0xFFFF`) ensures crisp, jet-black typography and high-density QR codes on standard 203 DPI paper.

### 🔄 4. Dynamic Notion Integration & Two-Way Sync
* **Works with ANY Database**: Automatically detects and adapts to your database schema (Due Dates, Priority, Tags, Project, Notes, Subtasks).
* **Notion QR Codes**: Automatically generates scannable QR codes for each card linking directly to the corresponding Notion page.
* **Two-Way Completion**: Checking off a task in PaperTask updates your Notion database in real-time.

### ⚙️ 5. Notion-Style Properties Popover
* A lightweight, non-intrusive properties dropdown lets you toggle exactly which fields appear on your printed slip with live instant preview.
* Integrated thermal contrast mode (Solid Crisp vs. Photo Dither) and darkness intensity sliders.

### 📐 6. Calibrated Physical Centimeter Ruler
* Includes an on-screen metric ruler calibrated to **80 dots = 1.0 cm** (203 DPI standard), showing you the exact physical strip length before you burn a single millimeter of paper.

### 📲 7. Installable Progressive Web App (PWA)
* Fully functional offline with service worker caching.
* Install to your desktop or mobile home screen as a standalone application.

---

## 🖨️ Hardware Compatibility

PaperTask works out-of-the-box with standard **57mm / 58mm portable mini Bluetooth thermal printers** (384 dots per row, 203 DPI):

| Printer Family | Example Models | Connection Protocol |
|---|---|---|
| **Cat / Meow Printers** | C9, C11, C13, C15, C17, C19, C20 | BLE `0xFFE0` / `0xFF00` (`0x51 0x78`) |
| **FunPrint / WalkPrint** | X5, X6, POS-58, PeriPage mini clones | BLE GATT Characteristic |
| **Continuous Sticker Rolls** | 57mm $\times$ 30mm adhesive thermal rolls | Standard Thermal |

> **Browser Requirement:** Google Chrome, Microsoft Edge, Chromium, or [Bluefy](https://apps.apple.com/app/bluefy-web-ble-browser/id1492822055) on iOS (requires Web Bluetooth support).

---

## 🚀 Quick Start Guide

### Step 1: Open the Live App
Navigate to **[papertask.zeropropel.com](https://papertask.zeropropel.com)** in Google Chrome or Microsoft Edge.

### Step 2: Connect your Notion Database
1. Go to [notion.so/my-integrations](https://www.notion.so/my-integrations) and create an integration to get an **Internal Integration Secret**.
2. Open your Notion task database, click the **···** menu in the top-right $\rightarrow$ **Connections** $\rightarrow$ connect your integration.
3. Copy the database link or 32-character ID.
4. Click **Notion** in PaperTask, paste your credentials, and tap **Sync Database**.

### Step 3: Pair your Printer & Print
1. Turn on your Bluetooth thermal printer.
2. Click **Connect** in the top navigation bar and select your printer from the browser Bluetooth prompt.
3. Select the tasks you want to accomplish today.
4. Preview the continuous receipt strip and click **Print Seamless Roll**!

---

## 🛠️ Local Development

If you'd like to run or build PaperTask locally:

### Prerequisites
* Node.js 18+
* npm or pnpm

### Setup

```bash
# 1. Clone the repository
git clone https://github.com/ZeroMerge/PaperTask.git
cd PaperTask

# 2. Install dependencies
npm install

# 3. Start local development server
npm run dev
```

Open `http://localhost:5173` in a Web Bluetooth-compatible browser (e.g. Chrome or Edge).

### Build for Production

```bash
npm run build
```

The production-ready bundled output will be located in the `dist/` directory, ready to be deployed to Cloudflare Pages, Vercel, Netlify, or any static hosting provider.

---

## 🏗️ Technical Architecture

* **Frontend Framework:** [React 19](https://react.dev/) + [TypeScript](https://www.typescriptlang.org/)
* **Bundler & Tooling:** [Vite 8](https://vitejs.dev/) + [Tailwind CSS v4](https://tailwindcss.com/)
* **Icons:** [Lucide React](https://lucide.dev/)
* **Rasterization Engine:** Custom HTML5 Canvas pipeline with Floyd-Steinberg dithering, Atkinson dithering, and 1-bit thresholding.
* **Bluetooth Protocol:** Custom Web Bluetooth driver implementing the `0x51 0x78` Cat printer protocol with 16-bit energy commands and UART flow pacing.
* **PWA:** Service Worker caching (`public/sw.js`) and Web App Manifest (`public/manifest.json`).

---

## 🤝 Contributing

Contributions, bug reports, and feature requests are welcome!

1. Fork the Project ([`https://github.com/ZeroMerge/PaperTask`](https://github.com/ZeroMerge/PaperTask))
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 📄 License

Distributed under the **MIT License**. See [`LICENSE`](LICENSE) for more information.

---

<p align="center">
  Built with ❤️ by <a href="https://github.com/ZeroMerge">ZeroMerge</a> · Hosted live at <a href="https://papertask.zeropropel.com">papertask.zeropropel.com</a>
</p>
