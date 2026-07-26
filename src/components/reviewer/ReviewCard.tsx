import { Bookmark, CheckCircle2, Lightbulb, XCircle } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { requestAiExplanation } from "@/lib/ai-explanations";
import type { Question } from "@/lib/question-model";
import { getChoice } from "@/lib/question-model";
import { cn } from "@/lib/utils";

type ReviewCardProps = {
  question: Question;
  index: number;
  total: number;
  bookmarked: boolean;
  onBookmark: () => void;
  onAnswer: (choiceId: string) => void;
  onNext: () => void;
  onPrevious: () => void;
};

export function ReviewCard({
  question,
  index,
  total,
  bookmarked,
  onBookmark,
  onAnswer,
  onNext,
  onPrevious
}: ReviewCardProps) {
  const [selectedChoice, setSelectedChoice] = useState<string | null>(null);
  const [aiExplanation, setAiExplanation] = useState<string | null>(null);
  const [aiSource, setAiSource] = useState<"cache" | "provider" | "fallback" | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const answered = Boolean(selectedChoice);
  const isCorrect = selectedChoice === question.answer;

  function choose(choiceId: string) {
    if (answered) return;
    setSelectedChoice(choiceId);
    onAnswer(choiceId);
  }

  async function explain() {
    setAiLoading(true);
    try {
      const result = await requestAiExplanation(question, selectedChoice ?? undefined);
      setAiExplanation(result.explanation);
      setAiSource(result.source);
    } finally {
      setAiLoading(false);
    }
  }

  return (
    <Card className="overflow-hidden">
      <CardHeader className="border-b bg-card">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Badge variant="gold">{question.year}</Badge>
            <Badge variant="muted">{question.topic}</Badge>
          </div>
          <span className="text-sm font-semibold text-muted-foreground">
            {index + 1} / {total}
          </span>
        </div>
        <CardTitle className="pt-3 text-xl leading-8">{question.question}</CardTitle>
        {question.imageUrl ? <QuestionImage question={question} /> : null}
      </CardHeader>
      <CardContent className="grid gap-3 pt-5">
        {question.choices.map((choice) => {
          const active = selectedChoice === choice.id;
          const correct = answered && choice.id === question.answer;
          const wrong = answered && active && !correct;
          return (
            <button
              key={choice.id}
              className={cn(
                "flex min-h-14 w-full items-start gap-3 rounded-md border bg-card p-4 text-left text-sm font-semibold transition-colors",
                "hover:bg-muted",
                correct && "border-success bg-success/10 text-foreground",
                wrong && "border-destructive bg-destructive/10 text-foreground"
              )}
              onClick={() => choose(choice.id)}
              type="button"
            >
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-extrabold">
                {choice.id}
              </span>
              <span className="leading-6">{choice.text}</span>
            </button>
          );
        })}
      </CardContent>
      <CardFooter className="block space-y-4">
        <div className="min-h-32 rounded-md border bg-muted/50 p-4">
          {answered ? (
            <div className="space-y-3">
              <div className="flex items-center gap-2 font-bold">
                {isCorrect ? (
                  <CheckCircle2 className="h-5 w-5 text-success" aria-hidden="true" />
                ) : (
                  <XCircle className="h-5 w-5 text-destructive" aria-hidden="true" />
                )}
                {isCorrect ? question.feedback.correct : question.feedback.incorrect}
              </div>
              <p className="text-sm leading-6 text-muted-foreground">
                Correct answer: <span className="font-bold text-foreground">{question.answer}</span>
                {getChoice(question, question.answer) ? `, ${getChoice(question, question.answer)?.text}` : ""}
              </p>
              <p className="text-sm leading-6">{aiExplanation ?? question.explanation}</p>
              {aiSource === "fallback" ? (
                <p className="text-xs font-semibold text-muted-foreground">
                  AI explanation is unavailable right now, so the verified explanation is shown.
                </p>
              ) : null}
            </div>
          ) : (
            <div className="flex h-full min-h-24 items-center text-sm font-semibold text-muted-foreground">
              Choose an answer to reveal feedback.
            </div>
          )}
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-2">
            <Button variant="outline" size="icon" onClick={onBookmark} aria-label={bookmarked ? "Remove bookmark" : "Save bookmark"}>
              <Bookmark className={cn(bookmarked && "fill-accent text-accent")} aria-hidden="true" />
            </Button>
            <Button variant="outline" onClick={explain} disabled={!answered || aiLoading}>
              <Lightbulb aria-hidden="true" />
              {aiLoading ? "Checking" : "Explain this"}
            </Button>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={onPrevious} disabled={index === 0}>
              Previous
            </Button>
            <Button onClick={onNext}>{index === total - 1 ? "Finish" : "Next"}</Button>
          </div>
        </div>
      </CardFooter>
    </Card>
  );
}

function QuestionImage({ question }: { question: Question }) {
  return (
    <div className="mt-4 overflow-hidden rounded-md border bg-white p-2">
      <img
        src={question.imageUrl}
        alt={question.imageAlt ?? question.question}
        className="mx-auto max-h-[32rem] w-full object-contain"
        loading="lazy"
      />
    </div>
  );
}
