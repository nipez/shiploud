# ShipLoud Landing

Waitlist landing page for ShipLoud — build-in-public engine for indie hackers.

Stack: Vite + React + TypeScript + Tailwind CSS v4.

## Setup

    npm install

## Develop

    npm run dev

Open the URL Vite prints (usually http://localhost:5173).

## Build

    npm run build

Preview:

    npm run preview

## Waitlist

Form posts to `https://shiploud-api.nickperez.workers.dev/api/waitlist` (D1 `waitlist` table).
Duplicates are ignored gracefully; UI always shows success on ok.

## Admin waitlist

Gated at `/admin` and `/admin/waitlist`. Passphrase login (`POST /api/login`) stores a token in sessionStorage, then `GET /api/waitlist` (admin only).

