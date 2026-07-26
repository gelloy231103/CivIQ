import { describe, expect, it } from "vitest";
import { availableYears, professionalQuestions, verifiedProfessionalQuestions } from "@/data/professional";

describe("professional question bank", () => {
  it("includes the generated archive years", () => {
    expect(availableYears).toEqual([2026, 2022, 2018, 2017]);
    expect(countQuestionsByYear()).toMatchObject({
      2017: 185,
      2018: 178,
      2022: 181,
      2026: 567
    });
  });

  it("keeps public source labels clean", () => {
    for (const question of professionalQuestions) {
      expect(question.source).not.toMatch(/reviewers|source-\d|[\\/]/i);
    }
  });

  it("exports verified archive questions with matching answer choices", () => {
    const archiveQuestions = professionalQuestions.filter((question) => question.id.includes("complete-reviewer") || question.id.includes("1taker-drill"));
    expect(archiveQuestions).toHaveLength(544);

    for (const question of archiveQuestions) {
      expect(question.status).toBe("verified");
      expect(question.explanation).toBeTruthy();
      expect(question.choices.length).toBeGreaterThanOrEqual(4);
      expect(question.choices.map((choice) => choice.id)).toContain(question.answer);
    }

    expect(verifiedProfessionalQuestions).toHaveLength(professionalQuestions.length);
  });
});

function countQuestionsByYear() {
  return professionalQuestions.reduce<Record<number, number>>((counts, question) => {
    counts[question.year] = (counts[question.year] ?? 0) + 1;
    return counts;
  }, {});
}
