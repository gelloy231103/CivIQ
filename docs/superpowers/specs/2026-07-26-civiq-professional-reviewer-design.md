# CivIQ Professional Reviewer Design

Date: 2026-07-26
Status: Approved for revised specification review

## Purpose

CivIQ is a mobile-first social web reviewer for the Philippine Civil Service Exam Professional level. It turns past exam PDFs into structured practice sets with flashcard-style review, quiz mode, explanations, mistake review, bookmarks, synced progress, profiles, follows, and friend leaderboards.

The revised first version requires login before the reviewer can be used. Users can open the site on a laptop or mobile browser, sign in, answer questions, sync progress across devices, follow friends, compare leaderboard results, and request protected live AI explanations when free-tier quota is available.

The first content source is the local `reviewers/` folder. The newest source material is now inside `reviewers/new`, with reviewer packs labeled for 2026-2027. The document date is the project/spec date only and must not be treated as the latest exam-source year.

Current local source inventory includes new reviewer packs such as `reviewers/new/CSE 2026-2027 EXAMS AND ANSWERS SHEET-20260726T100724Z-1-001` and `reviewers/new/CSE Reviewers 2026 Compilation 1-20260726T100725Z-1-001`. Older 2022 reviewer packs remain useful as fallback or archive material. The folder contains mixed source formats, including PDFs, DOC/DOCX files, images, CHM files, DJVU files, and text. V1 should prioritize the 2026-2027 files, then clearly mark any extracted item that cannot be verified.

## Product Scope

### In Scope for V1

- Civil Service Exam Professional level only.
- Login required before accessing reviewer content.
- React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- Responsive laptop and mobile web layouts.
- Supabase Auth for sign up, sign in, session handling, and account identity.
- Supabase Postgres for profiles, synced progress, follows, attempts, bookmarks, mistakes, and leaderboard stats.
- Question library grouped by year and topic.
- Initial content source from local `reviewers/new` files, with the latest reviewer pack labeled 2026-2027.
- Card reviewer mode with answer reveal and explanation.
- Multiple-choice quiz mode.
- Mistake review generated from wrong answers.
- Bookmark review generated from saved questions.
- Cross-device progress sync after login.
- User profiles with display name, avatar, streak, accuracy, completed questions, and joined date.
- Follow system for friend connections.
- Friend leaderboard for followed users.
- Optional global leaderboard view if privacy settings allow it.
- Live AI explanation button protected by server-side API calls, per-user limits, and cached responses.
- PDF-to-JSON content workflow handled offline before publishing.
- Free-friendly deployment target: Vercel Hobby for the app and Supabase Free for auth/database.

### Out of Scope for V1

- Admin upload UI.
- Unlimited AI usage.
- Direct AI API calls from the browser.
- Paid database guarantees, daily backups, or production SLA.
- Subprofessional exam content.
- Payment, subscriptions, classroom management, or group invitations.
- Real-time chat or messaging.

These can be added later after the social reviewer and core study experience are stable.

## Recommended Setup

Use this stack for V1:

- App framework: React + TypeScript + Vite.
- UI system: Tailwind CSS + shadcn/ui.
- Icons: lucide-react.
- Authentication: Supabase Auth.
- Database: Supabase Postgres with row-level security.
- Server functions: Supabase Edge Functions or Vercel Functions for protected AI calls.
- AI provider: start with Gemini free-tier API if available in the deployment region and account.
- State: React state plus Supabase-backed data hooks.
- Content storage: versioned JSON files in `src/data`.
- Hosting: Vercel Hobby first choice, Netlify Free second choice.
- Repository: GitHub repo connected to Vercel or Netlify for automatic deployments.

This setup targets zero monthly cost while usage is small, but it is not unlimited. Supabase Free has storage, bandwidth, inactivity, and backup limitations. Free AI tiers can change, throttle requests, or become unavailable. The app must treat AI as an enhanced feature with daily limits and cached explanations, while built-in explanations remain the reliable study content.

## User Experience

### Primary Navigation

The app should feel like a study tool, not a marketing page. The first screen is login. After login, the first app screen is the dashboard.

Core areas:

- Dashboard
- Library
- Review
- Mistakes
- Bookmarks
- Progress
- Leaderboard
- Friends
- Profile

On mobile, use a compact bottom navigation with no more than five primary items: Dashboard, Library, Review, Leaderboard, and Profile. Mistakes, Bookmarks, Progress, and Friends can live inside Dashboard/Profile tabs or a menu. On desktop, use a left sidebar with the same navigation model and room for secondary destinations.

