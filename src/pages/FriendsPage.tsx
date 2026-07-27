import { useEffect, useState } from "react";
import { UserCheck, UserPlus } from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";
import type { Profile } from "@/lib/question-model";
import { listSocialProfiles } from "@/lib/social-profiles";
import { searchProfiles } from "@/lib/social-service";
import { useStudy } from "@/lib/study-state";

type FriendFilter = "all" | "followers" | "following" | "friends";

export function FriendsPage() {
  const [query, setQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<FriendFilter>("all");
  const [remoteProfiles, setRemoteProfiles] = useState<Profile[]>([]);
  const { profile, isPreview } = useAuth();
  const { followedIds, followerIds, mutualFriendIds, toggleFollow } = useStudy();
  const allProfiles = isPreview ? filterProfiles(searchProfiles(""), query) : filterProfiles(remoteProfiles, query);
  const results = filterByFriendship(allProfiles, activeFilter, followedIds, followerIds, mutualFriendIds)
    .sort((first, second) => compareByFriendship(first, second, followedIds, followerIds, mutualFriendIds));
  const emptyText = getEmptyText(activeFilter, query);
  const filterCounts = getFilterCounts(allProfiles, followedIds, followerIds, mutualFriendIds);

  useEffect(() => {
    if (isPreview || !profile) return;

    let cancelled = false;
    listSocialProfiles(profile.id).then((profiles) => {
      if (!cancelled) setRemoteProfiles(profiles);
    });

    return () => {
      cancelled = true;
    };
  }, [isPreview, profile]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Friends</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Find classmates by display name. You only compete after you both follow each other.
        </p>
      </div>
      <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search by display name" />
      <Tabs value={activeFilter} onValueChange={(value) => setActiveFilter(value as FriendFilter)}>
        <TabsList className="grid w-full grid-cols-2 gap-1 sm:inline-flex sm:w-auto sm:grid-cols-none">
          <TabsTrigger value="all">All {filterCounts.all}</TabsTrigger>
          <TabsTrigger value="followers">Followers {filterCounts.followers}</TabsTrigger>
          <TabsTrigger value="following">Following {filterCounts.following}</TabsTrigger>
          <TabsTrigger value="friends">Friends {filterCounts.friends}</TabsTrigger>
        </TabsList>
      </Tabs>
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

function filterByFriendship(
  profiles: Profile[],
  activeFilter: FriendFilter,
  followedIds: Set<string>,
  followerIds: Set<string>,
  mutualFriendIds: Set<string>
) {
  if (activeFilter === "followers") return profiles.filter((profile) => followerIds.has(profile.id));
  if (activeFilter === "following") return profiles.filter((profile) => followedIds.has(profile.id));
  if (activeFilter === "friends") return profiles.filter((profile) => mutualFriendIds.has(profile.id));
  return profiles;
}

function getFilterCounts(
  profiles: Profile[],
  followedIds: Set<string>,
  followerIds: Set<string>,
  mutualFriendIds: Set<string>
) {
  return {
    all: profiles.length,
    followers: profiles.filter((profile) => followerIds.has(profile.id)).length,
    following: profiles.filter((profile) => followedIds.has(profile.id)).length,
    friends: profiles.filter((profile) => mutualFriendIds.has(profile.id)).length
  };
}

function compareByFriendship(
  first: Profile,
  second: Profile,
  followedIds: Set<string>,
  followerIds: Set<string>,
  mutualFriendIds: Set<string>
) {
  return (
    getFriendshipPriority(first.id, followedIds, followerIds, mutualFriendIds) -
      getFriendshipPriority(second.id, followedIds, followerIds, mutualFriendIds) ||
    first.displayName.localeCompare(second.displayName)
  );
}

function getFriendshipPriority(
  profileId: string,
  followedIds: Set<string>,
  followerIds: Set<string>,
  mutualFriendIds: Set<string>
) {
  if (followerIds.has(profileId) && !followedIds.has(profileId)) return 0;
  if (mutualFriendIds.has(profileId)) return 1;
  if (followedIds.has(profileId)) return 2;
  return 3;
}

function getEmptyText(activeFilter: FriendFilter, query: string) {
  if (query.trim()) return "No profiles match that search yet.";
  if (activeFilter === "followers") return "People who follow you will appear here.";
  if (activeFilter === "following") return "People you follow will appear here.";
  if (activeFilter === "friends") return "Mutual friends will appear here after you both follow each other.";
  return "Search by display name or check back after more people create CivIQ accounts.";
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
