import { sampleFriends } from "@/lib/leaderboard-service";

export function searchProfiles(query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return sampleFriends;

  return sampleFriends.filter(
    (profile) =>
      profile.displayName.toLowerCase().includes(normalized) || profile.username.toLowerCase().includes(normalized)
  );
}
