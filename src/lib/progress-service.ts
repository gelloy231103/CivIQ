import { verifiedProfessionalQuestions } from "@/data/professional";
import type { AttemptRecord } from "@/lib/question-model";
import { activeMistakeIds, summarizeAttempts } from "@/lib/quiz-engine";

export function buildProgressSnapshot(attempts: AttemptRecord[], bookmarkedIds: Set<string>) {
  const summary = summarizeAttempts(attempts, verifiedProfessionalQuestions.length);
  const mistakeIds = activeMistakeIds(attempts);
  const topicRows = verifiedProfessionalQuestions.map((question) => {
    const questionAttempts = attempts.filter((attempt) => attempt.questionId === question.id);
    const correct = questionAttempts.filter((attempt) => attempt.isCorrect).length;
    return {
      questionId: question.id,
      topic: question.topic,
      attempted: questionAttempts.length,
      correct
    };
  });

  const topics = Array.from(new Set(verifiedProfessionalQuestions.map((question) => question.topic))).map((topic) => {
    const rows = topicRows.filter((row) => row.topic === topic);
    const attempted = rows.reduce((sum, row) => sum + row.attempted, 0);
    const correct = rows.reduce((sum, row) => sum + row.correct, 0);
    return {
      topic,
      attempted,
      accuracy: attempted === 0 ? 0 : (correct / attempted) * 100
    };
  });

  return {
    ...summary,
    mistakeIds,
    bookmarkCount: bookmarkedIds.size,
    topics
  };
}
