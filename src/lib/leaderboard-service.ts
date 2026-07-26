import type { AttemptRecord, LeaderboardStat, Profile } from "@/lib/question-model";

export const sampleFriends: Profile[] = [
  {
    id: "friend-mara",
    username: "mara",
    displayName: "Mara Santos",
    visibility: "global",
    joinedAt: "2026-07-01T00:00:00.000Z"
  },
  {
    id: "friend-joel",
    username: "joel",
    displayName: "Joel Reyes",
    visibility: "friends",
    joinedAt: "2026-07-05T00:00:00.000Z"
  },
  {
    id: "friend-ana",
    username: "ana",
    displayName: "Ana Cruz",
    visibility: "global",
    joinedAt: "2026-07-08T00:00:00.000Z"
  }
];

export const sampleFriendStats: Record<string, LeaderboardStat> = {
  "friend-mara": { userId: "friend-mara", score: 148, accuracy: 84, completedQuestions: 132, currentStreak: 9, bestStreak: 16 },
  "friend-joel": { userId: "friend-joel", score: 121, accuracy: 79, completedQuestions: 110, currentStreak: 5, bestStreak: 11 },
  "friend-ana": { userId: "friend-ana", score: 103, accuracy: 76, completedQuestions: 94, currentStreak: 3, bestStreak: 8 }
};

export function calculateLeaderboardStat(userId: string, attempts: AttemptRecord[], questionCount: number): LeaderboardStat {
  const correctQuestionIds = new Set(attempts.filter((attempt) => attempt.isCorrect).map((attempt) => attempt.questionId));
  const attemptedQuestionIds = new Set(attempts.map((attempt) => attempt.questionId));
  const correct = attempts.filter((attempt) => attempt.isCorrect).length;
  const accuracy = attempts.length === 0 ? 0 : Math.round((correct / attempts.length) * 100);
  const completionBonus = questionCount > 0 && attemptedQuestionIds.size === questionCount ? 10 : 0;
  const currentStreak = calculateCurrentStreak(attempts);
  const bestStreak = calculateBestStreak(attempts);

  return {
    userId,
    score: correctQuestionIds.size + currentStreak * 2 + completionBonus,
    accuracy,
    completedQuestions: attemptedQuestionIds.size,
    currentStreak,
    bestStreak
  };
}

export function calculateCurrentStreak(attempts: AttemptRecord[]) {
  let streak = 0;
  for (const attempt of attempts.slice().reverse()) {
    if (!attempt.isCorrect) break;
    streak += 1;
  }
  return streak;
}

export function calculateBestStreak(attempts: AttemptRecord[]) {
  let best = 0;
  let current = 0;
  for (const attempt of attempts) {
    if (attempt.isCorrect) {
      current += 1;
      best = Math.max(best, current);
    } else {
      current = 0;
    }
  }
  return best;
}
