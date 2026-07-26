import type { ReactNode } from "react";
import {
  BarChart3,
  BookOpen,
  Brain,
  Home,
  Library,
  LogOut,
  Medal,
  UserRound,
  UsersRound
} from "lucide-react";
import { CivIQLogo } from "@/components/brand/CivIQLogo";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useAuth } from "@/lib/auth";
import { NavLink } from "@/lib/router";
import { cn } from "@/lib/utils";

const primaryNav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/library", label: "Library", icon: Library },
  { to: "/review", label: "Review", icon: Brain },
  { to: "/leaderboard", label: "Leaderboard", icon: Medal },
  { to: "/profile", label: "Profile", icon: UserRound }
];

const secondaryNav = [
  { to: "/progress", label: "Progress", icon: BarChart3 },
  { to: "/friends", label: "Friends", icon: UsersRound },
  { to: "/bookmarks", label: "Bookmarks", icon: BookOpen }
];

export function AppShell({ children }: { children: ReactNode }) {
  const { profile, signOut, isPreview } = useAuth();
  const initials = profile?.displayName
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-72 border-r bg-card/95 px-4 py-5 lg:block">
        <div className="flex items-center gap-3 px-2">
          <CivIQLogo className="h-11 w-11 shrink-0" aria-hidden="true" />
          <div>
            <p className="text-lg font-extrabold leading-none">CivIQ</p>
            <p className="text-xs font-semibold text-muted-foreground">Professional 2026-2027</p>
          </div>
        </div>
        <nav className="mt-8 grid gap-1">
          {[...primaryNav, ...secondaryNav].map((item) => (
            <SidebarLink key={item.to} item={item} />
          ))}
        </nav>
        <div className="absolute bottom-5 left-4 right-4">
          <Separator className="mb-4" />
          <div className="mb-3 flex items-center gap-3 rounded-md bg-muted p-3">
            <Avatar>
              <AvatarFallback>{initials || "CI"}</AvatarFallback>
            </Avatar>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold">{profile?.displayName}</p>
              <p className="truncate text-xs text-muted-foreground">
                @{profile?.username}
                {isPreview ? " · preview" : ""}
              </p>
            </div>
          </div>
          <Button variant="outline" className="w-full" onClick={signOut}>
            <LogOut aria-hidden="true" />
            Sign out
          </Button>
        </div>
      </aside>

      <div className="lg:pl-72">
        <header className="sticky top-0 z-10 border-b bg-background/90 px-4 py-3 backdrop-blur lg:hidden">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <CivIQLogo className="h-10 w-10 shrink-0" aria-hidden="true" />
              <div>
                <p className="font-extrabold leading-none">CivIQ</p>
                <p className="text-xs font-semibold text-muted-foreground">Professional 2026-2027</p>
              </div>
            </div>
            <Avatar>
              <AvatarFallback>{initials || "CI"}</AvatarFallback>
            </Avatar>
          </div>
        </header>

        <main className="mx-auto min-h-screen w-full max-w-6xl px-4 py-5 pb-28 sm:px-6 lg:px-8 lg:py-8">{children}</main>
      </div>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-30 border-t bg-card/95 px-2 py-2 backdrop-blur lg:hidden">
        <div className="grid grid-cols-5 gap-1">
          {primaryNav.map((item) => (
            <BottomLink key={item.to} item={item} />
          ))}
        </div>
      </nav>
    </div>
  );
}

function SidebarLink({ item }: { item: (typeof primaryNav)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex min-h-11 items-center gap-3 rounded-md px-3 text-sm font-semibold transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
        )
      }
    >
      <Icon className="h-4 w-4" aria-hidden="true" />
      {item.label}
    </NavLink>
  );
}

function BottomLink({ item }: { item: (typeof primaryNav)[number] }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      className={({ isActive }) =>
        cn(
          "flex min-h-14 flex-col items-center justify-center gap-1 rounded-md text-[11px] font-bold transition-colors",
          isActive ? "bg-primary text-primary-foreground" : "text-muted-foreground"
        )
      }
    >
      <Icon className="h-5 w-5" aria-hidden="true" />
      <span>{item.label}</span>
    </NavLink>
  );
}
