# 📊 Personal Yield

A full-stack application for managing investment returns, dividends, and financial assets — built by a professional athlete who needed a tool to track finances across multiple countries, banks, and currencies.

---

![Status](https://img.shields.io/badge/status-in%20development-yellow)
![License](https://img.shields.io/badge/license-MIT-green)

## 📂 Monorepo Structure

This project uses **npm workspaces** to manage both frontend and backend in a single repository.

```
Personal-Yield/
├── packages/
│   ├── client/     → React frontend (CRA)
│   └── server/     → Node.js/Express API
├── .github/        → GitHub Actions workflows
└── package.json    → Root workspace config
```

| Package | Tech Stack | Details |
|---------|-----------|---------|
| **client** | React, Axios, Recharts, React Router | Dashboard with asset performance, dividends, responsive UI |
| **server** | Node.js, Express, MongoDB/Mongoose | REST API with auth (JWT), data encryption, Yahoo Finance integration |

---

## 🔐 Data Security

All sensitive financial data is **encrypted before being stored** in the database, ensuring privacy and protection of your investment records.

---

## 🚀 Getting Started

### Prerequisites
- **Node.js** (v18+) and **npm** (v9+)
- **MongoDB** (local or [Atlas](https://www.mongodb.com/atlas))

### Installation

```bash
# Clone the repository
git clone https://github.com/RZB1414/Personal-Yield.git
cd Personal-Yield

# Install all dependencies (both client and server)
npm install
```

### Environment Variables

Create a `.env` file in `packages/server/`:

```env
DB_USER=your_mongodb_user
DB_PASSWORD=your_mongodb_password
JWT_SECRET=your_jwt_secret
JWT_REFRESH_SECRET=your_jwt_refresh_secret
CRYPTO_SECRET=your_crypto_secret
PORT=3000
```

### Running Locally

```bash
# Start the React frontend (port 3001)
npm run dev:client

# Start the API server (port 3000)
npm run dev:server
```

### Other Commands

```bash
# Build the React app for production
npm run build:client

# Run daily price snapshots
npm run snapshot

# Seed historical snapshot data
npm run seed:snapshots

# Run React tests
npm run test:client
```

---

## 📸 Daily Snapshots

The API can take a daily snapshot of each holding's price and daily change using Yahoo Finance. A GitHub Actions workflow runs this automatically on weekdays at market close.

---

## 🧑‍💻 Author

Developed by **Renan Buiatti**

📫 renanbuiatti14@gmail.com
🌐 [LinkedIn](https://www.linkedin.com/in/renan-buiatti-13787924a)
📷 Instagram: renanbuiatti
