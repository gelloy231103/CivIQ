import { ArrowRight, BookMarked, Brain, Medal, Target } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat, sampleFriends, sampleFriendStats } from "@/lib/leaderboard-service";
import { buildProgressSnapshot } from "@/lib/progress-service";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";
import { formatPercent } from "@/lib/utils";

export function DashboardPage() {
  const { profile } = useAuth();
  const { attempts, bookmarkedIds, followedIds } = useStudy();
  const progress = buildProgressSnapshot(attempts, bookmarkedIds);
  const userStat = calculateLeaderboardStat(profile?.id ?? "preview-user", attempts, verifiedProfessionalQuestions.length);
  const friends = sampleFriends.filter((friend) => followedIds.has(friend.id)).slice(0, 2);

  return (
    <div className="space-y-5">
      <section className="grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <Card>
          <CardHeader>
            <Badge className="w-fit" variant="gold">
              Latest source: 2026-2027
            </Badge>
            <CardTitle className="text-3xl leading-tight">Ready, {profile?.displayName ?? "reviewer"}?</CardTitle>
            <CardDescription>Your Professional reviewer progress follows you across devices.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 sm:grid-cols-2">
            <Button asChild size="lg">
              <Link to="/review">
                <Brain aria-hidden="true" />
                Continue review
              </Link>
            </Button>
            <Button asChild size="lg" variant="gold">
              <Link to="/quiz">
                <Target aria-hidden="true" />
                Start quiz
              </Link>
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Your score</CardTitle>
            <CardDescription>Unique correct answers plus streak bonus.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-4xl font-extrabold">{userStat.score}</p>
            <p className="mt-1 text-sm font-semibold text-muted-foreground">{formatPercent(progress.accuracy)} accuracy</p>
            <Progress className="mt-4" value={progress.completion} />
          </CardContent>
        </Card>
      </section>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric title="Attempted" value={progress.total} icon={Target} />
        <Metric title="Correct" value={progress.correct} icon={Brain} />
        <Metric title="Mistakes" value={progress.mistakeIds.size} icon={BookMarked} />
        <Metric title="Bookmarks" value={progress.bookmarkCount} icon={BookMarked} />
      </section>

      <section className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Topic accuracy</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {progress.topics.map((topic) => (
              <div key={topic.topic} className="space-y-2">
                <div className="flex justify-between gap-3 text-sm font-semibold">
                  <span>{topic.topic}</span>
                  <span>{formatPercent(topic.accuracy)}</span>
                </div>
                <Progress value={topic.accuracy} />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <div>
              <CardTitle>Friends</CardTitle>
              <CardDescription>People you follow appear here.</CardDescription>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/leaderboard">
                <Medal aria-hidden="true" />
                Open
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {friends.length === 0 ? (
              <div className="rounded-md border bg-muted/40 p-3 text-sm font-semibold text-muted-foreground">
                Follow friends to compare scores here.
              </div>
            ) : null}
            {friends.map((friend) => (
              <div key={friend.id} className="flex items-center justify-between rounded-md border bg-muted/40 p-3">
                <div>
                  <p className="font-bold">{friend.displayName}</p>
                  <p className="text-sm text-muted-foreground">@{friend.username}</p>
                </div>
                <p className="text-lg font-extrabold">{sampleFriendStats[friend.id].score}</p>
              </div>
            ))}
            <Button asChild variant="ghost" className="w-full">
              <Link to="/friends">
                Find friends
                <ArrowRight aria-hidden="true" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}

function Metric({ title, value, icon: Icon }: { title: string; value: number; icon: typeof Target }) {
  return (
    <Card>
      <CardContent className="flex items-center justify-between p-5">
        <div>
          <p className="text-sm font-semibold text-muted-foreground">{title}</p>
          <p className="mt-1 text-3xl font-extrabold">{value}</p>
        </div>
        <div className="flex h-11 w-11 items-center justify-center rounded-md bg-primary/10 text-primary">
          <Icon className="h-5 w-5" aria-hidden="true" />
        </div>
      </CardContent>
    </Card>
  );
}
