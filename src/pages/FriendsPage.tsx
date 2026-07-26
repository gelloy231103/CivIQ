import { useEffect, useState } from "react";
import { UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
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
  const { followedIds, toggleFollow } = useStudy();
  const results = isPreview ? searchProfiles(query) : remoteProfiles;
  const emptyText = query.trim()
    ? "No profiles match that search yet."
    : "Friends appear here after other people create CivIQ accounts.";

  useEffect(() => {
    if (isPreview || !supabase || !profile) return;

    let cancelled = false;
    const client = supabase;
    const timeout = window.setTimeout(async () => {
      const normalized = query.trim();
      let request = client.from("profiles").select("*").neq("id", profile.id).limit(20);
      if (normalized) {
        request = request.or(`username.ilike.%${normalized}%,display_name.ilike.%${normalized}%`);
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
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Follow friends to build your leaderboard.</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or username" />
      <div className="grid gap-3">
        {!isPreview && results.length === 0 ? (
          <Card>
            <CardContent className="p-5 text-sm font-semibold text-muted-foreground">
              {emptyText}
            </CardContent>
          </Card>
        ) : null}
        {results.map((profile) => (
          <Card key={profile.id}>
            <CardContent className="flex items-center justify-between gap-3 p-4">
              <div className="flex min-w-0 items-center gap-3">
                <Avatar>
                  <AvatarFallback>{profile.displayName.slice(0, 2).toUpperCase()}</AvatarFallback>
                </Avatar>
                <div className="min-w-0">
                  <p className="truncate font-bold">{profile.displayName}</p>
                  <p className="truncate text-sm text-muted-foreground">@{profile.username}</p>
                </div>
              </div>
              <Button variant={followedIds.has(profile.id) ? "outline" : "default"} onClick={() => toggleFollow(profile.id)}>
                <UserPlus aria-hidden="true" />
                {followedIds.has(profile.id) ? "Following" : "Follow"}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