### Auth and Onboarding

Users must sign in before using the app. Supported V1 auth methods:

- Email/password.
- Optional Google sign-in if configured in Supabase.

After first sign-in, the user completes a short profile setup:

- Display name.
- Optional avatar.
- Required unique username handle.
- Leaderboard visibility preference: friends only or global.

The app should create a profile row automatically when a Supabase auth user is created.

### Dashboard

The dashboard shows:

- Continue button for the latest active set.
- Overall progress for Professional content.
- Accuracy summary.
- Weakest topics.
- Quick actions for Card Review, Quiz Mode, Mistakes, and Bookmarks.
- Current streak.
- Friend leaderboard preview.
- Recently studied year or topic.

The dashboard should be dense but calm: clear numbers, small charts or progress bars, and no decorative landing-page hero.

### Library

The library groups content by:

- Year
- Topic
- Difficulty or status, if available
- Completion state

Each year card shows question count, completion, accuracy, and whether answers or explanations still need verification.

### Card Reviewer

Card reviewer mode is the Gizmo-like study surface:

- One question at a time.
- Choices shown as large tappable options.
- User can choose an answer or reveal the answer.
- After answering, show correct answer, short feedback, and explanation.
- Controls for next, previous, bookmark, and mark for review.
- Optional topic/year filter before starting a session.

The card should be stable in size across state changes so answer feedback does not cause jumpy layout.

### Quiz Mode

Quiz mode supports:

- Untimed practice by default.
- Question count selector.
- Filters by year, topic, bookmarked, or mistakes.
- End-of-quiz results summary.
- Review screen showing wrong answers with explanations.

Timed mock exams are not part of V1 and belong in a later release.

### Mistakes

Mistake review automatically collects questions answered incorrectly. A question remains in mistakes until the user answers it correctly enough times in later practice. V1 can use a simple rule: remove from active mistakes after two correct attempts.

### Bookmarks

Users can bookmark difficult or important questions. Bookmarks sync to the user's account and can be used as a study filter on laptop and mobile.

### Progress

Progress should include:

- Total questions attempted.
- Overall accuracy.
- Accuracy by topic.
- Completion by year.
- Mistake count.
- Bookmark count.
- Current streak.
- Leaderboard score.

The visual treatment should use simple progress bars and compact stat rows rather than complex charts.

### Profiles

Each user has a profile with:

- Display name.
- Username handle.
- Avatar URL or initials fallback.
- Overall accuracy.
- Completed question count.
- Current streak.
- Best streak.
- Public/friend-only leaderboard visibility.

Profiles should not expose email addresses to other users.

### Friends and Follows

V1 uses a follow model:

- A user can search for another user by username or display name.
- A user can follow or unfollow another profile.
- The friend leaderboard shows the signed-in user and profiles they follow.
- Followers/following counts can appear on the profile page.

This avoids the complexity of mutual friend requests in V1 while still supporting friend competition.

### Leaderboards

V1 leaderboard modes:

- Friends: signed-in user plus followed users.
- Global: users who opted into global visibility.

Ranking should be based on a simple score that is hard to inflate:

```text
score = unique_verified_correct_questions + streak_bonus + quiz_completion_bonus
```

The implementation should store score components separately so the scoring formula can change later without losing raw study history.

Leaderboard rows should show:

- Rank.
- Display name and avatar.
- Score.
- Accuracy.
- Completed questions.
- Current streak.

### AI Explanations

The app includes a live AI explanation button after the user answers a question. This is an enhanced feature, not the source of truth.

Rules:

- AI calls must go through a server-side function.
- AI API keys must never be exposed in React client code.
- Each user gets a small daily quota, such as 10 AI explanations per day.
- AI responses are cached by question, selected answer, and prompt version.
- If a cached explanation exists, return it before calling the AI provider.
- If quota is exhausted or the provider fails, show the built-in explanation and a clear unavailable state.
- Built-in verified explanations remain the reliable fallback.
- AI explanations must not change the official answer.

The initial provider can be Gemini free-tier API if available. The architecture should keep the provider behind a small service interface so OpenAI or another model can be swapped in later.

## Content Model

Questions are stored as JSON. Each question should include:

