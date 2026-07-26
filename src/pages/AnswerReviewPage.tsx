import { Bookmark, CheckCircle2, Library } from "lucide-react";
import { useMemo } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { YearRequiredCard } from "@/components/reviewer/YearRequiredCard";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { getChoice, type Question } from "@/lib/question-model";
import { Link, useRouter } from "@/lib/router";
import {
  filterQuestionsForSelection,
  parseStudySelection,
  studySelectionDescription,
  studySelectionTitle
} from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";
import { cn } from "@/lib/utils";

export function AnswerReviewPage() {
  const { bookmarkedIds, toggleBookmark } = useStudy();
  const { path } = useRouter();
  const selection = useMemo(() => parseStudySelection(path), [path]);
  const questions = useMemo(
    () => filterQuestionsForSelection(verifiedProfessionalQuestions, selection),
    [selection.topic, selection.year]
  );
  const groupedQuestions = useMemo(() => groupQuestionsByTopic(questions), [questions]);

  if (!selection.year) {
    return (
      <YearRequiredCard
        title="Choose a reviewer year"
        description="Answer sheets open by year so users always know which reviewer they are reading."
      />
    );
  }

  if (questions.length === 0) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">No answers found</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm font-semibold leading-6 text-muted-foreground">
              This answer sheet is not available yet. Choose another year or topic from the Library.
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
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="text-3xl font-extrabold">{studySelectionTitle(selection)} Answer Sheet</h1>
          <p className="mt-1 text-sm font-semibold text-muted-foreground">
            {studySelectionDescription(selection, questions.length)} with answers visible.
          </p>
        </div>
        <Button asChild variant="outline">
          <Link to="/library">
            <Library aria-hidden="true" />
            Library
          </Link>
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {groupedQuestions.map((group) => (
          <a
            key={group.topic}
            href={`#${topicAnchor(group.topic)}`}
            className="inline-flex min-h-11 items-center gap-2 rounded-md border bg-card px-3 text-xs font-bold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
          >
            {group.topic}
            <span className="text-muted-foreground/70">{group.questions.length}</span>
          </a>
        ))}
      </div>

      <div className="space-y-6">
        {groupedQuestions.map((group) => (
          <section key={group.topic} id={topicAnchor(group.topic)} className="scroll-mt-24 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-xl font-extrabold">{group.topic}</h2>
              <Badge variant="muted">{group.questions.length} items</Badge>
            </div>
            <div className="grid gap-3">
              {group.questions.map((question, questionIndex) => (
                <AnswerItem
                  key={question.id}
                  bookmarked={bookmarkedIds.has(question.id)}
                  number={questions.indexOf(question) + 1}
                  question={question}
                  topicNumber={questionIndex + 1}
                  onBookmark={() => toggleBookmark(question.id)}
                />
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}

function AnswerItem({
  bookmarked,
  number,
  question,
  topicNumber,
  onBookmark
}: {
  bookmarked: boolean;
  number: number;
  question: Question;
  topicNumber: number;
  onBookmark: () => void;
}) {
  const correctChoice = getChoice(question, question.answer);

  return (
    <Card>
      <CardHeader className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="gold">Question {number}</Badge>
            <Badge variant="muted">#{topicNumber} in {question.topic}</Badge>
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={onBookmark}
            aria-label={bookmarked ? "Remove bookmark" : "Save bookmark"}
          >
            <Bookmark className={cn(bookmarked && "fill-accent text-accent")} aria-hidden="true" />
          </Button>
        </div>
        <CardTitle className="text-lg leading-7">{question.question}</CardTitle>
        {question.imageUrl ? (
          <div className="overflow-hidden rounded-md border bg-white p-2">
            <img
              src={question.imageUrl}
              alt={question.imageAlt ?? question.question}
              className="mx-auto max-h-[28rem] w-full object-contain"
              loading="lazy"
            />
          </div>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-2">
          {question.choices.map((choice) => {
            const correct = choice.id === question.answer;
            return (
              <div
                key={choice.id}
                className={cn(
                  "flex min-h-12 items-start gap-3 rounded-md border bg-card p-3 text-sm font-semibold",
                  correct && "border-success bg-success/10"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-extrabold",
                    correct && "bg-success text-success-foreground"
                  )}
                >
                  {choice.id}
                </span>
                <span className="leading-6">{choice.text}</span>
              </div>
            );
          })}
        </div>
        <div className="rounded-md border bg-muted/50 p-4">
          <div className="flex items-start gap-2 font-bold">
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-success" aria-hidden="true" />
            <p>
              Correct answer: {question.answer}
              {correctChoice ? `, ${correctChoice.text}` : ""}
            </p>
          </div>
          <p className="mt-3 text-sm leading-6">{question.explanation}</p>
        </div>
      </CardContent>
    </Card>
  );
}

function groupQuestionsByTopic(questions: Question[]) {
  const groups = new Map<string, Question[]>();
  for (const question of questions) {
    groups.set(question.topic, [...(groups.get(question.topic) ?? []), question]);
  }
  return [...groups.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([topic, items]) => ({ topic, questions: items }));
}

function topicAnchor(topic: string) {
  return topic.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}
