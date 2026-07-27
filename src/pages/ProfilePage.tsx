import { LogOut, RotateCcw, Save } from "lucide-react";
import { useEffect, useState, type FormEvent, type ReactNode } from "react";
import { ThemeSegmentedControl } from "@/components/layout/ThemeToggle";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat } from "@/lib/leaderboard-service";
import { buildProgressSnapshot } from "@/lib/progress-service";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";
import { formatPercent } from "@/lib/utils";

export function ProfilePage() {
  const { profile, signOut, isPreview, updateProfile } = useAuth();
  const { attempts, bookmarkedIds, followedIds, mutualFriendIds, resetPreviewProgress } = useStudy();
  const [displayName, setDisplayName] = useState(profile?.displayName ?? "");
  const [username, setUsername] = useState(profile?.username ?? "");
  const [avatarUrl, setAvatarUrl] = useState(profile?.avatarUrl ?? "");
  const [visibility, setVisibility] = useState(profile?.visibility ?? "friends");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const snapshot = buildProgressSnapshot(attempts, bookmarkedIds);
  const stat = calculateLeaderboardStat(profile?.id ?? "preview-user", attempts, verifiedProfessionalQuestions.length);
  const initials = profile?.displayName.slice(0, 2).toUpperCase() ?? "CI";

  useEffect(() => {
    setDisplayName(profile?.displayName ?? "");
    setUsername(profile?.username ?? "");
    setAvatarUrl(profile?.avatarUrl ?? "");
    setVisibility(profile?.visibility ?? "friends");
  }, [profile]);

  async function saveSettings(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setMessage(null);
    setError(null);
    const nextError = await updateProfile({
      displayName,
      username,
      avatarUrl,
      visibility
    });
    setSaving(false);
    if (nextError) {
      setError(nextError);
      return;
    }
    setMessage("Profile saved.");
  }

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
            {profile?.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.displayName} /> : null}
            <AvatarFallback className="text-lg">{initials}</AvatarFallback>
          </Avatar>
          <div className="min-w-0">
            <CardTitle className="truncate text-2xl">{profile?.displayName}</CardTitle>
            <CardDescription>@{profile?.username}</CardDescription>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Badge variant="muted">{profile?.visibility ?? "friends"} visibility</Badge>
            {isPreview ? <Badge variant="outline">local preview</Badge> : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-5">
            <Metric label="Score" value={stat.score} />
            <Metric label="Accuracy" value={formatPercent(snapshot.accuracy)} />
            <Metric label="Following" value={followedIds.size} />
            <Metric label="Friends" value={mutualFriendIds.size} />
            <Metric label="Bookmarks" value={bookmarkedIds.size} />
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <Button asChild variant="outline">
              <Link to="/progress">View progress</Link>
            </Button>
            {isPreview ? (
              <Button variant="outline" onClick={resetPreviewProgress}>
                <RotateCcw aria-hidden="true" />
                Reset preview
              </Button>
            ) : null}
            <Button variant="destructive" onClick={signOut}>
              <LogOut aria-hidden="true" />
              Sign out
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Profile settings</CardTitle>
          <CardDescription>These details control your CivIQ identity and leaderboard visibility.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4" onSubmit={saveSettings}>
            <Field htmlFor="profile-display-name" label="Display name">
              <Input
                id="profile-display-name"
                value={displayName}
                onChange={(event) => setDisplayName(event.target.value)}
                autoComplete="name"
                required
              />
            </Field>
            <Field htmlFor="profile-username" label="Username">
              <Input
                id="profile-username"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
                autoComplete="username"
                inputMode="text"
                required
              />
              <p className="text-xs font-semibold text-muted-foreground">Letters, numbers, and underscores only.</p>
            </Field>
            <Field htmlFor="profile-avatar-url" label="Avatar URL">
              <Input
                id="profile-avatar-url"
                value={avatarUrl}
                onChange={(event) => setAvatarUrl(event.target.value)}
                autoComplete="url"
                inputMode="url"
                placeholder="https://..."
              />
            </Field>
            <Field htmlFor="profile-visibility" label="Leaderboard visibility">
              <select
                id="profile-visibility"
                value={visibility}
                onChange={(event) => setVisibility(event.target.value === "global" ? "global" : "friends")}
                className="flex h-11 w-full rounded-md border border-input bg-card px-3 py-2 text-base text-foreground shadow-sm transition-colors md:text-sm"
              >
                <option value="friends">Friends only</option>
                <option value="global">Global leaderboard</option>
              </select>
            </Field>
            <Field htmlFor="profile-theme" label="Theme">
              <ThemeSegmentedControl id="profile-theme" />
            </Field>
            {error ? <p className="text-sm font-semibold text-destructive" role="alert">{error}</p> : null}
            {message ? <p className="text-sm font-semibold text-success" aria-live="polite">{message}</p> : null}
            <Button className="w-full sm:w-fit" type="submit" disabled={saving}>
              <Save aria-hidden="true" />
              {saving ? "Saving" : "Save profile"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}

function Field({ htmlFor, label, children }: { htmlFor: string; label: string; children: ReactNode }) {
  return (
    <div className="grid gap-2">
      <Label htmlFor={htmlFor}>{label}</Label>
      {children}
    </div>
  );
}
