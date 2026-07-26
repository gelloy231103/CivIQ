import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session, User } from "@supabase/supabase-js";
import type { Profile } from "@/lib/question-model";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  loading: boolean;
  setupRequired: boolean;
  session: Session | null;
  profile: Profile | null;
  isPreview: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
  signInWithGoogle: () => Promise<string | null>;
  signUp: (email: string, password: string, displayName: string, username: string) => Promise<string | null>;
  startPreview: () => void;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const previewProfile: Profile = {
  id: "preview-user",
  username: "louis",
  displayName: "Louis",
  visibility: "friends",
  joinedAt: new Date().toISOString()
};

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(isSupabaseConfigured);
  const [session, setSession] = useState<Session | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [isPreview, setIsPreview] = useState(false);

  useEffect(() => {
    if (!supabase) {
      setLoading(false);
      return;
    }

    let mounted = true;
    supabase.auth.getSession().then(async ({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        setProfile(await ensureProfile(data.session.user));
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      if (!nextSession?.user) {
        setProfile(null);
        return;
      }
      ensureProfile(nextSession.user).then(setProfile).catch(() => {
        setProfile(profileFromUser(nextSession.user));
      });
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    return error?.message ?? null;
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Supabase is not configured.";

    const redirectTo = typeof window === "undefined" ? undefined : `${window.location.origin}/`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo
      }
    });

    return error?.message ?? null;
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, username: string) => {
    if (!supabase) return "Supabase is not configured.";
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          display_name: displayName,
          username
        }
      }
    });
    return error?.message ?? null;
  }, []);

  const startPreview = useCallback(() => {
    setIsPreview(true);
    setProfile(previewProfile);
  }, []);

  const signOut = useCallback(async () => {
    if (supabase && session) {
      await supabase.auth.signOut();
    }
    setIsPreview(false);
    setSession(null);
    setProfile(null);
  }, [session]);

  const value = useMemo<AuthContextValue>(
    () => ({
      loading,
      setupRequired: !isSupabaseConfigured && !isPreview,
      session,
      profile,
      isPreview,
      signIn,
      signInWithGoogle,
      signUp,
      startPreview,
      signOut
    }),
    [isPreview, loading, profile, session, signIn, signInWithGoogle, signOut, signUp, startPreview]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}

async function ensureProfile(user: User): Promise<Profile> {
  if (!supabase) return profileFromUser(user);

  const { data: existing } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  if (existing) return profileFromRow(existing);

  const fallback = profileFromUser(user);
  const { data: inserted, error } = await supabase
    .from("profiles")
    .insert({
      id: fallback.id,
      username: fallback.username,
      display_name: fallback.displayName,
      avatar_url: fallback.avatarUrl ?? null,
      visibility: fallback.visibility
    })
    .select("*")
    .single();

  if (error || !inserted) return fallback;
  return profileFromRow(inserted);
}

function profileFromUser(user: User): Profile {
  const metadata = user.user_metadata ?? {};
  const fallbackName = user.email?.split("@")[0] || "CivIQ User";
  const displayName = String(metadata.display_name || metadata.full_name || metadata.name || fallbackName);
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const username = String(metadata.username || fallbackName)
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);

  return {
    id: user.id,
    username: username || `user_${user.id.slice(0, 8)}`,
    displayName,
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    visibility: "friends",
    joinedAt: new Date().toISOString()
  };
}

function profileFromRow(row: Record<string, unknown>): Profile {
  return {
    id: String(row.id),
    username: String(row.username),
    displayName: String(row.display_name),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    visibility: row.visibility === "global" ? "global" : "friends",
    joinedAt: String(row.created_at)
  };
}
