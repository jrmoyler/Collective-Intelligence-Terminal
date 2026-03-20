# Collective Intelligence Terminal v7.0

> **Architecting a Humane Future** — Collective AI | Hataalii (JR Moyler), CEO

A single-file prediction market and market intelligence terminal. Open `index.html` in any browser. No installation, no server, no build step.

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/jrmoyler/Collective-Intelligence-Terminal)

---

## What It Is

The Collective Intelligence Terminal fuses:

- **Bloomberg-grade market intelligence** — VIX, SPY, sectors, RSI, breadth, macro from 31 live sources
- **3D prediction market simulation** — 108 AI agents across 3 floors deliberating in real time
- **World intelligence feed** — GDELT, GNews, Reddit, EONET, arXiv, ClinicalTrials, Congress, sanctions
- **Quant microstructure engine** — Kyle Lambda, Hawkes Process, Almgren-Chriss, Avellaneda-Stoikov, VPIN
- **Signal fusion** — 13 data streams → single -100/+100 directional score
- **Cross-asset correlation engine** — prediction outcomes mapped to equity/crypto/forex moves
- **Multi-leg parlay builder** — correlation-adjusted Kelly Criterion sizing
- **Wallet + trading** — MetaMask/Phantom connect, Polymarket CLOB execution, Alpaca paper trading
- **Agent trade suggestions** — AXIOM, SPECTRE, HERALD cards after each simulation
- **Resolution monitor + calibration loop** — auto-marks outcomes, corrects systematic bias in synthesis

---

## Live Data Sources (31 Total)

| Category | Sources |
|----------|---------|
| **Markets** | Yahoo Finance, Alpha Vantage, Polygon.io, FRED, Finnhub, CoinGecko, CBOE |
| **Prediction Markets** | Polymarket Gamma API, Polymarket CLOB (order book + fills) |
| **Options Flow** | Unusual Whales (options flow, congressional trades) |
| **Sentiment** | Crypto Fear & Greed Index, Reddit (5 subreddits) |
| **World News** | GDELT Project, GNews API, Wikipedia Current Events |
| **Science** | NASA NEO, NASA EONET, SpaceX Launch Library 2, arXiv |
| **Medical** | ClinicalTrials.gov |
| **Environmental** | USGS Earthquakes, NWS Weather Alerts, Open-Meteo (weather + marine), GBIF |
| **Sports** | ESPN (NBA, NFL) |
| **Political** | ProPublica Congress API, OpenSanctions |
| **Financial** | World Bank, Treasury (fiscaldata.treasury.gov), Exchange Rates (open.er-api.com) |
| **Entertainment** | TMDb (via allOrigins proxy) |

---

## Quick Start

### Option 1 — Direct (no setup)
```
1. Open index.html in Chrome, Firefox, or Edge
2. Wait 8-15 seconds for all 31 sources to connect
3. The terminal is live — no keys required for core functionality
```

### Option 2 — Vercel Deploy
Click the Deploy button above, or:
```bash
npm i -g vercel
vercel --prod
```

### Option 3 — Local HTTP Server
```bash
python3 -m http.server 3000
# Open http://localhost:3000
```

---

## API Keys (Optional — Enhance Functionality)

All keys are entered via the **⚙ MARKET** button in the top bar. Saved to localStorage — one-time setup.