```json
{
  "id": "cse-pro-2026-q001",
  "examLevel": "professional",
  "year": 2026,
  "source": "reviewers/new/CSE 2026-2027 EXAMS AND ANSWERS SHEET-20260726T100724Z-1-001/CSE 2026-2027 EXAMS AND ANSWERS SHEET/Civil Service Exam Reviewer for 2026.pdf",
  "topic": "Verbal Ability",
  "question": "Question text goes here.",
  "choices": [
    { "id": "A", "text": "Choice A" },
    { "id": "B", "text": "Choice B" },
    { "id": "C", "text": "Choice C" },
    { "id": "D", "text": "Choice D" }
  ],
  "answer": "A",
  "explanation": "Short explanation of why A is correct.",
  "feedback": {
    "correct": "Good. This answer matches the key idea.",
    "incorrect": "Review the wording carefully and compare the choices."
  },
  "status": "verified"
}
```

Allowed statuses:

- `draft`: extracted but not reviewed.
- `needs_answer`: no answer key found.
- `needs_explanation`: answer exists but explanation is missing.
- `verified`: answer and explanation are ready for users.

Only verified questions should appear in normal practice by default. Draft or incomplete items can appear in a maintainer-only checklist during development.

## Database Model

Supabase stores user-owned and social data. Suggested tables:

### `profiles`

- `id`: UUID, same as Supabase auth user id.
- `username`: unique text handle.
- `display_name`: text.
- `avatar_url`: nullable text.
- `visibility`: `friends` or `global`.
- `created_at`: timestamp.

### `attempts`

- `id`: UUID.
- `user_id`: profile id.
- `question_id`: content question id.
- `selected_choice`: choice id.
- `is_correct`: boolean.
- `mode`: `review` or `quiz`.
- `answered_at`: timestamp.

### `question_progress`

- `user_id`: profile id.
- `question_id`: content question id.
- `attempt_count`: number.
- `correct_count`: number.
- `incorrect_count`: number.
- `last_answered_at`: timestamp.
- `mistake_active`: boolean.

### `bookmarks`

- `user_id`: profile id.
- `question_id`: content question id.
- `created_at`: timestamp.

### `follows`

- `follower_id`: profile id.
- `following_id`: profile id.
- `created_at`: timestamp.

### `leaderboard_stats`

- `user_id`: profile id.
- `score`: number.
- `accuracy`: number.
- `completed_questions`: number.
- `current_streak`: number.
- `best_streak`: number.
- `updated_at`: timestamp.

### `ai_explanations`

- `id`: UUID.
- `question_id`: content question id.
- `selected_choice`: nullable choice id.
- `prompt_version`: text.
- `provider`: text.
- `explanation`: text.
- `created_at`: timestamp.

### `ai_usage`

- `user_id`: profile id.
- `usage_date`: date.
- `request_count`: number.

Use Supabase row-level security so users can read and update only their own attempts, progress, bookmarks, and AI usage. Public profile and leaderboard reads should expose only non-sensitive fields.

## PDF Import Workflow

PDF processing is not handled by the public website in V1. The safer workflow is offline:

1. Read source files from the local `reviewers/new` folder, starting with the 2026-2027 reviewer sets.
2. Extract question text and choices.
3. Normalize the content into the JSON schema.
4. Detect or manually add answers.
5. Add concise explanations and feedback.
6. Mark items as `verified` only after review.
7. Add the JSON file to the app and redeploy.

If a PDF does not include answer keys, answers must be marked `needs_answer` until verified. The app must not invent correct answers.

## Visual Direction

CivIQ should feel focused, trustworthy, and practical for exam preparation.

Design tokens:

- Primary blue: `#2563EB`
- Accent gold: `#F59E0B`
- Correct green: `#16A34A`
- Incorrect red: `#DC2626`
- Background: `#EFF6FF`
- Foreground: `#0F172A`
- Muted surface: `#F1F5FD`
- Border: `#E4ECFC`

Typography:

- Use Plus Jakarta Sans for interface, questions, and dashboard text.
- Keep body text at 16px or larger.
- Use strong but restrained headings inside app panels.

Component style:

- Use shadcn buttons, cards, tabs, dialogs, sheets, progress, badges, select, and toast.
- Use lucide-react icons for navigation and actions.
- Keep tap targets at least 44px high.
- Use visible keyboard focus states.
- Avoid nested cards and marketing-style hero sections.

Signature interaction:

- The review card should feel like the center of the app: calm, readable, and quick to operate. Correct and incorrect feedback should animate subtly, but content should remain stable and accessible.

## Architecture

Suggested folders:

