import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { sampleFriends } from "@/lib/leaderboard-service";
import type { AttemptMode, AttemptRecord } from "@/lib/question-model";
import { createAttempt } from "@/lib/quiz-engine";

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
  followedIds: new Set(sampleFriends.slice(0, 2).map((profile) => profile.id))
};

export function StudyProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<StudyState>(() => readState());

  useEffect(() => {
    const serialized = {
      attempts: state.attempts,
      bookmarkedIds: [...state.bookmarkedIds],
      followedIds: [...state.followedIds]
    };
    localStorage.setItem(storageKey, JSON.stringify(serialized));
  }, [state]);

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
        return attempt;
      },
      toggleBookmark(questionId) {
        setState((current) => {
          const next = new Set(current.bookmarkedIds);
          if (next.has(questionId)) {
            next.delete(questionId);
          } else {
            next.add(questionId);
          }
          return { ...current, bookmarkedIds: next };
        });
      },
      toggleFollow(profileId) {
        setState((current) => {
          const next = new Set(current.followedIds);
          if (next.has(profileId)) {
            next.delete(profileId);
          } else {
            next.add(profileId);
          }
          return { ...current, followedIds: next };
        });
      },
      resetPreviewProgress() {
        setState(initialState);
      }
    }),
    [state]
  );

  return <StudyContext.Provider value={value}>{children}</StudyContext.Provider>;
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
