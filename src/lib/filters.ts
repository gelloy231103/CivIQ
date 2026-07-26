import type { Question, QuestionTopic } from "@/lib/question-model";

export type QuestionFilters = {
  year?: number;
  topic?: QuestionTopic;
  bookmarkedIds?: Set<string>;
  mistakeIds?: Set<string>;
};

export function filterQuestions(questions: Question[], filters: QuestionFilters) {
  return questions.filter((question) => {
    if (filters.year && question.year !== filters.year) return false;
    if (filters.topic && question.topic !== filters.topic) return false;
    if (filters.bookmarkedIds && !filters.bookmarkedIds.has(question.id)) return false;
    if (filters.mistakeIds && !filters.mistakeIds.has(question.id)) return false;
    return true;
  });
}
