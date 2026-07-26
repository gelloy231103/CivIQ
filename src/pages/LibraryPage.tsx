import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availableYears, verifiedProfessionalQuestions } from "@/data/professional";
import { buildProgressSnapshot } from "@/lib/progress-service";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";

export function LibraryPage() {
  const { attempts, bookmarkedIds } = useStudy();
  const progress = buildProgressSnapshot(attempts, bookmarkedIds);

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
                    <CardTitle>{year} Professional Reviewer</CardTitle>
                    <CardDescription>{yearQuestions.length} answer-key verified questions</CardDescription>
                  </div>
                  <Badge variant="gold">
                    <CheckCircle2 aria-hidden="true" />
                    ready
                  </Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <Progress value={yearCompletion || progress.completion} />
                <div className="flex flex-wrap gap-2">
                  {yearTopics.map((topic) => (
                    <Badge key={topic} variant="muted">
                      {topic}
                    </Badge>
                  ))}
                </div>
                <Button asChild className="w-full">
                  <Link to="/review">
                    Start {year}
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