| Key | Free Tier | What It Unlocks |
|-----|-----------|-----------------|
| [Alpha Vantage](https://alphavantage.co/support) | 25 req/day | Server-verified RSI + SMAs |
| [Polygon.io](https://polygon.io) | Free starter | Real NYSE breadth data |
| [FRED](https://fred.stlouisfed.org/docs/api) | Free | Fed rate, CPI, yield curve |
| [Finnhub](https://finnhub.io) | Free | AAPL, MSFT, NVDA live prices |
| [NASA](https://api.nasa.gov) | 1000/hr | NEO asteroid database |
| [Unusual Whales](https://unusualwhales.com) | Free tier | Full institutional options flow |
| [GNews](https://gnews.io) | 100/day | Live political, entertainment, crime news |
| [Alpaca](https://alpaca.markets) | Free paper | Stock/ETF paper trading (no deposit) |

---

## Wallet + Trading

### Polymarket (Real Funds)
1. Install [MetaMask](https://metamask.io)
2. Switch to **Polygon** network
3. Load **USDC** into your wallet
4. Click **◈ CONNECT WALLET** in the terminal
5. Orders are EIP-712 signed by your wallet — no API key needed

### Alpaca Paper Trading (No Deposit)
1. Create a free account at [alpaca.markets](https://alpaca.markets)
2. Generate API keys from the paper trading dashboard
3. Enter keys in **⚙ MARKET → Trading API Keys**
4. Agent trade suggestions will include one-click paper execution

### Phantom (Solana — View Only)
Connect Phantom wallet for address display. Polymarket runs on Polygon/EVM.

---

## 19 Prediction Domains

`POLYMARKET` `MARKETS` `SPORTS` `MEDICINE` `SCIENCE` `TECHNOLOGY` `SOCIETY` `ENVIRONMENT` `GEOLOGY` `BIOLOGY` `ASTROPHYSICS` `OCEANOGRAPHY` `PHILOSOPHY` `PHYSICS` `REAL ESTATE` `BOTANY` `GEOGRAPHY` `WORLD NEWS` `POLITICAL`

Each domain:
- Has a domain-specific data weighting (e.g., GDELT × 2.8 for geology, ESPN × 2.5 for sports)
- Maps to correlated financial instruments via the Cross-Asset Correlation Engine
- Populates with live data from its relevant sources on tab click
- Feeds domain-specific context into every phase of deliberation

---

## The Deliberation Engine (4 Phases)

```
Phase 1: Web Search     — Claude searches for current intel on the scenario
Phase 2: OL Specialist  — 6 named specialists each deliberate independently
          AXIOM (Quant) · SPECTRE (Geopolitical) · VANTA (Tech/Innovation)
          ORACLE (Historical) · HERALD (Behavioral) · CIPHER (Scientific)
Phase 3: Institutional  — 3 factions form (Alpha/Sigma/Delta, 12 analysts each)
[ZenFlow] Optional      — 12 sub-agents if ZENFLOW: ON (6 retail + 6 institutional)
Phase 4: Synthesis      — Final arbitration with calibration feedback injection
```

World news, arXiv papers, breaking headlines, congressional votes, conflict events, Reddit crowd signals, and congressional trading data are injected into every phase.

---

## Architecture

```
index.html          — Complete single-file application (~450KB)
  ├── Script Block 1 — Main app logic (~170KB)
  │   ├── Mobile optimization engine
  │   ├── ZenFlow agent ensemble
  │   ├── Resolution monitor + calibration loop
  │   ├── Wallet + trading engine (MetaMask/Phantom/Alpaca)
  │   ├── Cross-asset correlation engine (19 domains)
  │   ├── Signal fusion engine (13 sources)
  │   ├── Parlay builder (Kelly Criterion + correlation)
  │   ├── Agent trade suggestion engine
  │   ├── Nexus Labs content engine (4 formats)
  │   ├── Portfolio risk scanner
  │   ├── Execution layer (Kelly + microstructure)
  │   └── All 31 data fetchers
  ├── Script Block 2 — Backtest engine (~16KB)
  └── Script Block 3 — Three.js 3D scene (~145KB)
      └── 108 humanoid agents across 3 floors
          ├── Floor 1: 48 retail agents (amber)
          ├── Floor 2: 36 institutional agents (teal)
          └── Floor 3: 24 OL specialist agents (violet)

vercel.json         — Vercel deployment config (static, wildcard routing, CORS headers)
.env.example        — Environment variable template (all optional)
```

---

## Environment Variables (All Optional)

For enhanced functionality, set these as Vercel environment variables or paste into the **⚙ MARKET** modal:

```bash
# Market data
ALPHA_VANTAGE_KEY=your_key_here
POLYGON_KEY=your_key_here
FRED_KEY=your_key_here
FINNHUB_KEY=your_key_here
NASA_KEY=your_key_here

# News & world intelligence
GNEWS_KEY=your_key_here

# Options flow
UNUSUAL_WHALES_KEY=your_key_here

# Trading
ALPACA_KEY=your_key_here
ALPACA_SECRET=your_key_here
```

All keys are stored in browser localStorage after first entry. The terminal reads them via the `CIT_KEYS` object on load.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| 3D Rendering | Three.js r128 (CDN) |
| AI Deliberation | Anthropic Claude API (claude-sonnet-4-20250514) |
| Web Search | Anthropic Web Search tool |
| Market Data | Yahoo Finance via allOrigins CORS proxy |
| Styling | Pure CSS (no framework) |
| State | Browser localStorage + sessionStorage |
| Wallet | EIP-1193 (MetaMask), Solana Web3 (Phantom) |
| Order Signing | EIP-712 typed data |
| Paper Trading | Alpaca Markets REST API |
| CORS Proxy | api.allorigins.win (for restricted endpoints) |

---

## Key Features

### Signal Fusion Bar
Persistent bar above the ticker. 13 live data streams → -100/+100 directional score.
`Market Quality · UW Options Flow · CBOE P/C · Fear&Greed · Breadth · VIX · SPY Trend · RSI · 10Y Yield · DXY · BTC · Congress Trades · FOMC/CPI`

### Cross-Asset Correlation Engine
Every prediction domain maps to financial instruments that move on resolution:
- Technology YES → LONG QQQ, XLK, NVDA, MSFT, ETH
- Environment YES → LONG ICLN, ENPH, SHORT XLE
- World News NO → LONG GLD, TLT, SHORT SPY (crisis hedge)
- Political YES → LONG SPY, XLF (policy clarity premium)

### Calibration Feedback Loop
After 5+ resolved contracts: Brier score + systematic bias detection + specialist accuracy → injected directly into Phase 4 synthesis as correction signal. The terminal gets smarter every time a contract resolves.

### Zero Mock Data
All market data fields return `null` until live fetches complete. No random seeds. No fake prices. If a source fails, the field shows `—` until real data arrives.

---

## Deployment Notes

### Vercel (Recommended)
The included `vercel.json` configures:
- Static file serving
- Wildcard route → `index.html`
- CORS headers for all external API calls
- CSP allowing `connect-src *` for 31 live data sources
- Cache-Control: no-cache (data is always live)

### CORS Considerations
Some APIs require the `allOrigins` proxy (`api.allorigins.win/get?url=...`).
These include: Yahoo Finance, CBOE stats page, TMDb.
All other 28 sources are CORS-open and call directly.

### Anthropic API Key
The terminal calls the Anthropic API directly from the browser. Enter your key in the bottom input bar (`YOUR ANTHROPIC API KEY` placeholder). The key is stored in localStorage and never sent anywhere except `api.anthropic.com`.

---

## Collective AI

Built by **Hataalii (JR Moyler)**, CEO & Co-Founder of [Collective AI](https://collectiveai.io).

**Architecting a Humane Future.**

---

*This terminal is a decision-support tool. Nothing in it constitutes financial advice. Paper trading accounts are recommended for testing execution. Real fund trading on Polymarket requires your own wallet and USDC — always confirm before executing.*
