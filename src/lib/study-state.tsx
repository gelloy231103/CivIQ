import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import type { AttemptMode, AttemptRecord } from "@/lib/question-model";
import { createAttempt } from "@/lib/quiz-engine";
import { calculateLeaderboardStat } from "@/lib/leaderboard-service";
import { supabase } from "@/lib/supabase";

type StudyState = {
  attempts: AttemptRecord[];
  bookmarkedIds: Set<string>;
  followedIds: Set<string>;
};

type StudyContextValue = StudyState & {
  answerQuestion: (questionId: string, selectedChoice: string, mode: AttemptMode) => AttemptRecord | null;
  toggleBookmark: (questionId: string) => void;
  toggleFollow: (profileId: string) => void;
  resetPreviewProgress: () => void;
};

const storageKey = "civiq-study-state-v1";
const StudyContext = createContext<StudyContextValue | null>(null);

const initialState: StudyState = {
  attempts: [],
  bookmarkedIds: new Set<string>(),
  followedIds: new Set<string>()
};

export function StudyProvider({ children }: { children: ReactNode }) {
  const { profile, isPreview } = useAuth();
  const [state, setState] = useState<StudyState>(() => readState());

  useEffect(() => {
    if (!isPreview && profile && supabase) return;
    const serialized = {
      attempts: state.attempts,
      bookmarkedIds: [...state.bookmarkedIds],
      followedIds: [...state.followedIds]
    };
    localStorage.setItem(storageKey, JSON.stringify(serialized));
  }, [isPreview, profile, state]);

  useEffect(() => {
    if (!profile || isPreview || !supabase) return;

    let cancelled = false;
    loadRemoteStudyState(profile.id).then((remoteState) => {
      if (!cancelled) setState(remoteState);
    });

    return () => {
      cancelled = true;
    };
  }, [isPreview, profile]);

  useEffect(() => {
    if (!profile || isPreview || !supabase) return;
    const stat = calculateLeaderboardStat(profile.id, state.attempts, verifiedProfessionalQuestions.length);
    supabase
      .from("leaderboard_stats")
      .upsert(
        {
          user_id: profile.id,
          score: stat.score,
          accuracy: stat.accuracy,
          completed_questions: stat.completedQuestions,
          current_streak: stat.currentStreak,
          best_streak: stat.bestStreak,
          updated_at: new Date().toISOString()
        },
        { onConflict: "user_id" }
      )
      .then(() => undefined);
  }, [isPreview, profile, state.attempts]);

  const value = useMemo<StudyContextValue>(
    () => ({
      ...state,
      answerQuestion(questionId, selectedChoice, mode) {
        const question = verifiedProfessionalQuestions.find((item) => item.id === questionId);
        if (!question) return null;
        const attempt = createAttempt(question, selectedChoice, mode);
        setState((current) => ({
          ...current,
          attempts: [...current.attempts, attempt]
        }));
        if (profile && !isPreview) {
          saveAttempt(profile.id, attempt);
        }
        return attempt;
      },
      toggleBookmark(questionId) {
        let enabled = false;
        setState((current) => {
          const next = new Set(current.bookmarkedIds);
          if (next.has(questionId)) {
            next.delete(questionId);
          } else {
            next.add(questionId);
            enabled = true;
          }
          if (profile && !isPreview) {
            setBookmark(profile.id, questionId, enabled);
          }
          return { ...current, bookmarkedIds: next };
        });
      },
      toggleFollow(profileId) {
        let enabled = false;
        setState((current) => {
          const next = new Set(current.followedIds);
          if (next.has(profileId)) {
            next.delete(profileId);
          } else {
            next.add(profileId);
            enabled = true;
          }
          if (profile && !isPreview && isUuid(profileId)) {
            setFollow(profile.id, profileId, enabled);
          }
          return { ...current, followedIds: next };
        });
      },
      resetPreviewProgress() {
        setState(initialState);
      }
    }),
    [isPreview, profile, state]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
}

async function loadRemoteStudyState(userId: string): Promise<StudyState> {
  if (!supabase) return initialState;

  const [attemptsResult, bookmarksResult, followsResult] = await Promise.all([
    supabase
      .from("attempts")
      .select("id, question_id, selected_choice, is_correct, mode, answered_at")
      .eq("user_id", userId)
      .order("answered_at", { ascending: true }),
    supabase.from("bookmarks").select("question_id").eq("user_id", userId),
    supabase.from("follows").select("following_id").eq("follower_id", userId)
  ]);

  return {
    attempts:
      attemptsResult.data?.map((row) => ({
        id: String(row.id),
        questionId: String(row.question_id),
        selectedChoice: String(row.selected_choice),
        isCorrect: Boolean(row.is_correct),
        mode: row.mode === "quiz" ? "quiz" : "review",
        answeredAt: String(row.answered_at)
      })) ?? [],
    bookmarkedIds: new Set(bookmarksResult.data?.map((row) => String(row.question_id)) ?? []),
    followedIds: new Set(followsResult.data?.map((row) => String(row.following_id)) ?? [])
  };
}

async function saveAttempt(userId: string, attempt: AttemptRecord) {
  if (!supabase) return;

  await supabase.from("attempts").insert({
    id: attempt.id,
    user_id: userId,
    question_id: attempt.questionId,
    selected_choice: attempt.selectedChoice,
    is_correct: attempt.isCorrect,
    mode: attempt.mode,
    answered_at: attempt.answeredAt
  });
}

async function setBookmark(userId: string, questionId: string, enabled: boolean) {
  if (!supabase) return;
  if (enabled) {
    await supabase.from("bookmarks").upsert({ user_id: userId, question_id: questionId }, { onConflict: "user_id,question_id" });
  } else {
    await supabase.from("bookmarks").delete().eq("user_id", userId).eq("question_id", questionId);
  }
}

async function setFollow(followerId: string, followingId: string, enabled: boolean) {
  if (!supabase) return;
  if (enabled) {
    await supabase.from("follows").upsert({ follower_id: followerId, following_id: followingId }, { onConflict: "follower_id,following_id" });
  } else {
    await supabase.from("follows").delete().eq("follower_id", followerId).eq("following_id", followingId);
  }
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(value);
}

export function useStudy() {
  const context = useContext(StudyContext);
  if (!context) {
    throw new Error("useStudy must be used within StudyProvider");
  }
  return context;
}

function readState(): StudyState {
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return initialState;
    const parsed = JSON.parse(raw) as {
      attempts?: AttemptRecord[];
      bookmarkedIds?: string[];
      followedIds?: string[];
    };
    return {
      attempts: parsed.attempts ?? [],
      bookmarkedIds: new Set(parsed.bookmarkedIds ?? []),
      followedIds: new Set(parsed.followedIds ?? [...initialState.followedIds])
    };
  } catch {
    return initialState;
  }
}
