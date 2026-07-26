import { AlertCircle } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { activeMistakeIds } from "@/lib/quiz-engine";
import { useStudy } from "@/lib/study-state";

export function MistakesPage() {
  const { attempts } = useStudy();
  const mistakes = activeMistakeIds(attempts);
  const questions = verifiedProfessionalQuestions.filter((question) => mistakes.has(question.id));

  return (
    <ListPage
      title="Mistakes"
      emptyTitle="No active mistakes"
      emptyText="Wrong answers will appear here after practice."
      questions={questions}
      icon={AlertCircle}
    />
  );
}

function ListPage({
  title,
  emptyTitle,
  emptyText,
  questions,
  icon: Icon
}: {
  title: string;
  emptyTitle: string;
  emptyText: string;
  questions: typeof verifiedProfessionalQuestions;
  icon: typeof AlertCircle;
}) {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">{title}</h1>
      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Icon className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <p className="font-bold">{emptyTitle}</p>
              <p className="mt-1 text-sm text-muted-foreground">{emptyText}</p>
            </div>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {questions.map((question) => (
            <Card key={question.id}>
              <CardHeader>
                <CardTitle className="text-base leading-6">{question.question}</CardTitle>
              </CardHeader>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
