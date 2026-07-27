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
  resetPasswordForEmail: (email: string) => Promise<string | null>;
  updatePassword: (password: string) => Promise<string | null>;
  updateProfile: (updates: ProfileUpdateInput) => Promise<string | null>;
  startPreview: () => void;
  signOut: () => Promise<void>;
};

export type ProfileUpdateInput = {
  displayName: string;
  username: string;
  avatarUrl?: string;
  visibility: "friends" | "global";
};

const AuthContext = createContext<AuthContextValue | null>(null);

const previewProfile: Profile = {
  id: "preview-user",
  username: "louis",
  displayName: "Louis",
  visibility: "friends",
  joinedAt: new Date().toISOString()
};
const pendingSignupProfileStorageKey = "civiq-pending-signup-profile-v1";

type PendingSignupProfile = {
  userId: string;
  displayName: string;
  username: string;
  createdAt: string;
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
    if (!supabase) return "Accounts are not connected yet.";
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password });
    return formatAuthError(error?.message);
  }, []);

  const signInWithGoogle = useCallback(async () => {
    if (!supabase) return "Accounts are not connected yet.";

    const { error } = await supabase.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: getRedirectUrl("/")
      }
    });

    return formatAuthError(error?.message);
  }, []);

  const signUp = useCallback(async (email: string, password: string, displayName: string, username: string) => {
    if (!supabase) return "Accounts are not connected yet.";
    const normalizedUsername = normalizeUsername(username);
    const { data, error } = await supabase.auth.signUp({
      email: email.trim().toLowerCase(),
      password,
      options: {
        emailRedirectTo: getRedirectUrl("/")
      }
    });
    const formattedError = formatAuthError(error?.message);
    if (formattedError) return formattedError;
    if (data.user?.id) {
      storePendingSignupProfile({
        userId: data.user.id,
        displayName: displayName.trim(),
        username: normalizedUsername,
        createdAt: new Date().toISOString()
      });
    }
    return null;
  }, []);

  const resetPasswordForEmail = useCallback(async (email: string) => {
    if (!supabase) return "Accounts are not connected yet.";
    const { error } = await supabase.auth.resetPasswordForEmail(email.trim().toLowerCase(), {
      redirectTo: getRedirectUrl("/reset-password")
    });
    return formatAuthError(error?.message);
  }, []);

  const updatePassword = useCallback(async (password: string) => {
    if (!supabase) return "Accounts are not connected yet.";
    const { error } = await supabase.auth.updateUser({ password });
    return formatAuthError(error?.message);
  }, []);

  const updateProfile = useCallback(async (updates: ProfileUpdateInput) => {
    const normalizedUsername = normalizeUsername(updates.username);
    const displayName = updates.displayName.trim();
    const avatarUrl = updates.avatarUrl?.trim();

    if (!displayName) return "Display name is required.";
    if (normalizedUsername.length < 3) return "Username must be at least 3 characters.";

    if (isPreview) {
      setProfile((current) =>
        current
          ? {
              ...current,
              displayName,
              username: normalizedUsername,
              avatarUrl: avatarUrl || undefined,
              visibility: updates.visibility
            }
          : current
      );
      return null;
    }

    if (!supabase || !profile) return "Accounts are not connected yet.";

    const { error } = await supabase
      .from("profiles")
      .update({
        username: normalizedUsername,
        display_name: displayName,
        avatar_url: avatarUrl || null,
        visibility: updates.visibility
      })
      .eq("id", profile.id);

    if (error) return formatProfileError(error.message);

    const refreshed = await readPrivateProfile();
    if (refreshed) setProfile(refreshed);
    return null;
  }, [isPreview, profile]);

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
      resetPasswordForEmail,
      updatePassword,
      updateProfile,
      startPreview,
      signOut
    }),
    [
      isPreview,
      loading,
      profile,
      resetPasswordForEmail,
      session,
      signIn,
      signInWithGoogle,
      signOut,
      signUp,
      startPreview,
      updatePassword,
      updateProfile
    ]
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

  const existing = await readPrivateProfile();
  if (existing) return existing;

  const fallback = profileFromPendingSignup(user) ?? profileFromUser(user);
  const { error } = await insertProfile(fallback);

  if (error) {
    const uniqueFallback = {
      ...fallback,
      username: `${fallback.username.slice(0, 17)}_${user.id.slice(0, 6)}`
    };
    const { error: uniqueError } = await insertProfile(uniqueFallback);
    if (!uniqueError) {
      clearPendingSignupProfile(user.id);
      return (await readPrivateProfile()) ?? uniqueFallback;
    }
  }

  if (!error) clearPendingSignupProfile(user.id);
  return (await readPrivateProfile()) ?? fallback;
}

