import generatedQuestions from "@/data/professional/2026.generated.json";
import numberSeriesQuestions from "@/data/professional/2026.number-series.generated.json";
import type { Question } from "@/lib/question-model";

export const professional2026Questions = [...generatedQuestions, ...numberSeriesQuestions] as Question[];
