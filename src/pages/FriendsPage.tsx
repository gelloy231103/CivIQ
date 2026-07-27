import { useEffect, useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useAuth } from "@/lib/auth";
import type { Profile } from "@/lib/question-model";
import { searchProfiles } from "@/lib/social-service";
import { supabase } from "@/lib/supabase";
import { useStudy } from "@/lib/study-state";

export function FriendsPage() {
  const [query, setQuery] = useState("");
  const [remoteProfiles, setRemoteProfiles] = useState<Profile[]>([]);
  const { profile, isPreview } = useAuth();
  const { followedIds, followerIds, mutualFriendIds, toggleFollow } = useStudy();
  const results = isPreview ? filterProfiles(searchProfiles(""), query) : remoteProfiles;
  const emptyText = query.trim()
    ? "No profiles match that search yet."
    : "Search by display name or check back after more people create CivIQ accounts.";

  useEffect(() => {
    if (isPreview || !supabase || !profile) return;

    let cancelled = false;
    const client = supabase;
    const timeout = window.setTimeout(async () => {
      const normalized = query.trim().replace(/[,()]/g, " ");
      let request = client
        .from("profiles")
        .select("id, username, display_name, avatar_url, visibility, created_at")
        .neq("id", profile.id)
        .order("created_at", { ascending: false })
        .limit(20);
      if (normalized) {
        request = request.or(`display_name.ilike.%${normalized}%,username.ilike.%${normalized}%`);
      }
      const { data } = await request;
      if (!cancelled) {
        setRemoteProfiles(
          data?.map((row) => ({
            id: String(row.id),
            username: String(row.username),
            displayName: String(row.display_name),
            avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
            visibility: row.visibility === "global" ? "global" : "friends",
            joinedAt: String(row.created_at)
          })) ?? []
        );
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timeout);
    };
  }, [isPreview, profile, query]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Friends</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Find classmates by display name. You only compete after you both follow each other.
        </p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by display name" />
      <div className="grid gap-3">
        {!isPreview && results.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm font-semibold text-muted-foreground">
              {emptyText}
            </CardContent>
          </Card>
        ) : null}
        {results.map((profile) => {
          const state = getFriendshipState(profile.id, followedIds, followerIds, mutualFriendIds);
          const Icon = state.followed ? UserCheck : UserPlus;

          return (
            <Card key={profile.id}>
              <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex min-w-0 items-center gap-3">
                  <Avatar>
                    {profile.avatarUrl ? <AvatarImage src={profile.avatarUrl} alt={profile.displayName} /> : null}
                    <AvatarFallback>{profile.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0">
                    <div className="flex min-w-0 flex-wrap items-center gap-2">
                      <p className="truncate font-bold">{profile.displayName}</p>
                      <Badge variant={state.mutual ? "secondary" : state.followsYou ? "gold" : "muted"}>{state.badge}</Badge>
                    </div>
                  </div>
                </div>
                <Button
                  className="w-full sm:w-auto"
                  variant={state.followed ? "outline" : "default"}
                  onClick={() => toggleFollow(profile.id)}
                >
                  <Icon aria-hidden="true" />
                  {state.action}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}

function filterProfiles(profiles: Profile[], query: string) {
  const normalized = query.trim().toLowerCase();
  if (!normalized) return profiles;
  return profiles.filter(
    (profile) =>
      profile.displayName.toLowerCase().includes(normalized) ||
      profile.username.toLowerCase().includes(normalized)
  );
}

function getFriendshipState(
  profileId: string,
  followedIds: Set<string>,
  followerIds: Set<string>,
  mutualFriendIds: Set<string>
) {
  const followed = followedIds.has(profileId);
  const followsYou = followerIds.has(profileId);
  const mutual = mutualFriendIds.has(profileId);

  if (mutual) return { action: "Friends", badge: "Mutual friend", followed, followsYou, mutual };
  if (followsYou) return { action: "Follow back", badge: "Follows you", followed, followsYou, mutual };
  if (followed) return { action: "Following", badge: "Waiting", followed, followsYou, mutual };
  return { action: "Follow", badge: "Not connected", followed, followsYou, mutual };
}