async function insertProfile(profile: Profile) {
  if (!supabase) return { data: null, error: null };
  return supabase
    .from("profiles")
    .insert({
      id: profile.id,
      username: profile.username,
      display_name: profile.displayName,
      avatar_url: profile.avatarUrl ?? null,
      visibility: profile.visibility
    });
}

function profileFromUser(user: User): Profile {
  const metadata = user.user_metadata ?? {};
  const fallbackName = `user_${user.id.slice(0, 8)}`;
  const displayName = String(metadata.full_name || metadata.name || fallbackName);
  const avatarUrl = metadata.avatar_url || metadata.picture;
  const username = normalizeUsername(String(metadata.preferred_username || fallbackName));

  return {
    id: user.id,
    username: username || `user_${user.id.slice(0, 8)}`,
    displayName,
    avatarUrl: avatarUrl ? String(avatarUrl) : undefined,
    visibility: "friends",
    joinedAt: new Date().toISOString()
  };
}

function profileFromPendingSignup(user: User): Profile | null {
  const pendingProfile = readPendingSignupProfile(user.id);
  if (!pendingProfile) return null;

  return {
    id: user.id,
    username: pendingProfile.username,
    displayName: pendingProfile.displayName,
    visibility: "friends",
    joinedAt: new Date().toISOString()
  };
}

function profileFromRow(row: Record<string, unknown>): Profile {
  const username = String(row.username ?? "");
  return {
    id: String(row.id),
    username,
    displayName: String(row.display_name ?? (username || "CivIQ User")),
    avatarUrl: row.avatar_url ? String(row.avatar_url) : undefined,
    visibility: row.visibility === "global" ? "global" : "friends",
    joinedAt: String(row.created_at)
  };
}

async function readPrivateProfile() {
  if (!supabase) return null;
  const { data, error } = await supabase.rpc("my_private_profile").maybeSingle();
  if (error || !data) return null;
  return profileFromRow(data as Record<string, unknown>);
}

function storePendingSignupProfile(profile: PendingSignupProfile) {
  try {
    localStorage.setItem(pendingSignupProfileStorageKey, JSON.stringify(profile));
  } catch {
    // Local profile handoff is best effort; users can still edit their profile after signup.
  }
}

function readPendingSignupProfile(userId: string) {
  try {
    const raw = localStorage.getItem(pendingSignupProfileStorageKey);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<PendingSignupProfile>;
    if (parsed.userId !== userId || !parsed.displayName || !parsed.username) return null;
    return {
      userId,
      displayName: parsed.displayName,
      username: normalizeUsername(parsed.username),
      createdAt: String(parsed.createdAt ?? "")
    };
  } catch {
    return null;
  }
}

function clearPendingSignupProfile(userId: string) {
  try {
    const pendingProfile = readPendingSignupProfile(userId);
    if (pendingProfile) localStorage.removeItem(pendingSignupProfileStorageKey);
  } catch {
    // Nothing to clear.
  }
}

function normalizeUsername(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9_]/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 24);
}

function getRedirectUrl(path: string) {
  if (typeof window === "undefined") return undefined;
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  return `${window.location.origin}${normalizedPath}`;
}

function formatAuthError(message?: string) {
  if (!message) return null;
  const normalized = message.toLowerCase();

  if (normalized.includes("invalid login credentials")) {
    return "Email or password is incorrect.";
  }
  if (normalized.includes("email not confirmed")) {
    return "Please confirm your email before signing in.";
  }
  if (normalized.includes("already registered") || normalized.includes("already exists")) {
    return "An account with this email already exists. Sign in instead.";
  }
  if (normalized.includes("password") && normalized.includes("at least")) {
    return "Use a password with at least 8 characters.";
  }
  if (normalized.includes("auth session missing") || normalized.includes("session_not_found")) {
    return "Open the latest password reset link from your email, then try again.";
  }
  if (normalized.includes("same password") || normalized.includes("different from the old password")) {
    return "Use a new password that is different from your current password.";
  }
  if (normalized.includes("unsupported provider") || normalized.includes("provider is not enabled")) {
    return "Google sign-in is not enabled yet.";
  }

  return message;
}

function formatProfileError(message?: string) {
  if (!message) return null;
  const normalized = message.toLowerCase();
  if (normalized.includes("duplicate") || normalized.includes("unique")) {
    return "That username is already taken.";
  }
  return message;
}
