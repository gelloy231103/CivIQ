import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";
import { cn, formatPercent } from "@/lib/utils";

export function QuizPage() {
  const { answerQuestion } = useStudy();
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [finished, setFinished] = useState(false);
  const question = verifiedProfessionalQuestions[index];
  const answeredCount = Object.keys(answers).length;
  const correctCount = verifiedProfessionalQuestions.filter((item) => answers[item.id] === item.answer).length;

  function choose(choiceId: string) {
    if (answers[question.id]) return;
    setAnswers((current) => ({ ...current, [question.id]: choiceId }));
    answerQuestion(question.id, choiceId, "quiz");
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
            <div className="grid gap-3 sm:grid-cols-3">
              <Result label="Answered" value={answeredCount} />
              <Result label="Correct" value={correctCount} />
              <Result label="Accuracy" value={formatPercent(accuracy)} />
            </div>
            <Button asChild className="w-full">
              <Link to="/progress">Review progress</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Quiz</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Untimed Professional practice</p>
      </div>
      <Progress value={(answeredCount / verifiedProfessionalQuestions.length) * 100} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="gold">{question.year}</Badge>
            <span className="text-sm font-semibold text-muted-foreground">
              {index + 1} / {verifiedProfessionalQuestions.length}
            </span>
          </div>
          <CardTitle className="pt-3 text-xl leading-8">{question.question}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {question.choices.map((choice) => {
            const selected = answers[question.id] === choice.id;
            return (
              <button
                key={choice.id}
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
            <Button
              variant="outline"
              onClick={() => setIndex((current) => Math.min(verifiedProfessionalQuestions.length - 1, current + 1))}
              disabled={!answers[question.id] || index === verifiedProfessionalQuestions.length - 1}
            >
              Next
            </Button>
            <Button onClick={() => setFinished(true)} disabled={answeredCount === 0}>
              Finish
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
