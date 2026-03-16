# Roblox Sales Analytics

A real-time analytics dashboard for Roblox group sales. Upload a CSV export or connect your `.ROBLOSECURITY` cookie to fetch live transaction data with auto-refresh.

## Features

- **CSV Upload** — Import your Roblox group sales CSV for instant analysis
- **Live Connection** — Connect via `.ROBLOSECURITY` cookie for real-time data with 10s auto-refresh
- **Revenue Charts** — Area charts, bar charts, and pie charts powered by Recharts
- **Top Assets** — See your best-selling game passes and developer products
- **Buyer Profiles** — Avatars and usernames fetched automatically via batched API calls
- **Game Thumbnails** — Hover over locations to see game icons and links
- **Filters & Search** — Filter by location, asset type, month, and search by name
- **Saved Profiles** — Save group connections for quick access
- **7 Themes** — Emerald, Purple, Blue, Rose, Cyberpunk, Midnight, Sunset
- **Pagination** — Browse all transactions with sorting and pagination

## Tech Stack

- **Frontend:** React 19, TypeScript, Tailwind CSS 4, Recharts, Framer Motion
- **Backend:** Vercel Serverless Functions (API proxy for Roblox endpoints)
- **Local Dev:** Express + Vite dev server

## Getting Started

### Prerequisites

- Node.js 18+
- npm

### Install & Run

```bash
git clone https://github.com/DevRayro/roblox-sales-analytics.git
cd roblox-sales-analytics
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Deploy to Vercel

1. Fork this repo
2. Go to [vercel.com/new](https://vercel.com/new) and import the repo
3. Click Deploy — Vercel auto-detects the config from `vercel.json`

## Project Structure

```
├── api/roblox/           # Vercel serverless API routes
│   ├── auth.ts           # Cookie authentication
│   ├── sales.ts          # Fetch group transactions
│   ├── users.ts          # Batch user info
│   ├── games.ts          # Game/universe info
│   ├── groups.ts         # User group roles
│   ├── group-info/       # Group details + icon
│   ├── thumbnails/       # User, game, place thumbnails
│   └── universe-from-asset.ts
├── src/
│   ├── App.tsx           # Main app with sidebar navigation
│   ├── components/
│   │   ├── Dashboard.tsx # Charts and stats overview
│   │   ├── AllSales.tsx  # Full transaction table with filters
│   │   ├── CookieConnect.tsx  # Live connection form
│   │   ├── FileUpload.tsx     # CSV drag-and-drop upload
│   │   ├── BuyerCell.tsx      # User avatar + name cell
│   │   ├── LocationCell.tsx   # Game icon tooltip cell
│   │   └── Settings.tsx       # Theme picker
│   ├── utils/
│   │   └── apiBatcher.ts # Batched API request utility
│   ├── types.ts
│   └── index.css         # Theme variables
├── server.ts             # Express dev server
├── vercel.json           # Vercel deployment config
└── vite.config.ts
```

## Security

Your `.ROBLOSECURITY` cookie is:
- Sent only to the server-side proxy (never exposed client-side to third parties)
- Stored in your browser's `localStorage` for auto-refresh (clear it by disconnecting)
- **Never logged or persisted on the server**

Use this feature at your own risk. Never share your cookie with anyone.

## License

[MIT](LICENSE)
