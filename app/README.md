# ShipLoud dogfood app

Internal MVP for Nicholas (@dreamandbuildit) to dogfood before pitching.

## Features

1. **Journal** — ship notes, then pick a short draft and post (or copy)
2. **Feed** — radar + anything queued
3. **Reply radar** — **Reply on X** opens x.com compose with the draft prefilled (X blocks apps from sending replies). After you post, tap **I posted it**. Copy stays as backup.
4. **Connect X** — OAuth 2.0 PKCE in Setup / ⋯. **Post to X** on Journal drafts still uses the API. Feed replies use the web intent, not the API.

Data persists in `localStorage` (key: `shiploud-dogfood-v0`). No auth.

**Generate drafts from journal** uses deterministic templates (not a real LLM) so we can swap AI later.

## Stack

Vite + React + TypeScript + Tailwind v4 (same dark + electric lime language as the landing).

## Run

```bash
cd /workspace/shiploud-app
npm install
npm run dev
```

Dev server: **http://0.0.0.0:5174/** (port 5174 so landing can keep 5173).

```bash
npm run build   # production build → dist/
npm run preview # preview production build on 5174
```

## How to use

1. Open **Journal** — Day 1 journal is seeded (landing shipped, X login blocked, ~8 followers, $0 MRR). Edit + save.
2. Hit **Make drafts** — short options appear on the same page. Pick one, then Post to X or Copy.
3. In **Feed** — **Your feed** (live public posts from Setup favorites). Type a reply, then **Reply on X** (opens X with your text ready). Come back and tap **I posted it**.
4. **Reset seed** in the header restores Day 1 data.

## Seed drafts

Three exact Day 1 posts are preloaded (landing URL, timeline confession, Project #1 Day 1 metrics).
