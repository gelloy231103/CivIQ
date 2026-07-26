# CivIQ Study Session Flow Design

Date: 2026-07-26
Status: Ready for user review

## Purpose

This design improves the reviewer and quiz flow so users are not overloaded by the full 2026 question bank. The app should make users choose a year first, give them smaller practice choices, let them review all answers when they want to read, and let them resume unfinished quiz sessions across devices.

## Decisions

- Keep the full imported library available by year.
- Remove the generic all-question "current set" behavior from normal entry points.
- Require a year selection before Review or Quiz starts.
- Add Review All Answers for a selected year or topic, with answers and explanations visible by default.
- Remove the timer from normal Review mode.
- Keep timers for Quiz, Quick Practice, Focused Session, and Mock Exam.
- Add resumable quiz sessions for logged-in users.

## Recommended Approach

Use a year-first Library as the main decision point. Each year card should show total question count, topic counts, progress, and clear study actions:

- Review All Answers: read all questions, correct answers, and explanations without pressure.
- Quick Practice: 10 questions.
- Focused Session: 25 questions, preferably by topic.
- Mock Exam: 170 questions using professional exam timing.
- Continue Session: shown when an unfinished session exists for that year or topic.

This keeps the 567-question bank useful without making the first action feel too large.

## Alternatives Considered

### Single Full-Year Quiz

This is simple, but it forces users into hundreds of questions at once. It is time consuming, especially on mobile, and makes abandonment more likely.

### Topic-Only Practice

This reduces overload but hides the year-based reviewer model the user expects. It also makes mock exam flow less obvious.

### Smart Sessions With Year-First Library

This is the recommended approach. It keeps the full year visible, but turns study into smaller, intentional sessions.

## User Experience

### Library

The Library remains the starting point for study. It should show year cards, not a generic current set. Each year card shows the number of questions and topic chips with counts.

Primary action should be a 25-question focused session. Secondary actions should include Quick Practice, Mock Exam, and Review All Answers.

### Review All Answers

Review All Answers is a reading mode. It shows every selected question in a scrollable list. Each item displays:

- Question number.
- Year and topic badges.
- Question text and image if present.
- Choices.
- Correct answer highlighted.
- Explanation visible by default.
- Bookmark button.

It does not record quiz attempts unless the user explicitly answers in a practice mode. It does not show a timer.

### Normal Review

Normal Review remains one question at a time, but it should focus on learning. The timer is removed. A user chooses an answer to reveal feedback and explanation, then moves next or previous.

### Quiz Sessions

Quiz modes should create a persistent active session. The session stores:

- User id.
- Selection key, including year, topic if present, and mode.
- Ordered question ids.
- Current question index.
- Selected answers.
- Started timestamp.
- Last updated timestamp.
- Finished timestamp if completed.

When a user opens the same quiz again, the app should show Continue Session and Start Over. Continue restores the saved index and answers. Start Over creates a new session.

### Session Types

Quick Practice uses 10 questions.

Focused Session uses 25 questions. If the user selected a topic, it uses only that topic. If the user selected a year without a topic, it should mix topics from that year.

Mock Exam uses 170 questions and applies the full exam timer.

## Data Flow

Use local storage for immediate resume on the same device. For logged-in users, sync active sessions to Supabase so the same session can continue on laptop or mobile.

The frontend should read local state first for speed, then merge or replace with the freshest remote session by `last_updated_at`. Completed sessions stay as historical records or can be hidden from the active session list.

Existing attempts continue to be saved when answers are selected. Session progress is separate from attempts so a quiz can resume even before it is finished.

## Supabase

Add a `quiz_sessions` table with row-level security:

- Users can select, insert, update, and delete only their own sessions.
- Session answer data is owned by the signed-in user.
- No public access.

Suggested columns:

- `id uuid primary key`
- `user_id uuid not null references auth.users(id) on delete cascade`
- `selection_key text not null`
- `mode text not null`
- `question_ids text[] not null`
- `current_index integer not null default 0`
- `answers jsonb not null default '{}'::jsonb`
- `started_at timestamptz not null default now()`
- `last_updated_at timestamptz not null default now()`
- `finished_at timestamptz`

Add a unique partial index so each user has one unfinished session for the same `selection_key` and `mode`.

## Error Handling

If remote session loading fails, the app should keep the local session and allow the user to continue. If remote saving fails, show a quiet sync warning and retry on the next update. If a question id no longer exists after a content update, skip it and keep the rest of the session usable.

## Testing

Manual tests should cover:

- Opening `/review` or `/quiz` without a year sends the user to Library or asks them to choose a year.
- Review All Answers shows answers by default.
- Normal Review has no timer.
- Quiz answer selection saves session progress.
- Refreshing the quiz resumes the same index and answers.
- Starting over clears the active unfinished session.
- A logged-in user can resume the same quiz after opening the site on another browser.
- Finished quizzes show results and no longer appear as active sessions.

## Implementation Notes

Keep the implementation close to the current app structure:

- Extend `study-selection.ts` for session path helpers and year-required validation.
- Add a small session service for local and Supabase persistence.
- Keep `QuizPage` responsible for quiz UI, but move persistence logic out of the component.
- Add a dedicated `AnswerReviewPage` or mode-specific renderer for Review All Answers.
- Update `LibraryPage` actions to make session sizes clear.

