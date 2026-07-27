import { useEffect, useState } from "react";
import { UsersRound } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat, sampleFriends, sampleFriendStats } from "@/lib/leaderboard-service";
import type { LeaderboardStat, Profile } from "@/lib/question-model";
import { listSocialProfiles } from "@/lib/social-profiles";
import { supabase } from "@/lib/supabase";
import { useStudy } from "@/lib/study-state";
import { formatPercent } from "@/lib/utils";

export function LeaderboardPage() {
  const { profile } = useAuth();
  const { attempts, mutualFriendIds } = useStudy();
  const [remoteRows, setRemoteRows] = useState<Array<{ profile: Profile; stat: LeaderboardStat }>>([]);
  const [loading, setLoading] = useState(false);
  const me = profile ?? {
    id: "preview-user",
    username: "louis",
    displayName: "Louis",
    visibility: "friends" as const,
    joinedAt: new Date().toISOString()
  };
  const myStat = calculateLeaderboardStat(me.id, attempts, verifiedProfessionalQuestions.length);
  const meRow = { profile: me, stat: myStat };
  const friendRows =
    profile && supabase
      ? [meRow, ...remoteRows.filter((row) => mutualFriendIds.has(row.profile.id))]
      : [
          meRow,
          ...sampleFriends
            .filter((friend) => mutualFriendIds.has(friend.id))
            .map((friend) => ({ profile: friend, stat: sampleFriendStats[friend.id] }))
        ];
  const globalRows =
    profile && supabase
      ? [...(me.visibility === "global" ? [meRow] : []), ...remoteRows.filter((row) => row.profile.visibility === "global")]
      : [
          ...(me.visibility === "global" ? [meRow] : []),
          ...sampleFriends
            .filter((friend) => friend.visibility === "global")
            .map((friend) => ({ profile: friend, stat: sampleFriendStats[friend.id] }))
        ];

  useEffect(() => {
    if (!profile || !supabase) return;

    let cancelled = false;
    setLoading(true);
    Promise.all([
      listSocialProfiles(profile.id),
      supabase
        .from("leaderboard_stats")
        .select("user_id, score, accuracy, completed_questions, current_streak, best_streak")
    ])
      .then(([profiles, statsResult]) => {
        if (cancelled) return;
        const statsByUser = new Map(statsResult.data?.map((row) => [String(row.user_id), row]) ?? []);
        setRemoteRows(
          profiles.map((socialProfile) => {
            const stat = statsByUser.get(socialProfile.id);
            return {
              profile: socialProfile,
              stat: {
                userId: socialProfile.id,
                score: Number(stat?.score ?? 0),
                accuracy: Number(stat?.accuracy ?? 0),
                completedQuestions: Number(stat?.completed_questions ?? 0),
                currentStreak: Number(stat?.current_streak ?? 0),
                bestStreak: Number(stat?.best_streak ?? 0)
              }
            };
          })
        );
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [profile]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Leaderboard</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Scores favor verified correct questions and streaks.</p>
      </div>
      <Tabs defaultValue="friends">
        <TabsList>
          <TabsTrigger value="friends">Friends</TabsTrigger>
          <TabsTrigger value="global">Global</TabsTrigger>
        </TabsList>
        <TabsContent value="friends">
          <LeaderboardRows
            emptyText="Mutual friends will appear here after you both follow each other."
            loading={loading}
            rows={friendRows}
          />
        </TabsContent>
        <TabsContent value="global">
          <LeaderboardRows
            emptyText="No global leaderboard entries yet. Set your profile visibility to global to join."
            loading={loading}
            rows={globalRows}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardRows({
  emptyText,
  loading,
  rows
}: {
  emptyText: string;
  loading: boolean;
  rows: Array<{ profile: Profile; stat: LeaderboardStat }>;
}) {
  const sorted = rows.slice().sort((a, b) => b.stat.score - a.stat.score);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {loading ? (
          <div className="rounded-md border bg-muted/40 p-4 text-sm font-bold text-muted-foreground">
            Loading rankings
          </div>
        ) : null}
        {!loading && sorted.length === 0 ? (
          <div className="flex min-h-36 flex-col items-center justify-center gap-3 rounded-md border bg-muted/40 p-5 text-center">
            <UsersRound className="h-8 w-8 text-primary" aria-hidden="true" />
            <p className="max-w-sm text-sm font-semibold leading-6 text-muted-foreground">{emptyText}</p>
          </div>
        ) : null}
        {sorted.map((row, index) => (
          <div key={row.profile.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border bg-muted/40 p-3">
            <Badge variant={index === 0 ? "gold" : "muted"}>#{index + 1}</Badge>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                {row.profile.avatarUrl ? <AvatarImage src={row.profile.avatarUrl} alt={row.profile.displayName} /> : null}
                <AvatarFallback>{initials(row.profile.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-bold">{row.profile.displayName}</p>
                <p className="truncate text-xs font-bold text-primary">@{row.profile.username}</p>
                <p className="truncate text-sm text-muted-foreground">
                  {formatPercent(row.stat.accuracy)} | {row.stat.completedQuestions} done | streak {row.stat.currentStreak}
                </p>
              </div>
            </div>
            <p className="text-xl font-extrabold">{row.stat.score}</p>
          </div>
        ))}
      </CardContent>
    </Card>
  );
}

function initials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}
