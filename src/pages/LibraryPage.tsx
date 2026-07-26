import { ArrowRight, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availableTopics, availableYears, verifiedProfessionalQuestions } from "@/data/professional";
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
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Newest source pack: 2026-2027 reviewer files.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {availableYears.map((year) => (
          <Card key={year}>
            <CardHeader>
              <div className="flex items-center justify-between gap-3">
                <div>
                  <CardTitle>{year} Professional</CardTitle>
                  <CardDescription>{verifiedProfessionalQuestions.length} verified starter questions</CardDescription>
                </div>
                <Badge variant="gold">new</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <Progress value={progress.completion} />
              <div className="flex flex-wrap gap-2">
                {availableTopics.map((topic) => (
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
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Source folder</CardTitle>
          <CardDescription>Raw files remain local; verified questions are extracted into app data.</CardDescription>
        </CardHeader>
        <CardContent className="flex items-start gap-3 rounded-b-lg bg-muted/40 p-5 text-sm">
          <FileText className="mt-0.5 h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
          <code className="break-all">reviewers/new/CSE 2026-2027 EXAMS AND ANSWERS SHEET...</code>
        </CardContent>
      </Card>
    </div>
  );
}
