import type { Profile } from "@/lib/question-model";
import { supabase } from "@/lib/supabase";

type SocialProfileRow = {
  id: string;
  username: string;
  display_name: string;
  avatar_url: string | null;
  visibility: string;
  created_at: string;
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
