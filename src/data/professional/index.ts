import { professional2026Questions } from "@/data/professional/2026";
import { isVerified } from "@/lib/question-model";

export const professionalQuestions = [...professional2026Questions];
export const verifiedProfessionalQuestions = professionalQuestions.filter(isVerified);

export const availableYears = Array.from(new Set(professionalQuestions.map((question) => question.year))).sort(
  (a, b) => b - a
);

export const availableTopics = Array.from(new Set(professionalQuestions.map((question) => question.topic))).sort();
