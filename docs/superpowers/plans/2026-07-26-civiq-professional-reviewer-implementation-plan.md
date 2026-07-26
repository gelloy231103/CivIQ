# CivIQ Professional Reviewer Implementation Plan

Date: 2026-07-26
Source pack: 2026-2027 reviewer files from local `reviewers/new`

## Goal

Build the first usable web app foundation for CivIQ: a login-required React reviewer with shadcn-style UI, Supabase-ready data boundaries, social screens, leaderboards, protected AI explanation plumbing, and a seed Professional 2026 question set from the 2026-2027 source pack.

## Phase 1: App Foundation

- Create React + TypeScript + Vite project files in the repository root.
- Configure Tailwind CSS, path aliases, and shadcn-compatible component structure.
- Add core dependencies: React Router, Supabase client, lucide-react, class variance helpers, Radix primitives used by shadcn components.
- Add `.env.example` for Supabase and AI function configuration.
- Ignore local raw source reviewers so they are not shipped or committed accidentally.

## Phase 2: Data and Domain Model

- Add `Question`, `Choice`, `QuestionStatus`, `Attempt`, `Profile`, `Follow`, and `LeaderboardStat` types.
- Add a small verified 2026 seed dataset under `src/data/professional/2026.ts`.
- Keep the raw `reviewers/new` folder as the newest offline source of truth for future extraction.
- Add filters for year, topic, status, bookmarks, and mistakes.
- Add quiz engine helpers for sessions, answer checking, and scoring.

## Phase 3: Auth Boundary

- Create a Supabase client wrapper that reads `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
- Require login before showing the app.
- Show a clear setup-required state if Supabase env vars are missing.
- Implement email/password sign-in and sign-up UI.
- Add route guard behavior around the authenticated app shell.

## Phase 4: Reviewer Experience

- Build Dashboard, Library, Review, Quiz, Mistakes, Bookmarks, Progress, Leaderboard, Friends, and Profile pages.
- Use mobile bottom navigation and desktop sidebar navigation.
- Build the card reviewer with answer reveal, feedback, explanation, bookmark, and next/previous controls.
- Store local optimistic session state while leaving persistence behind Supabase services.

## Phase 5: Supabase Schema

- Add SQL migration file for profiles, attempts, question_progress, bookmarks, follows, leaderboard_stats, ai_explanations, and ai_usage.
- Add row-level security policies so users can mutate only their own private data.
- Expose only safe public fields for profiles and leaderboards.

## Phase 6: AI Explanation Plumbing

- Add a protected `explain-question` function scaffold.
- Check cache before calling a provider.
- Enforce per-user daily quota.
- Keep the provider interface swappable, starting with Gemini free-tier configuration.
- Return the built-in explanation if AI is unavailable.

## Phase 7: Verification

- Run TypeScript build.
- Run production build.
- Start local dev server.
- Manually inspect mobile and desktop responsive layouts.
- Confirm app does not expose raw reviewer files or AI keys.

## First Build Slice

The first build slice should deliver phases 1 through 4 plus the Supabase schema draft and AI function stub. Full PDF extraction from all reviewer files comes after the app shell is stable.
