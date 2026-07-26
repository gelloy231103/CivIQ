import { useState } from "react";
import { UserPlus } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { searchProfiles } from "@/lib/social-service";
import { useStudy } from "@/lib/study-state";

export function FriendsPage() {
  const [query, setQuery] = useState("");
  const { followedIds, toggleFollow } = useStudy();
  const results = searchProfiles(query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Friends</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Follow friends to build your leaderboard.</p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by name or username" />
      <div className="grid gap-3">
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
