import type { Question } from "@/lib/question-model";

export type StudyMode = "review" | "quiz";

export type StudySelection = {
  year?: number;
  topic?: string;
};

export function studyPath(mode: StudyMode, selection: StudySelection = {}) {
  const segments: string[] = [mode];
  if (selection.year) {
    segments.push("year", String(selection.year));
  }
  if (selection.topic) {
    segments.push("topic", encodeURIComponent(selection.topic));
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

export function studySelectionDescription(selection: StudySelection, count: number) {
  const noun = count === 1 ? "question" : "questions";
  if (selection.year && selection.topic) return `${count} ${selection.topic} ${noun} from ${selection.year}`;
  if (selection.year) return `${count} answer-key verified ${noun} from ${selection.year}`;
  if (selection.topic) return `${count} answer-key verified ${selection.topic} ${noun}`;
  return `${count} answer-key verified ${noun}`;
}
