import { Bookmark } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { Link } from "@/lib/router";
import { useStudy } from "@/lib/study-state";

export function BookmarksPage() {
  const { bookmarkedIds } = useStudy();
  const questions = verifiedProfessionalQuestions.filter((question) => bookmarkedIds.has(question.id));

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-extrabold">Bookmarks</h1>
      {questions.length === 0 ? (
        <Card>
          <CardContent className="flex min-h-48 flex-col items-center justify-center gap-3 text-center">
            <Bookmark className="h-8 w-8 text-primary" aria-hidden="true" />
            <div>
              <p className="font-bold">No bookmarks yet</p>
              <p className="mt-1 text-sm text-muted-foreground">Saved questions will appear here.</p>
            </div>
            <Button asChild variant="outline">
              <Link to="/review">Start review</Link>
            </Button>
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