```text
src/
  app/
    App.tsx
    routes.tsx
  components/
    auth/
    layout/
    reviewer/
    quiz/
    progress/
    library/
    social/
    leaderboard/
    profile/
    ui/
  data/
    professional/
      index.ts
      2026.ts
  lib/
    supabase.ts
    auth.ts
    question-model.ts
    quiz-engine.ts
    filters.ts
    progress-service.ts
    leaderboard-service.ts
    social-service.ts
    ai-explanations.ts
  pages/
    LoginPage.tsx
    DashboardPage.tsx
    LibraryPage.tsx
    ReviewPage.tsx
    QuizPage.tsx
    MistakesPage.tsx
    BookmarksPage.tsx
    ProgressPage.tsx
    LeaderboardPage.tsx
    FriendsPage.tsx
    ProfilePage.tsx
  functions/
    explain-question/
```

Key modules:

- `supabase`: Supabase client initialization and environment checks.
- `auth`: session handling, route guards, and profile bootstrap.
- `question-model`: shared TypeScript types and validation helpers.
- `quiz-engine`: session creation, answer checking, scoring, and result summaries.
- `filters`: reusable year, topic, status, mistake, and bookmark filtering.
- `progress-service`: Supabase reads/writes for attempts, progress, mistakes, and bookmarks.
- `leaderboard-service`: score calculation and leaderboard queries.
- `social-service`: profile search and follow/unfollow actions.
- `ai-explanations`: client wrapper for the protected AI explanation function.

Keep content data separate from UI so new PDF years can be added without rewriting reviewer logic.

## Data Flow

1. User opens the app and signs in.
2. App validates the Supabase session and loads the user's profile.
3. App loads verified question JSON files.
4. App loads synced progress, bookmarks, mistakes, follows, and leaderboard stats.
5. User selects a study path from Dashboard, Library, Mistakes, or Bookmarks.
6. Quiz engine creates a session from filtered questions.
7. User answers questions.
8. Progress service writes attempts, correctness, bookmarks, and mistake status to Supabase.
9. Leaderboard stats update from the user's saved progress.
10. Dashboard, Progress, Profile, and Leaderboard views read the synced data.
11. When requested, AI explanation service checks cache and quota before calling the provider.

## Error Handling

- If no questions match a filter, show an empty state with a direct action to change filters.
- If the user is signed out, redirect to login and preserve the intended destination where practical.
- If profile creation fails, keep the user on onboarding with a retry action.
- If Supabase is temporarily unavailable, show a clear sync error and avoid pretending progress saved.
- If a question is missing answer or explanation data, exclude it from normal practice and show it only in development checks.
- If AI quota is exhausted, show the built-in explanation and explain that AI explanations are unavailable for the day.
- If the AI provider fails, show the cached or built-in explanation.
- If a leaderboard query fails, keep the study flow usable and show a retry state only on the leaderboard surface.

## Testing and Verification

Minimum checks for V1:

- TypeScript build passes.
- Static app builds with Vite.
- Question JSON validates against the TypeScript schema.
- Login, logout, and protected routes work.
- New users receive a profile row.
- Supabase row-level security prevents reading another user's private attempts and bookmarks.
- Quiz scoring returns correct totals.
- Wrong answers appear in Mistakes.
- Bookmarks persist after reload and across another browser session after login.
- Dashboard progress updates after practice and after reloading.
- Follow and unfollow actions update the friend leaderboard.
- Global leaderboard only includes users who opted into global visibility.
- AI explanation calls respect quota, return cached explanations, and never expose API keys to the browser.
- Responsive layout works at 375px, 768px, 1024px, and 1440px.
- Keyboard navigation works for core buttons, choices, tabs, and dialogs.

Manual QA should include mobile browser testing because this app will be used heavily on phones.

## Future Enhancements

After V1 works:

- Admin upload and review dashboard.
- Spaced repetition scheduling.
- Timed mock exam mode.
- Offline PWA install support.
- Search across all questions.
- Import/export progress.
- Mutual friend requests.
- Group leaderboards or classroom cohorts.
- Paid AI provider fallback if free-tier limits become too restrictive.

## Approval Notes

Approved decisions from the initial discussion:

- Target exam: Civil Service Exam Professional.
- Revised first version: login-required website.
- Main experience: Gizmo-like card reviewer plus quiz practice.
- Stack: React JS with shadcn/ui.
- Content source: local `reviewers/new` folder, starting with the available 2026-2027 reviewer packs.
- Latest available source pack: 2026-2027.
- Answers and explanations must be verified; uncertain items are flagged instead of guessed.
- Required V1 additions: accounts, cross-device sync, profiles, follows, friend leaderboards, and protected AI explanations.
- Free-tier target: Vercel Hobby, Supabase Free, and Gemini free-tier where available.
