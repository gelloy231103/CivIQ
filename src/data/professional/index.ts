import archive2017Questions from "@/data/professional/2017.complete-reviewer.generated.json";
import archive2018Questions from "@/data/professional/2018.complete-reviewer.generated.json";
import archive2022Questions from "@/data/professional/2022.1taker-drill.generated.json";
import { professional2026Questions } from "@/data/professional/2026";
import { isVerified } from "@/lib/question-model";
import type { Question } from "@/lib/question-model";

const professionalArchiveQuestions = [
  ...archive2022Questions,
  ...archive2018Questions,
  ...archive2017Questions
] as Question[];

export const professionalQuestions: Question[] = [
  ...professional2026Questions,
  ...professionalArchiveQuestions
];
export const verifiedProfessionalQuestions = professionalQuestions.filter(isVerified);

export const availableYears = Array.from(new Set(professionalQuestions.map((question) => question.year))).sort(
  (a, b) => b - a
);

export const availableTopics = Array.from(new Set(professionalQuestions.map((question) => question.topic))).sort();
