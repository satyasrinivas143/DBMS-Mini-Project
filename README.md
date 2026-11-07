# 🎓 SmartFinance – Student Money Manager

A beautiful, dark-mode **Smart Student Money Management** web app built with pure HTML, CSS, and JavaScript.

---

## 📁 Project Structure

```
smart-student-money/
│
├── index.html          ← Main entry point (open this in browser)
│
├── css/
│   └── style.css       ← All styles (dark mode, animations, layout)
│
├── js/
│   └── app.js          ← UI logic and backend API integration
│
├── backend/
│   ├── server.js       ← Node.js / Express API
│   └── data/           ← SQLite database file (created on first run)
│
├── assets/
│   └── icons/          ← (for future custom icons)
│
└── README.md           ← This file
```

---

## 🚀 How to Run

Start the backend from the `backend` folder:

```bash
cd backend
npm install
npm start
```

Then open http://localhost:5000. The backend serves the frontend and stores app data in SQLite. Avoid opening `index.html` directly, since that prevents it from connecting to the API.

---

## ✨ Features

| Page | What it does |
|---|---|
| 📊 **Dashboard** | Balance, budget, expenses & savings summary cards + charts |
| 💰 **Budget Planner** | Set budgets per category, track spending vs budget |
| 💳 **Expenses** | Add, search, filter, sort & delete expenses |
| 📥 **Income** | Track income sources (scholarship, job, family, freelance) |
| 🎯 **Savings Goals** | Create goals, add money, track progress |
| 📈 **Reports** | Yearly trends, savings progress, top categories |
| 👤 **Profile** | Student info & app preferences |

---

## 🛠️ Tech Stack

- **HTML5** – Semantic structure
- **CSS3** – Dark mode, glassmorphism, animations (Vanilla)
- **JavaScript (ES6+)** – Vanilla JS, no frameworks
- **Node.js + Express** – Backend API
- **SQLite** – Persistent database at `backend/data/smartfinance.db`
- **Chart.js 4.4** – All charts (via CDN)
- **Google Fonts** – Outfit typeface
- **localStorage** – Browser cache and offline fallback

---

## ⌨️ Keyboard Shortcuts

| Key | Action |
|---|---|
| `N` | Open Add Transaction modal |
| `Esc` | Close modal |

---

## 💾 Data Storage

With the backend running, transactions, budgets, income sources, and savings goals are saved in SQLite. Existing browser data is synced with the database when the app is opened. The browser also keeps a local cache.

To reset server data, stop the backend and remove `backend/data/smartfinance.db`; it will be recreated on the next start. To clear only the browser cache, use DevTools → Application → Local Storage.

---

*Built with ❤️ for students who want to take control of their money.*
