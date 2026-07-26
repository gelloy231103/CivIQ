import { ArrowRight, Brain, CheckCircle2, ClipboardList } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availableYears, verifiedProfessionalQuestions } from "@/data/professional";
import { Link } from "@/lib/router";
import { studyPath } from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";

export function LibraryPage() {
  const { attempts } = useStudy();

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Library</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Choose a reviewer year to start practicing.</p>
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
            <Card key={year}>
              <CardHeader>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <CardTitle>{year} Reviewer</CardTitle>
                    <CardDescription>{yearQuestions.length} answer-key verified questions</CardDescription>
                  </div>
                  <Badge variant="gold">
                    <CheckCircle2 aria-hidden="true" />
                    ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={yearCompletion} />
                <div className="flex flex-wrap gap-2">
                  {yearTopics.map((topic) => {
                    const topicCount = yearQuestions.filter((question) => question.topic === topic).length;
                    return (
                      <Link
                        key={topic}
                        to={studyPath("review", { year, topic })}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        aria-label={`Review ${topic} questions from ${year}`}
                      >
                        {topic}
                        <span className="text-muted-foreground/70">{topicCount}</span>
                      </Link>
                    );
                  })}
                </div>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild className="w-full">
                    <Link to={studyPath("review", { year })}>
                      <Brain aria-hidden="true" />
                      Review {year}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={studyPath("quiz", { year })}>
                      <ClipboardList aria-hidden="true" />
                      Quiz {year}
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
