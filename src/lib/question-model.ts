export type ExamLevel = "professional";

export type QuestionStatus = "draft" | "needs_answer" | "needs_explanation" | "verified";

export type QuestionTopic =
  | "Vocabulary"
  | "Grammar"
  | "Reading Comprehension"
  | "Analogy"
  | "Logic"
  | "Numerical Reasoning"
  | "Paragraph Organization"
  | "General Information"
  | "Clerical Operations"
  | "Abstract Reasoning"
  | "Filipino"
  | "Philippine Constitution";

export type Choice = {
  id: string;
  text: string;
};

export type Question = {
  id: string;
  examLevel: ExamLevel;
  year: number;
  source: string;
  topic: QuestionTopic;
  question: string;
  imageUrl?: string;
  imageAlt?: string;
  choices: Choice[];
  answer: string;
  explanation: string;
  feedback: {
    correct: string;
    incorrect: string;
  };
  status: QuestionStatus;
};

export type AttemptMode = "review" | "quiz";

export type AttemptRecord = {
  id: string;
  questionId: string;
  selectedChoice: string;
  isCorrect: boolean;
  mode: AttemptMode;
  answeredAt: string;
};

export type ProfileVisibility = "friends" | "global";

export type Profile = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  visibility: ProfileVisibility;
  joinedAt: string;
};

export type LeaderboardStat = {
  userId: string;
  score: number;
  accuracy: number;
  completedQuestions: number;
  currentStreak: number;
  bestStreak: number;
};

export function getChoice(question: Question, choiceId: string) {
  return question.choices.find((choice) => choice.id === choiceId);
}

export function isVerified(question: Question) {
  return question.status === "verified" && Boolean(question.answer) && Boolean(question.explanation);
}
