import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Library, RotateCcw } from "lucide-react";
import { QuestionTimer } from "@/components/reviewer/QuestionTimer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { QUESTION_TARGET_SECONDS } from "@/lib/exam-timing";
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
import { cn, formatPercent } from "@/lib/utils";

export function QuizPage() {
  const { answerQuestion } = useStudy();
  const { path } = useRouter();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const selection = useMemo(() => parseStudySelection(path), [path]);
  const currentSelectionKey = selectionKey(selection);
  const questions = useMemo(
    () => filterQuestionsForSelection(verifiedProfessionalQuestions, selection),
    [selection.topic, selection.year]
  );
  const question = questions[index];
  const answeredCount = Object.keys(answers).length;
  const correctCount = questions.filter((item) => answers[item.id] === item.answer).length;
  const missedCount = answeredCount - correctCount;
  const totalQuestions = questions.length;
  const currentAnswer = question ? answers[question.id] : undefined;
  const isLastQuestion = index === totalQuestions - 1;

  useEffect(() => {
    setIndex(0);
    setAnswers({});
    setFinished(false);
  }, [currentSelectionKey]);

  function choose(choiceId: string) {
    if (!question) return;
    if (answers[question.id]) return;
    setAnswers((current) => ({ ...current, [question.id]: choiceId }));
    answerQuestion(question.id, choiceId, "quiz");
  }

  function goNext() {
    if (!currentAnswer) return;
    if (isLastQuestion) {
      setFinished(true);
      return;
    }
    setIndex((current) => Math.min(totalQuestions - 1, current + 1));
  }

  function restartQuiz() {
    setIndex(0);
    setAnswers({});
    setFinished(false);
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
              This quiz set is not available yet. Choose another year or topic from the Library.
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

  if (finished) {
    const accuracy = answeredCount === 0 ? 0 : (correctCount / answeredCount) * 100;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-success text-success-foreground">
              <CheckCircle2 className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-3xl">Quiz complete</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div className="grid gap-3 sm:grid-cols-4">
              <Result label="Answered" value={answeredCount} />
              <Result label="Correct" value={correctCount} />
              <Result label="Missed" value={missedCount} />
              <Result label="Accuracy" value={formatPercent(accuracy)} />
            </div>
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={restartQuiz} variant="outline">
                <RotateCcw aria-hidden="true" />
                Try again
              </Button>
              {missedCount > 0 ? (
                <Button asChild variant="outline">
                  <Link to="/mistakes">Review mistakes</Link>
                </Button>
              ) : (
                <Button asChild variant="outline">
                  <Link to={studyPath("review", selection)}>Continue review</Link>
                </Button>
              )}
              <Button asChild>
                <Link to="/progress">View progress</Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">{studySelectionTitle(selection)} Quiz</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {studySelectionDescription(selection, totalQuestions)} - {QUESTION_TARGET_SECONDS}s target per question
        </p>
      </div>
      <Progress value={(answeredCount / totalQuestions) * 100} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="gold">{question.year}</Badge>
            <span className="text-sm font-semibold text-muted-foreground">
              {index + 1} / {totalQuestions}
            </span>
          </div>
          <QuestionTimer resetKey={question.id} paused={Boolean(currentAnswer)} />
          <CardTitle className="pt-3 text-xl leading-8">{question.question}</CardTitle>
          {question.imageUrl ? (
            <div className="mt-4 overflow-hidden rounded-md border bg-white p-2">
              <img
                src={question.imageUrl}
                alt={question.imageAlt ?? question.question}
                className="mx-auto max-h-[32rem] w-full object-contain"
                loading="lazy"
              />
            </div>
          ) : null}
        </CardHeader>
        <CardContent className="space-y-3">
          {question.choices.map((choice) => {
            const selected = currentAnswer === choice.id;
            return (
              <button
                key={choice.id}
                aria-pressed={selected}
                className={cn(
                  "flex min-h-14 w-full items-center gap-3 rounded-md border bg-card p-4 text-left text-sm font-semibold hover:bg-muted",
                  selected && "border-primary bg-primary/10"
                )}
                type="button"
                onClick={() => choose(choice.id)}
              >
                <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-extrabold">
                  {choice.id}
                </span>
                {choice.text}
              </button>
            );
          })}
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" onClick={() => setFinished(true)} disabled={answeredCount === 0}>
              Finish now
            </Button>
            <Button
              onClick={goNext}
              disabled={!currentAnswer}
            >
              {isLastQuestion ? "See results" : "Next"}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function Result({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="rounded-md border bg-muted/40 p-4">
      <p className="text-sm font-semibold text-muted-foreground">{label}</p>
      <p className="mt-1 text-2xl font-extrabold">{value}</p>
    </div>
  );
}
