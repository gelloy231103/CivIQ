import type { LeaderboardStat, Profile } from "@/lib/question-model";
import { supabase } from "@/lib/supabase";

type SocialProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  visibility: string;
  created_at: string;
};

type LeaderboardRow = SocialProfileRow & {
  score: number;
  accuracy: number;
  completed_questions: number;
  current_streak: number;
  best_streak: number;
};

export async function listSocialProfiles(excludeUserId?: string, limit = 250): Promise<Profile[]> {
  if (!supabase) return [];

  let request = supabase
    .rpc("social_profiles")
    .order("created_at", { ascending: false })
    .limit(limit);

  if (excludeUserId) {
    request = request.neq("id", excludeUserId);
  }

  const { data, error } = await request;
  if (error) return [];

  return (data as SocialProfileRow[] | null)?.map(profileFromSocialRow) ?? [];
}

export async function listLeaderboardRows(): Promise<Array<{ profile: Profile; stat: LeaderboardStat }>> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc("leaderboard_rows");
  if (error) return [];

  return (data as LeaderboardRow[] | null)?.map((row) => ({
    profile: profileFromSocialRow(row),
    stat: {
      userId: String(row.id),
      score: Number(row.score ?? 0),
      accuracy: Number(row.accuracy ?? 0),
      completedQuestions: Number(row.completed_questions ?? 0),
      currentStreak: Number(row.current_streak ?? 0),
      bestStreak: Number(row.best_streak ?? 0)
    }
  })) ?? [];
}

function profileFromSocialRow(row: SocialProfileRow): Profile {
  const username = String(row.username ?? "");
  return {
    id: String(row.id),
    username,
    displayName: String(row.display_name ?? username),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    visibility: row.visibility === "global" ? "global" : "friends",
    joinedAt: String(row.created_at)
  };
}
