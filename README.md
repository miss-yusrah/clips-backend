# ClipCash

**Turn your long videos into short viral clips — automatically, with full control, and optional NFT ownership.**

ClipCash helps content creators (YouTubers, podcasters, gamers, coaches…) save many hours of work by turning one long video into dozens or hundreds of short clips ready for TikTok, Instagram Reels, YouTube Shorts, and more.

You always stay in control:  
→ Preview every clip  
→ Choose which ones you like  
→ Delete the bad ones  
→ Then post only the good ones automatically

**Bonus: you can also turn your best clips into NFTs on the Stellar network (very cheap & fast) so you truly own them and can earn royalties foreve**r.

## What makes ClipCash special?

- **Full preview & selection** — most tools post random clips. ClipCash lets you see and pick only the best ones.
- **Automatic posting** to 7+ platforms (TikTok, Instagram, YouTube Shorts, Facebook Reels, Snapchat Spotlight, Pinterest, LinkedIn)
- **Web2 + Web3 in one app** — normal accounts + optional Stellar NFTs with royalties
- **Simple & beautiful interface** — dark mode, clean design, easy to use

## Main Features (MVP – 2026)

- Upload long video or paste YouTube/TikTok link
- AI creates 50–200 short clips (15–60 seconds each)
- Preview screen: watch short previews, select / deselect / bulk delete
- One-click post selected clips to multiple platforms
- Earnings dashboard (shows money from all platforms)
- Optional: mint selected clips as NFTs on Stellar (Soroban smart contracts)
- Subscription plans + small revenue share (we take 5–10% only if you want)

## Tech Stack – Simple Overview

| Part           | Technology                          | Why we chose it                     |
| -------------- | ----------------------------------- | ----------------------------------- |
| Frontend       | Next.js 15 + React + Tailwind       | Fast, beautiful, mobile-friendly    |
| Backend        | NestJS (TypeScript)                 | Clean, organized, easy to grow      |
| Database       | PostgreSQL (via Supabase or Prisma) | Reliable & real-time updates        |
| Queue / Jobs   | BullMQ + Redis                      | Handles long AI & posting tasks     |
| Social Posting | Ayrshare                            | One tool posts to all platforms     |
| Blockchain     | Stellar Soroban (Rust)              | Very cheap fees, built-in royalties |
| AI             | Runway Gen-3 + Claude               | Finds the most viral moments        |

## Project Folders (very simple view)

clipcash/
├── backend/ ← The API server (NestJS)
├── frontend/ ← The website users see (Next.js)
├── contracts/ ← Stellar smart contracts (Rust)
├── docker-compose.yml ← Easy local setup (database + redis)
└── README.md ← You are reading it right now 😄
text## Quick Start (Local Development)

### 1. Requirements

- Node.js 18 or newer
- Docker (recommended for database & redis)
- Git

### 2. Clone & install

```bash
git clone https://github.com/your-username/clipcash.git
cd clipcash
3. Start everything with Docker (easiest)
Bashdocker-compose up -d
This starts:

PostgreSQL database
Redis (for background jobs)
Backend
Frontend

4. Or start manually
Backend:
Bashcd backend
cp .env.example .env
npm install
npm run start:dev
Frontend:
Bashcd frontend
cp .env.local.example .env.local
npm install
npm run dev
Open http://localhost:3000 in your browser.
Important Environment Variables
See .env.example files in backend/ and frontend/ folders.
Most important ones:
env# Backend
DATABASE_URL=postgresql://...
AYRSHARE_API_KEY=your-ayrshare-key
STELLAR_NETWORK=testnet

# Frontend
NEXT_PUBLIC_API_URL=http://localhost:3001
NEXT_PUBLIC_STELLAR_RPC=https://soroban-testnet.stellar.org
```
