import { describe, expect, it } from "vitest";
import type { Question } from "@/lib/question-model";
import { filterQuestionsForSelection, parseQuizSessionMode, parseStudySelection, studyPath } from "@/lib/study-selection";

describe("study selection", () => {
  it("builds and parses year, topic, and quiz session paths", () => {
    const path = studyPath("quiz", { year: 2026, topic: "Reading Comprehension" }, { sessionMode: "quick" });

    expect(path).toBe("/quiz/year/2026/topic/Reading%20Comprehension/session/quick");
    expect(parseStudySelection(path)).toEqual({ year: 2026, topic: "Reading Comprehension" });
    expect(parseQuizSessionMode(path)).toBe("quick");
  });

  it("falls back to focused sessions when the path has no valid session mode", () => {
    expect(parseQuizSessionMode("/quiz/year/2026/session/long")).toBe("focused");
  });

  it("filters questions by selected reviewer year and topic", () => {
    const questions = [
      question("q1", 2026, "Vocabulary"),
      question("q2", 2026, "Grammar"),
      question("q3", 2022, "Vocabulary")
    ];

    expect(filterQuestionsForSelection(questions, { year: 2026 }).map((item) => item.id)).toEqual(["q1", "q2"]);
    expect(filterQuestionsForSelection(questions, { year: 2026, topic: "Vocabulary" }).map((item) => item.id)).toEqual(["q1"]);
  });
});

function question(id: string, year: number, topic: Question["topic"]): Question {
  return {
    id,
    examLevel: "professional",
    year,
    source: "test",
    topic,
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
