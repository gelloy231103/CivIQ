import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import type { Session } from "@supabase/supabase-js";
import type { Profile } from "@/lib/question-model";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

type AuthContextValue = {
  loading: boolean;
  setupRequired: boolean;
  session: Session | null;
  profile: Profile | null;
  isPreview: boolean;
  signIn: (email: string, password: string) => Promise<string | null>;
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
    supabase.auth.getSession().then(({ data }) => {
      if (!mounted) return;
      setSession(data.session);
      if (data.session?.user) {
        setProfile(profileFromUser(data.session.user.id, data.session.user.email ?? ""));
      }
      setLoading(false);
    });

    const {
      data: { subscription }
    } = supabase.auth.onAuthStateChange((_event, nextSession) => {
      setSession(nextSession);
      setProfile(nextSession?.user ? profileFromUser(nextSession.user.id, nextSession.user.email ?? "") : null);
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
      signUp,
      startPreview,
      signOut
    }),
    [isPreview, loading, profile, session, signIn, signOut, signUp, startPreview]
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

function profileFromUser(userId: string, email: string): Profile {
  const fallbackName = email.split("@")[0] || "CivIQ User";
  return {
    id: userId,
    username: fallbackName.toLowerCase().replace(/[^a-z0-9_]/g, "_"),
    displayName: fallbackName,
    visibility: "friends",
    joinedAt: new Date().toISOString()
  };
}
