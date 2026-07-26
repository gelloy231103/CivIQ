import { KeyRound, Lock, Server } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function SetupRequired({ onPreview }: { onPreview: () => void }) {
  return (
    <main className="flex min-h-screen items-center justify-center px-4 py-10">
      <Card className="w-full max-w-xl">
        <CardHeader>
          <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
            <Lock className="h-5 w-5" aria-hidden="true" />
          </div>
          <CardTitle className="text-2xl">Connect Supabase to require login</CardTitle>
          <CardDescription>
            Add the free Supabase project values to `.env` before using real accounts, synced progress, follows, and leaderboards.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 text-sm">
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
              <Server className="h-4 w-4 text-primary" aria-hidden="true" />
              <code>VITE_SUPABASE_URL</code>
            </div>
            <div className="flex items-center gap-3 rounded-md border bg-muted/50 p-3">
              <KeyRound className="h-4 w-4 text-primary" aria-hidden="true" />
              <code>VITE_SUPABASE_ANON_KEY</code>
            </div>
          </div>
          {import.meta.env.DEV ? (
            <Button className="w-full" onClick={onPreview}>
              Continue in local preview
            </Button>
          ) : null}
        </CardContent>
      </Card>
    </main>
  );
}
