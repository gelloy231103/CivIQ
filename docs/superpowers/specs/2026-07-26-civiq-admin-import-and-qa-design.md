# CivIQ Admin Import and QA Design

## Scope

This slice completes the remaining production checks for Google login and live AI explanations, then adds a protected reviewer-source import workspace and automated regression tests.

## Verification

- Google login QA checks that Supabase's Google OAuth endpoint redirects to Google for the production callback.
- AI QA creates a temporary confirmed Supabase user, calls the live Vercel AI endpoint with a real Supabase access token, verifies provider output, verifies cache reuse on a second request, and deletes the temporary user.

## Admin Access

- Admin access is enforced on server endpoints with `ADMIN_EMAILS`.
- The client can open `/admin/imports`, but every load and upload action must pass the server-side allowlist check.
- The admin email is configuration, not a client-side security boundary.

## Import Workflow

- Admin selects a reviewer year and chooses one or more source files.
- The server creates a private import batch and file records, then returns signed Supabase Storage upload tokens only for supported files.
- The browser uploads files directly to the private `reviewer-sources` bucket with signed upload URLs.
- The server marks files as uploaded or failed after the browser reports completion.
- Uploaded sources are not published into the public question bank. They remain staged for extraction and human verification.

## Data Model

- `reviewer_import_batches` stores year, title, status, counts, creator, and timestamps.
- `reviewer_import_files` stores original filename, storage path, extension, size, support status, upload status, and timestamps.
- The storage bucket is private. Public users do not receive source paths or source files.

## UI

- `/admin/imports` uses the existing CivIQ dashboard visual language: compact cards, clear labels, upload progress, status badges, and empty states.
- Regular users see a concise access-denied state.
- Admins see recent batches and per-file upload status.

## Tests

- Unit tests cover study selection parsing, session merge/resume helpers, AI fallback/provider parsing, admin allowlist checks, and reviewer file support classification.
- `npm run test` is added alongside the existing production build.
