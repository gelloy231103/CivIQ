# CivIQ

Login-required Civil Service Exam Professional reviewer for laptop and mobile web.

## Current Build

- React + TypeScript + Vite
- Tailwind CSS with shadcn-compatible components
- Supabase-ready auth, profile, follow, progress, and leaderboard boundaries
- Protected AI explanation function stub
- Generated Professional 2026 question set from the 2026-2027 reviewer source

## Local Setup

```bash
npm.cmd install
npm.cmd run dev
```

Open `http://127.0.0.1:5173/`.

Without Supabase env vars, local dev shows a setup screen with a preview mode. Real login and cross-device sync require:

```bash
VITE_SUPABASE_URL=
VITE_SUPABASE_ANON_KEY=
```

AI explanations are designed to run through a protected server function. Do not put provider keys in React client code.

For Vercel deployment, add this environment variable in the Vercel project settings:

```bash
GEMINI_API_KEY=
```
