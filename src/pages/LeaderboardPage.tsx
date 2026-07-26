import { useEffect, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { calculateLeaderboardStat, sampleFriends, sampleFriendStats } from "@/lib/leaderboard-service";
import type { LeaderboardStat, Profile } from "@/lib/question-model";
import { supabase } from "@/lib/supabase";
import { useStudy } from "@/lib/study-state";
import { formatPercent } from "@/lib/utils";

export function LeaderboardPage() {
  const { profile } = useAuth();
  const { attempts, followedIds } = useStudy();
  const [remoteRows, setRemoteRows] = useState<Array<{ profile: Profile; stat: LeaderboardStat }>>([]);
  const me = profile ?? {
    id: "preview-user",
    username: "louis",
    displayName: "Louis",
    visibility: "friends" as const,
    joinedAt: new Date().toISOString()
  };
  const myStat = calculateLeaderboardStat(me.id, attempts, verifiedProfessionalQuestions.length);
  const friendRows =
    profile && supabase
      ? [{ profile: me, stat: myStat }, ...remoteRows.filter((row) => followedIds.has(row.profile.id))]
      : [
          { profile: me, stat: myStat },
          ...sampleFriends
            .filter((friend) => followedIds.has(friend.id))
            .map((friend) => ({ profile: friend, stat: sampleFriendStats[friend.id] }))
        ];
  const globalRows =
    profile && supabase
      ? [{ profile: me, stat: myStat }, ...remoteRows.filter((row) => row.profile.visibility === "global")]
      : [
          { profile: me, stat: myStat },
          ...sampleFriends
            .filter((friend) => friend.visibility === "global")
            .map((friend) => ({ profile: friend, stat: sampleFriendStats[friend.id] }))
        ];

  useEffect(() => {
    if (!profile || !supabase) return;

    let cancelled = false;
    Promise.all([
      supabase
        .from("profiles")
        .select("id, username, display_name, avatar_url, visibility, created_at")
        .neq("id", profile.id)
        .limit(100),
      supabase.from("leaderboard_stats").select("*")
    ]).then(([profilesResult, statsResult]) => {
      if (cancelled) return;
      const statsByUser = new Map(statsResult.data?.map((row) => [String(row.user_id), row]) ?? []);
      setRemoteRows(
        profilesResult.data?.map((row) => {
          const stat = statsByUser.get(String(row.id));
          return {
            profile: {
              id: String(row.id),
              username: String(row.username),
              displayName: String(row.display_name),
              avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
              visibility: row.visibility === "global" ? "global" : "friends",
              joinedAt: String(row.created_at)
            },
            stat: {
              userId: String(row.id),
              score: Number(stat?.score ?? 0),
              accuracy: Number(stat?.accuracy ?? 0),
              completedQuestions: Number(stat?.completed_questions ?? 0),
              currentStreak: Number(stat?.current_streak ?? 0),
              bestStreak: Number(stat?.best_streak ?? 0)
            }
          };
        }) ?? []
      );
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
          <LeaderboardRows rows={friendRows} />
        </TabsContent>
        <TabsContent value="global">
          <LeaderboardRows rows={globalRows} />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function LeaderboardRows({ rows }: { rows: Array<{ profile: Profile; stat: LeaderboardStat }> }) {
  const sorted = rows.slice().sort((a, b) => b.stat.score - a.stat.score);
  return (
    <Card>
      <CardHeader>
        <CardTitle>Rankings</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {sorted.map((row, index) => (
          <div key={row.profile.id} className="grid grid-cols-[auto_1fr_auto] items-center gap-3 rounded-md border bg-muted/40 p-3">
            <Badge variant={index === 0 ? "gold" : "muted"}>#{index + 1}</Badge>
            <div className="flex min-w-0 items-center gap-3">
              <Avatar>
                <AvatarFallback>{initials(row.profile.displayName)}</AvatarFallback>
              </Avatar>
              <div className="min-w-0">
                <p className="truncate font-bold">{row.profile.displayName}</p>
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
