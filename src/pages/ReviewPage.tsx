import { Library } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReviewCard } from "@/components/reviewer/ReviewCard";
import { YearRequiredCard } from "@/components/reviewer/YearRequiredCard";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { Link, useRouter } from "@/lib/router";
import {
  filterQuestionsForSelection,
  parseStudySelection,
  selectionKey,
  studySelectionDescription,
  studySelectionTitle
} from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";

export function ReviewPage() {
  const { answerQuestion, bookmarkedIds, toggleBookmark } = useStudy();
  const { path } = useRouter();
  const [index, setIndex] = useState(0);
  const selection = useMemo(() => parseStudySelection(path), [path]);
  const currentSelectionKey = selectionKey(selection);
  const questions = useMemo(
    () => filterQuestionsForSelection(verifiedProfessionalQuestions, selection),
    [selection.topic, selection.year]
  );
  const question = questions[index];

  useEffect(() => {
    setIndex(0);
  }, [currentSelectionKey]);

  if (!selection.year) {
    return (
      <YearRequiredCard
        title="Choose a reviewer year"
        description="Review opens by year so the question set is clear before you start."
      />
    );
  }

  if (!question) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">No questions found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              This study set is not available yet. Choose another year or topic from the Library.
            </p>
            <Button asChild>
              <Link to="/library">
                <Library aria-hidden="true" />
                Open Library
              </Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">{studySelectionTitle(selection)}</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {studySelectionDescription(selection, questions.length)}
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
