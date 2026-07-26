import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat } from "@/lib/leaderboard-service";
import { buildProgressSnapshot } from "@/lib/progress-service";
import { useStudy } from "@/lib/study-state";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { formatPercent } from "@/lib/utils";

export function ProgressPage() {
  const { profile } = useAuth();
  const { attempts, bookmarkedIds } = useStudy();
  const snapshot = buildProgressSnapshot(attempts, bookmarkedIds);
  const stat = calculateLeaderboardStat(profile?.id ?? "preview-user", attempts, verifiedProfessionalQuestions.length);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Progress</h1>
      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Metric label="Accuracy" value={formatPercent(snapshot.accuracy)} />
        <Metric label="Completion" value={formatPercent(snapshot.completion)} />
        <Metric label="Current streak" value={stat.currentStreak} />
        <Metric label="Best streak" value={stat.bestStreak} />
      </section>
      <Card>
        <CardHeader>
          <CardTitle>Topic breakdown</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {snapshot.topics.map((topic) => (
            <div key={topic.topic} className="space-y-2">
              <div className="flex items-center justify-between gap-3 text-sm font-semibold">
                <span>{topic.topic}</span>
                <span>{formatPercent(topic.accuracy)}</span>
              </div>
              <Progress value={topic.accuracy} />
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <Card>
      <CardContent className="p-5">
        <p className="text-sm font-semibold text-muted-foreground">{label}</p>
        <p className="mt-1 text-3xl font-extrabold">{value}</p>
      </CardContent>
    </Card>
  );
}
