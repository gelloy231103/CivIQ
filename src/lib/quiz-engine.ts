import type { AttemptMode, AttemptRecord, Question } from "@/lib/question-model";

export type QuizSession = {
  id: string;
  mode: AttemptMode;
  questions: Question[];
  currentIndex: number;
  answers: Record<string, string>;
};

export function createSession(questions: Question[], mode: AttemptMode = "review", limit = questions.length): QuizSession {
  return {
    id: crypto.randomUUID(),
    mode,
    questions: questions.slice(0, limit),
    currentIndex: 0,
    answers: {}
  };
}

export function checkAnswer(question: Question, selectedChoice: string) {
  return question.answer === selectedChoice;
}

export function createAttempt(question: Question, selectedChoice: string, mode: AttemptMode): AttemptRecord {
  return {
    id: crypto.randomUUID(),
    questionId: question.id,
    selectedChoice,
    isCorrect: checkAnswer(question, selectedChoice),
    mode,
    answeredAt: new Date().toISOString()
  };
}

export function summarizeAttempts(attempts: AttemptRecord[], questionCount: number) {
  const total = attempts.length;
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = total === 0 ? 0 : (correct / total) * 100;
  const completedQuestions = new Set(attempts.map((attempt) => attempt.questionId)).size;

  return {
    total,
    correct,
    incorrect: total - correct,
    accuracy,
    completedQuestions,
    completion: questionCount === 0 ? 0 : (completedQuestions / questionCount) * 100
  };
}

export function activeMistakeIds(attempts: AttemptRecord[]) {
  const byQuestion = new Map<string, AttemptRecord[]>();
  for (const attempt of attempts) {
    byQuestion.set(attempt.questionId, [...(byQuestion.get(attempt.questionId) ?? []), attempt]);
  }

  const mistakes = new Set<string>();
  for (const [questionId, records] of byQuestion) {
    const latest = records[records.length - 1];
    const correctRun = records.slice().reverse().findIndex((attempt) => !attempt.isCorrect);
    if (latest && !latest.isCorrect) {
      mistakes.add(questionId);
    } else if (correctRun > -1 && correctRun < 2) {
      mistakes.add(questionId);
    }
  }

  return mistakes;
}
