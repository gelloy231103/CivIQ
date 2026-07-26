import { describe, expect, it } from "vitest";
import type { AttemptRecord, Question } from "@/lib/question-model";
import { buildSessionQuestionIds, mergeQuizSessions, type QuizSession } from "@/lib/quiz-session-service";

describe("quiz session service", () => {
  it("builds quick sessions from unanswered questions first", () => {
    const questions = Array.from({ length: 12 }, (_, index) => question(`q${index + 1}`));
    const attempts: AttemptRecord[] = [
      attempt("q1"),
      attempt("q2"),
      attempt("q3")
    ];

    const ids = buildSessionQuestionIds(questions, "quick", attempts);

    expect(ids).toHaveLength(10);
    expect(ids.slice(0, 3)).toEqual(["q4", "q5", "q6"]);
  });

  it("keeps the newest active session for each user, selection, and mode", () => {
    const older = session("older", "user-1", "2026:all", "focused", "2026-07-26T08:00:00.000Z");
    const newer = session("newer", "user-1", "2026:all", "focused", "2026-07-26T09:00:00.000Z");
    const quick = session("quick", "user-1", "2026:all", "quick", "2026-07-26T07:00:00.000Z");

    expect(mergeQuizSessions([older, newer, quick]).map((item) => item.id)).toEqual(["newer", "quick"]);
  });
});

function question(id: string): Question {
  return {
    id,
    examLevel: "professional",
    year: 2026,
    source: "test",
    topic: "Vocabulary",
    question: "Question?",
    choices: [
      { id: "A", text: "A" },
      { id: "B", text: "B" }
    ],
    answer: "A",
    explanation: "Because A.",
    feedback: {
      correct: "Correct.",
      incorrect: "Incorrect."
    },
    status: "verified"
  };
}

function attempt(questionId: string): AttemptRecord {
  return {
    id: `attempt-${questionId}`,
    questionId,
    selectedChoice: "A",
    isCorrect: true,
    mode: "quiz",
    answeredAt: "2026-07-26T08:00:00.000Z"
  };
}

function session(id: string, userId: string, selectionKey: string, mode: QuizSession["mode"], lastUpdatedAt: string): QuizSession {
  return {
    id,
    userId,
    selectionKey,
    mode,
    questionIds: ["q1", "q2"],
    currentIndex: 1,
    answers: { q1: "A" },
    startedAt: "2026-07-26T07:00:00.000Z",
    lastUpdatedAt
  };
}
