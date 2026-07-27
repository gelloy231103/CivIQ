# CivIQ Social, Auth, and Theme Polish Design

Date: 2026-07-27

## Goal

Polish the account and social experience so CivIQ feels ready for real users: friends should require mutual connection before competition, email users should be able to reset passwords, and the interface should support light, dark, and system themes.

## Friends and Leaderboards

The Friends page continues to show searchable CivIQ profiles excluding the signed-in user. Each profile row shows a clearer identity stack: display name, username, and friendship state. The action label depends on follow direction:

- `Follow`: neither mutual nor outgoing follow.
- `Follow back`: the other user follows the signed-in user, but the signed-in user does not follow them yet.
- `Following`: the signed-in user follows them, but they have not followed back.
- `Friends`: both users follow each other.

The Friends leaderboard includes only the signed-in user and mutual friends. One-way follows no longer create competition access.

## Password Reset

The login page includes a `Forgot password?` action for email/password accounts. The user enters an email address and Supabase sends the password recovery email with a redirect to `/reset-password`.

The `/reset-password` route shows new password and confirm password fields. The form validates minimum length and matching values before calling Supabase password update. After success, the user is guided back into the app.

Google users are handled by copy: password reset is for email/password accounts, while Google account recovery stays with Google.

## Theme

CivIQ supports three theme choices: light, dark, and system. The theme is saved locally as `civiq-theme-v1`, applied by toggling the `dark` class on `document.documentElement`, and reacts to OS preference when set to system.

The quick control appears in the app shell profile area. Profile settings also include the same theme choice so users can find it later.

## Testing

Validation covers TypeScript build and existing tests. Manual checks should include `/friends`, `/leaderboard`, `/login`, `/reset-password`, light mode, dark mode, and mobile shell layout.
