import { LogOut, RotateCcw } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat } from "@/lib/leaderboard-service";
import { buildProgressSnapshot } from "@/lib/progress-service";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";
import { formatPercent } from "@/lib/utils";

export function ProfilePage() {
  const { profile, signOut, isPreview } = useAuth();
  const { attempts, bookmarkedIds, followedIds, resetPreviewProgress } = useStudy();
  const snapshot = buildProgressSnapshot(attempts, bookmarkedIds);
  const stat = calculateLeaderboardStat(profile?.id ?? "preview-user", attempts, verifiedProfessionalQuestions.length);
  const initials = profile?.displayName.slice(0, 2).toUpperCase() ?? "CI";

  return (
    <div className="space-y-5">
      <Card>
        <CardHeader className="flex-row items-center gap-4 space-y-0">
          <Avatar className="h-16 w-16">
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
          <div className="grid gap-3 sm:grid-cols-4">
            <Metric label="Score" value={stat.score} />
            <Metric label="Accuracy" value={formatPercent(snapshot.accuracy)} />
            <Metric label="Following" value={followedIds.size} />
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
