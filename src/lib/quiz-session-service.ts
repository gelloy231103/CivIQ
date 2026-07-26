import type { AttemptRecord, Question } from "@/lib/question-model";
import { supabase } from "@/lib/supabase";
import {
  QUIZ_SESSION_LIMITS,
  selectionKey,
  type QuizSessionMode,
  type StudySelection
} from "@/lib/study-selection";

export type QuizSession = {
  id: string;
  userId: string;
  selectionKey: string;
  mode: QuizSessionMode;
  questionIds: string[];
  currentIndex: number;
  answers: Record<string, string>;
  startedAt: string;
  lastUpdatedAt: string;
  finishedAt?: string;
};

type QuizSessionRow = {
  id: string;
  user_id: string;
  selection_key: string;
  mode: string;
  question_ids: string[];
  current_index: number;
  answers: unknown;
  started_at: string;
  last_updated_at: string;
  finished_at: string | null;
};

const storageKey = "civiq-quiz-sessions-v1";

export function createQuizSession(
  userId: string,
  selection: StudySelection,
  mode: QuizSessionMode,
  questions: Question[],
  attempts: AttemptRecord[]
): QuizSession {
  const now = new Date().toISOString();
  return {
    id: createId(),
    userId,
    selectionKey: selectionKey(selection),
    mode,
    questionIds: buildSessionQuestionIds(questions, mode, attempts),
    currentIndex: 0,
    answers: {},
    startedAt: now,
    lastUpdatedAt: now
  };
}

export function buildSessionQuestionIds(questions: Question[], mode: QuizSessionMode, attempts: AttemptRecord[]) {
  const limit = Math.min(QUIZ_SESSION_LIMITS[mode], questions.length);
  const attemptedIds = new Set(attempts.map((attempt) => attempt.questionId));
  const prioritized = [...questions].sort((left, right) => {
    const leftAttempted = attemptedIds.has(left.id) ? 1 : 0;
    const rightAttempted = attemptedIds.has(right.id) ? 1 : 0;
    return leftAttempted - rightAttempted;
  });
  const topics = new Set(prioritized.map((question) => question.topic));
  const ordered = topics.size > 1 ? balanceByTopic(prioritized) : prioritized;
  return ordered.slice(0, limit).map((question) => question.id);
}

export function getActiveLocalQuizSession(userId: string, sessionKey: string, mode: QuizSessionMode) {
  return readLocalQuizSessions()
    .filter(
      (session) =>
        session.userId === userId &&
        session.selectionKey === sessionKey &&
        session.mode === mode &&
        !session.finishedAt
    )
    .sort(compareUpdatedDesc)[0] ?? null;
}

export function getActiveLocalQuizSessions(userId: string) {
  return readLocalQuizSessions()
    .filter((session) => session.userId === userId && !session.finishedAt)
    .sort(compareUpdatedDesc);
}

export function saveLocalQuizSession(session: QuizSession) {
  const sessions = readLocalQuizSessions();
  const next = sessions.filter((item) => {
    if (item.id === session.id) return false;
    if (session.finishedAt) return true;
    return !(
      !item.finishedAt &&
      item.userId === session.userId &&
      item.selectionKey === session.selectionKey &&
      item.mode === session.mode
    );
  });
  next.push(session);
  writeLocalQuizSessions(next.slice(-60));
}

export function deleteActiveLocalQuizSession(userId: string, sessionKey: string, mode: QuizSessionMode) {
  writeLocalQuizSessions(
    readLocalQuizSessions().filter(
      (session) =>
        !(
          session.userId === userId &&
          session.selectionKey === sessionKey &&
          session.mode === mode &&
          !session.finishedAt
        )
    )
  );
}

