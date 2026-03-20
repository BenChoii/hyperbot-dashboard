# HyperBot Dashboard

Real-time trading dashboard for the HyperBot VWAP Scalper on Hyperliquid.

## Features

- **Live BTC Price Chart** with VWAP overlay + Bollinger Bands
- **Equity Curve** — cumulative P&L over time
- **RSI & VWAP Gauges** — live indicator values for BTC + ETH
- **Active Positions** — entries, current price, live unrealized P&L
- **Trade Log** — completed scalps with P&L, hold time, exit reason
- **Strategy Breakdown** — win rate and P&L per strategy
- **Degen Mode** — separate 50x leverage tracker with budget/blown status
- **Configurable API** — connect to any running HyperBot instance

## Quick Start

```bash
npm install
npm run dev
```

Open `http://localhost:5173` and enter your bot's API URL (default: `http://localhost:8080`).

## Deploy to Vercel

```bash
npm run build
npx vercel
```

## Tech Stack

- **Vite** — build tool
- **Chart.js** — interactive charts
- **Vanilla JS** — zero framework overhead
- **JetBrains Mono + Inter** — premium typography

## License

MIT
