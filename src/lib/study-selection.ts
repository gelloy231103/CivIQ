import type { Question } from "@/lib/question-model";

export type StudyMode = "review" | "quiz" | "answers";

export type QuizSessionMode = "quick" | "focused" | "mock";

export type StudySelection = {
  year?: number;
  topic?: string;
};

export const DEFAULT_QUIZ_SESSION_MODE: QuizSessionMode = "focused";

export const QUIZ_SESSION_LIMITS: Record<QuizSessionMode, number> = {
  quick: 10,
  focused: 25,
  mock: 170
};

export function studyPath(
  mode: StudyMode,
  selection: StudySelection = {},
  options: { sessionMode?: QuizSessionMode } = {}
) {
  const segments: string[] = [mode];
  if (selection.year) {
    segments.push("year", String(selection.year));
  }
  if (selection.topic) {
    segments.push("topic", encodeURIComponent(selection.topic));
  }
  if (mode === "quiz" && options.sessionMode) {
    segments.push("session", options.sessionMode);
  }
  return `/${segments.join("/")}`;
}

export function parseStudySelection(path: string): StudySelection {
  const segments = path.split("/").filter(Boolean);
  const selection: StudySelection = {};

  for (let index = 0; index < segments.length; index += 1) {
    if (segments[index] === "year") {
      const year = Number(segments[index + 1]);
      if (Number.isInteger(year)) {
        selection.year = year;
      }
    }

    if (segments[index] === "topic" && segments[index + 1]) {
      selection.topic = decodeURIComponent(segments[index + 1]);
    }
  }

  return selection;
}

export function selectionKey(selection: StudySelection) {
  return `${selection.year ?? "all"}:${selection.topic ?? "all"}`;
}

export function selectionFromKey(key: string): StudySelection {
  const [yearSegment, topicSegment] = key.split(":");
  const year = Number(yearSegment);
  return {
    year: Number.isInteger(year) ? year : undefined,
    topic: topicSegment && topicSegment !== "all" ? topicSegment : undefined
  };
}

export function parseQuizSessionMode(path: string): QuizSessionMode {
  const segments = path.split("/").filter(Boolean);
  const sessionIndex = segments.indexOf("session");
  const candidate = sessionIndex > -1 ? segments[sessionIndex + 1] : undefined;
  return isQuizSessionMode(candidate) ? candidate : DEFAULT_QUIZ_SESSION_MODE;
}

export function isQuizSessionMode(value: unknown): value is QuizSessionMode {
  return value === "quick" || value === "focused" || value === "mock";
}

export function filterQuestionsForSelection<T extends Question>(questions: T[], selection: StudySelection) {
  return questions.filter((question) => {
    const matchesYear = selection.year ? question.year === selection.year : true;
    const matchesTopic = selection.topic ? question.topic === selection.topic : true;
    return matchesYear && matchesTopic;
  });
}

export function studySelectionTitle(selection: StudySelection) {
  if (selection.year && selection.topic) return `${selection.year} ${selection.topic}`;
  if (selection.year) return `${selection.year} Reviewer`;
  if (selection.topic) return selection.topic;
  return "All Questions";
}

export function quizSessionTitle(mode: QuizSessionMode) {
  if (mode === "quick") return "Quick Practice";
  if (mode === "mock") return "Mock Exam";
  return "Focused Session";
}

export function quizSessionDescription(mode: QuizSessionMode) {
  if (mode === "quick") return "10 questions for a short study break";
  if (mode === "mock") return "170 questions with exam pacing";
  return "25 questions for steady progress";
}

export function studySelectionDescription(selection: StudySelection, count: number) {
  const noun = count === 1 ? "question" : "questions";
  if (selection.year && selection.topic) return `${count} ${selection.topic} ${noun} from ${selection.year}`;
  if (selection.year) return `${count} answer-key verified ${noun} from ${selection.year}`;
  if (selection.topic) return `${count} answer-key verified ${selection.topic} ${noun}`;
  return `${count} answer-key verified ${noun}`;
}
