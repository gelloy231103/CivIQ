import { useMemo, useState } from "react";
import { ReviewCard } from "@/components/reviewer/ReviewCard";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useStudy } from "@/lib/study-state";

export function ReviewPage() {
  const { answerQuestion, bookmarkedIds, toggleBookmark } = useStudy();
  const [index, setIndex] = useState(0);
  const questions = useMemo(() => verifiedProfessionalQuestions, []);
  const question = questions[index];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Card Review</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {questions.length} questions in this set
        </p>
      </div>
      <ReviewCard
        key={question.id}
        question={question}
        index={index}
        total={questions.length}
        bookmarked={bookmarkedIds.has(question.id)}
        onBookmark={() => toggleBookmark(question.id)}
        onAnswer={(choiceId) => answerQuestion(question.id, choiceId, "review")}
        onNext={() => setIndex((current) => (current + 1) % questions.length)}
        onPrevious={() => setIndex((current) => Math.max(0, current - 1))}
      />
    </div>
  );
}
