# CivIQ

Login-required Civil Service Exam Professional reviewer for laptop and mobile web.

## Current Build

- React + TypeScript + Vite
- Tailwind CSS with shadcn-compatible components
- Supabase-ready auth, profile, follow, progress, and leaderboard boundaries
- AES-256 database-layer protection for private profile details
- Protected Gemini AI explanations with cache, quota, and safe fallback behavior
- Generated Civil Service reviewer question set from imported reviewer content
- Visual Abstract Reasoning question assets with neutral answer labels
- Smart quiz sessions: Quick 10, Focused 25, Mock 170, and resumable sessions
- Year-based answer sheets with answers visible by default
- Protected admin reviewer source uploads into private Supabase Storage

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
SUPABASE_SERVICE_ROLE_KEY=
AI_EXPLANATION_DAILY_LIMIT=10
ADMIN_EMAILS=
```

`SUPABASE_SERVICE_ROLE_KEY` is server-only. It lets the API cache AI explanations and enforce per-user daily quota. Never expose it through `VITE_` variables.
`ADMIN_EMAILS` is a comma-separated allowlist for `/admin/imports`.

## Reviewer Import

Drop source reviewers into `reviewers/new`, then inventory and extract supported text with:

```bash
python scripts/import_reviewer_sources.py reviewers/new
```

To extract the older archive reviewer folders while skipping `reviewers/new`, run:

```bash
python scripts/import_reviewer_sources.py reviewers --exclude new --out tmp/reviewer-import-archive
```

The script writes extracted text and `inventory.json` into `tmp/reviewer-import`. Generated app question data should still be reviewed before being marked verified.

Admins can also open `/admin/imports` after signing in with an allowlisted account. Uploaded reviewer sources are staged in the private `reviewer-sources` bucket and are not published to the student question bank until extracted and verified.

## Checks

```bash
npm.cmd run test
npm.cmd run build
```

## Privacy

CivIQ keeps email/password handling inside Supabase Auth. The app database uses public usernames for social search and leaderboards. Private profile details, currently display name and avatar URL, are encrypted in Supabase with `pgcrypto` using `cipher-algo=aes256`; the key is generated and stored in Supabase Vault by the privacy migration.
