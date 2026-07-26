import { ArrowRight, Brain, CheckCircle2, Library } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ReviewCard } from "@/components/reviewer/ReviewCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availableYears, verifiedProfessionalQuestions } from "@/data/professional";
import { Link, useRouter } from "@/lib/router";
import {
  filterQuestionsForSelection,
  parseStudySelection,
  selectionKey,
  studyPath,
  studySelectionDescription,
  studySelectionTitle
} from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";

export function ReviewPage() {
  const { answerQuestion, attempts, bookmarkedIds, toggleBookmark } = useStudy();
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
    return <ReviewChooser attempts={attempts} />;
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
              This study set is not available yet. Choose another year or topic from Review.
            </p>
            <Button asChild>
              <Link to="/review">
                <Brain aria-hidden="true" />
                Choose review set
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
        <Button asChild className="mt-3" variant="outline">
          <Link to="/review">
            <Library aria-hidden="true" />
            Change review set
          </Link>
        </Button>
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

function ReviewChooser({ attempts }: { attempts: ReturnType<typeof useStudy>["attempts"] }) {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Review</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          Choose a year or topic before opening the review cards.
        </p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {availableYears.map((year) => {
          const yearQuestions = verifiedProfessionalQuestions.filter((question) => question.year === year);
          const yearTopics = Array.from(new Set(yearQuestions.map((question) => question.topic))).sort();
          const attemptedInYear = new Set(
            attempts
              .filter((attempt) => yearQuestions.some((question) => question.id === attempt.questionId))
              .map((attempt) => attempt.questionId)
          ).size;
          const yearCompletion = yearQuestions.length === 0 ? 0 : (attemptedInYear / yearQuestions.length) * 100;

          return (
            <Card key={year} className="overflow-hidden">
              <CardHeader>
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <CardTitle>{year} Reviewer</CardTitle>
                    <CardDescription>
                      {yearQuestions.length} verified questions across {yearTopics.length} topics
                    </CardDescription>
                  </div>
                  <Badge variant="gold">
                    <CheckCircle2 aria-hidden="true" />
                    ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={yearCompletion} />
                <Button asChild className="w-full">
                  <Link to={studyPath("review", { year })}>
                    <Brain aria-hidden="true" />
                    Start all {year}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <div className="flex flex-wrap gap-2">
                  {yearTopics.map((topic) => {
                    const topicCount = yearQuestions.filter((question) => question.topic === topic).length;
                    return (
                      <Link
                        key={topic}
                        to={studyPath("review", { year, topic })}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                        aria-label={`Review ${topic} from ${year}`}
                      >
                        {topic}
                        <span className="text-muted-foreground/70">{topicCount}</span>
                      </Link>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