export async function getActiveRemoteQuizSession(userId: string, sessionKey: string, mode: QuizSessionMode) {
  if (!supabase) return null;
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("id, user_id, selection_key, mode, question_ids, current_index, answers, started_at, last_updated_at, finished_at")
    .eq("user_id", userId)
    .eq("selection_key", sessionKey)
    .eq("mode", mode)
    .is("finished_at", null)
    .order("last_updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error || !data) return null;
  return rowToSession(data as QuizSessionRow);
}

export async function getActiveRemoteQuizSessions(userId: string) {
  if (!supabase) return [];
  const { data, error } = await supabase
    .from("quiz_sessions")
    .select("id, user_id, selection_key, mode, question_ids, current_index, answers, started_at, last_updated_at, finished_at")
    .eq("user_id", userId)
    .is("finished_at", null)
    .order("last_updated_at", { ascending: false });
  if (error || !data) return [];
  return data.map((row) => rowToSession(row as QuizSessionRow));
}

export async function saveRemoteQuizSession(session: QuizSession) {
  if (!supabase) return null;
  if (!session.finishedAt) {
    const { error: deleteError } = await supabase
      .from("quiz_sessions")
      .delete()
      .eq("user_id", session.userId)
      .eq("selection_key", session.selectionKey)
      .eq("mode", session.mode)
      .is("finished_at", null)
      .neq("id", session.id);
    if (deleteError) return deleteError.message;
  }
  const { error } = await supabase
    .from("quiz_sessions")
    .upsert(toRow(session), { onConflict: "id" });
  return error?.message ?? null;
}

export async function deleteActiveRemoteQuizSession(userId: string, sessionKey: string, mode: QuizSessionMode) {
  if (!supabase) return null;
  const { error } = await supabase
    .from("quiz_sessions")
    .delete()
    .eq("user_id", userId)
    .eq("selection_key", sessionKey)
    .eq("mode", mode)
    .is("finished_at", null);
  return error?.message ?? null;
}

export function newestQuizSession(...sessions: Array<QuizSession | null | undefined>) {
  return sessions.filter((session): session is QuizSession => Boolean(session)).sort(compareUpdatedDesc)[0] ?? null;
}

export function mergeQuizSessions(sessions: QuizSession[]) {
  const byKey = new Map<string, QuizSession>();
  for (const session of sessions) {
    const key = `${session.userId}:${session.selectionKey}:${session.mode}`;
    const existing = byKey.get(key);
    if (!existing || compareUpdatedDesc(session, existing) < 0) {
      byKey.set(key, session);
    }
  }
  return [...byKey.values()].sort(compareUpdatedDesc);
}

export function updateQuizSession(session: QuizSession, patch: Partial<QuizSession>) {
  return {
    ...session,
    ...patch,
    lastUpdatedAt: new Date().toISOString()
  };
}

function balanceByTopic(questions: Question[]) {
  const groups = new Map<string, Question[]>();
  for (const question of questions) {
    groups.set(question.topic, [...(groups.get(question.topic) ?? []), question]);
  }

  const topics = [...groups.keys()].sort();
  const balanced: Question[] = [];
  while (balanced.length < questions.length) {
    let moved = false;
    for (const topic of topics) {
      const next = groups.get(topic)?.shift();
      if (next) {
        balanced.push(next);
        moved = true;
      }
    }
    if (!moved) break;
  }
  return balanced;
}

function readLocalQuizSessions(): QuizSession[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as QuizSession[];
    return Array.isArray(parsed) ? parsed.filter(isValidSession) : [];
  } catch {
    return [];
  }
}

function writeLocalQuizSessions(sessions: QuizSession[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(storageKey, JSON.stringify(sessions));
}

function isValidSession(value: unknown): value is QuizSession {
  if (!value || typeof value !== "object") return false;
  const candidate = value as QuizSession;
  return (
    typeof candidate.id === "string" &&
    typeof candidate.userId === "string" &&
    typeof candidate.selectionKey === "string" &&
    (candidate.mode === "quick" || candidate.mode === "focused" || candidate.mode === "mock") &&
    Array.isArray(candidate.questionIds) &&
    typeof candidate.currentIndex === "number" &&
    typeof candidate.answers === "object" &&
    typeof candidate.startedAt === "string" &&
    typeof candidate.lastUpdatedAt === "string"
  );
}

function rowToSession(row: QuizSessionRow): QuizSession {
  return {
    id: row.id,
    userId: row.user_id,
    selectionKey: row.selection_key,
    mode: row.mode === "quick" || row.mode === "mock" ? row.mode : "focused",
    questionIds: Array.isArray(row.question_ids) ? row.question_ids.map(String) : [],
    currentIndex: Number(row.current_index ?? 0),
    answers: normalizeAnswers(row.answers),
    startedAt: row.started_at,
    lastUpdatedAt: row.last_updated_at,
    finishedAt: row.finished_at ?? undefined
  };
}

function toRow(session: QuizSession) {
  return {
    id: session.id,
    user_id: session.userId,
    selection_key: session.selectionKey,
    mode: session.mode,
    question_ids: session.questionIds,
    current_index: session.currentIndex,
    answers: session.answers,
    started_at: session.startedAt,
    last_updated_at: session.lastUpdatedAt,
    finished_at: session.finishedAt ?? null
  };
}

function normalizeAnswers(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>)
      .filter(([, answer]) => typeof answer === "string")
      .map(([questionId, answer]) => [questionId, answer as string])
  );
}

function compareUpdatedDesc(left: QuizSession, right: QuizSession) {
  return Date.parse(right.lastUpdatedAt) - Date.parse(left.lastUpdatedAt);
}

function createId() {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}
