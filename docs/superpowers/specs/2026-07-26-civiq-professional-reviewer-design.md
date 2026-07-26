# CivIQ Professional Reviewer Design

Date: 2026-07-26
Status: Approved for specification review

## Purpose

CivIQ is a mobile-first web reviewer for the Philippine Civil Service Exam Professional level. It turns past exam PDFs into structured practice sets with flashcard-style review, quiz mode, explanations, mistake review, bookmarks, and local progress tracking.

The first version is a free public website. It does not require accounts, a paid database, or live AI usage. Users can open it on a laptop or mobile browser, answer questions, and keep progress on the same device.

## Product Scope

### In Scope for V1

- Civil Service Exam Professional level only.
- Public website that anyone with the link can open.
- React, TypeScript, Vite, Tailwind CSS, and shadcn/ui.
- Responsive laptop and mobile web layouts.
- Question library grouped by year and topic.
- Card reviewer mode with answer reveal and explanation.
- Multiple-choice quiz mode.
- Mistake review generated from wrong answers.
- Bookmark review generated from saved questions.
- Local progress saved in the browser with LocalStorage or IndexedDB.
- PDF-to-JSON content workflow handled offline before publishing.
- Free deployment target: Vercel Hobby or Netlify Free.

### Out of Scope for V1

- User accounts and cross-device sync.
- Admin upload UI.
- Live AI-generated explanations inside the public website.
- Paid database, server API, or authentication provider.
- Subprofessional exam content.
- Payment, subscriptions, leaderboards, or social features.

These can be added later after the reviewer content and core study experience are stable.

## Recommended Setup

Use this stack for V1:

- App framework: React + TypeScript + Vite.
- UI system: Tailwind CSS + shadcn/ui.
- Icons: lucide-react.
- State: React state plus small local persistence helpers.
- Content storage: versioned JSON files in `src/data`.
- Hosting: Vercel Hobby first choice, Netlify Free second choice.
- Repository: GitHub repo connected to Vercel or Netlify for automatic deployments.

This setup keeps monthly cost at zero for a static reviewer and makes future migration to Supabase straightforward if login or cloud progress becomes necessary.

## User Experience

### Primary Navigation

The app should feel like a study tool, not a marketing page. The first screen is the dashboard.

Core areas:

- Dashboard
- Library
- Review
- Mistakes
- Bookmarks
- Progress

On mobile, use a compact bottom navigation with no more than five primary items. Less frequent destinations can live in a menu or secondary tab. On desktop, use a left sidebar with the same navigation model.

### Dashboard

The dashboard shows:

- Continue button for the latest active set.
- Overall progress for Professional content.
- Accuracy summary.
- Weakest topics.
- Quick actions for Card Review, Quiz Mode, Mistakes, and Bookmarks.
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

Users can bookmark difficult or important questions. Bookmarks persist on the same device and can be used as a study filter.

### Progress

Progress should include:

- Total questions attempted.
- Overall accuracy.
- Accuracy by topic.
- Completion by year.
- Mistake count.
- Bookmark count.

The visual treatment should use simple progress bars and compact stat rows rather than complex charts.

## Content Model

Questions are stored as JSON. Each question should include:

```json
{
  "id": "cse-pro-2024-q001",
  "examLevel": "professional",
  "year": 2024,
  "source": "uploaded-pdf-name.pdf",
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

## PDF Import Workflow

PDF processing is not handled by the public website in V1. The safer workflow is offline:

1. User provides a PDF for a specific year.
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
    layout/
    reviewer/
    quiz/
    progress/
    library/
    ui/
  data/
    professional/
      index.ts
      2024.json
  lib/
    question-model.ts
    progress-store.ts
    quiz-engine.ts
    filters.ts
  pages/
    DashboardPage.tsx
    LibraryPage.tsx
    ReviewPage.tsx
    QuizPage.tsx
    MistakesPage.tsx
    BookmarksPage.tsx
    ProgressPage.tsx
```

Key modules:

- `question-model`: shared TypeScript types and validation helpers.
- `progress-store`: browser persistence for attempts, bookmarks, and settings.
- `quiz-engine`: session creation, answer checking, scoring, and result summaries.
- `filters`: reusable year, topic, status, mistake, and bookmark filtering.

Keep content data separate from UI so new PDF years can be added without rewriting reviewer logic.

## Data Flow

1. App loads verified question JSON files.
2. User selects a study path from Dashboard, Library, Mistakes, or Bookmarks.
3. Quiz engine creates a session from filtered questions.
4. User answers questions.
5. Progress store records attempts, correctness, bookmarks, and mistake status.
6. Dashboard and Progress views read the saved data and update summaries.

## Error Handling

- If no questions match a filter, show an empty state with a direct action to change filters.
- If local progress data is corrupted, reset only the invalid progress data and keep content available.
- If a question is missing answer or explanation data, exclude it from normal practice and show it only in development checks.
- If browser storage is unavailable, allow practice to continue for the session and show a small warning that progress will not be saved.

## Testing and Verification

Minimum checks for V1:

- TypeScript build passes.
- Static app builds with Vite.
- Question JSON validates against the TypeScript schema.
- Quiz scoring returns correct totals.
- Wrong answers appear in Mistakes.
- Bookmarks persist after reload.
- Dashboard progress updates after practice.
- Responsive layout works at 375px, 768px, 1024px, and 1440px.
- Keyboard navigation works for core buttons, choices, tabs, and dialogs.

Manual QA should include mobile browser testing because this app will be used heavily on phones.

## Future Enhancements

After V1 works:

- Supabase accounts for progress sync.
- Admin upload and review dashboard.
- Spaced repetition scheduling.
- Timed mock exam mode.
- Offline PWA install support.
- Search across all questions.
- Import/export progress.
- Optional AI explanation assistant with usage controls.

## Approval Notes

Approved decisions from the initial discussion:

- Target exam: Civil Service Exam Professional.
- First version: free public website.
- Main experience: Gizmo-like card reviewer plus quiz practice.
- Stack: React JS with shadcn/ui.
- Content source: PDFs supplied by the user over time.
- Answers and explanations must be verified; uncertain items are flagged instead of guessed.
