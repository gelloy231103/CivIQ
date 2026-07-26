import { ArrowRight, Brain, CheckCircle2, ClipboardList, Clock3, ListChecks, PlayCircle, Timer } from "lucide-react";
import { useEffect, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { availableYears, verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import {
  getActiveLocalQuizSessions,
  getActiveRemoteQuizSessions,
  mergeQuizSessions,
  type QuizSession
} from "@/lib/quiz-session-service";
import { Link } from "@/lib/router";
import { quizSessionTitle, selectionFromKey, studyPath } from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";

export function LibraryPage() {
  const { attempts } = useStudy();
  const { profile, isPreview } = useAuth();
  const [activeSessions, setActiveSessions] = useState<QuizSession[]>([]);

  useEffect(() => {
    const userId = profile?.id ?? "preview-user";
    const localSessions = getActiveLocalQuizSessions(userId);
    if (!profile || isPreview) {
      setActiveSessions(localSessions);
      return;
    }

    let cancelled = false;
    getActiveRemoteQuizSessions(profile.id).then((remoteSessions) => {
      if (!cancelled) setActiveSessions(mergeQuizSessions([...localSessions, ...remoteSessions]));
    });

    return () => {
      cancelled = true;
    };
  }, [isPreview, profile]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-3xl font-extrabold">Library</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">Choose a reviewer year and study size.</p>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {availableYears.map((year) => {
          const yearQuestions = verifiedProfessionalQuestions.filter((question) => question.year === year);
          const yearTopics = Array.from(new Set(yearQuestions.map((question) => question.topic))).sort();
          const activeSession = activeSessions.find((session) => selectionFromKey(session.selectionKey).year === year);
          const activeSelection = activeSession ? selectionFromKey(activeSession.selectionKey) : { year };
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
                    <CardDescription>{yearQuestions.length} verified questions across {yearTopics.length} topics</CardDescription>
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
                        to={studyPath("answers", { year, topic })}
                        className="inline-flex min-h-11 items-center gap-1 rounded-md border bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground transition-colors hover:border-primary/40 hover:bg-primary/10 hover:text-primary"
                        aria-label={`Open ${topic} answers from ${year}`}
                      >
                        {topic}
                        <span className="text-muted-foreground/70">{topicCount}</span>
                      </Link>
                    );
                  })}
                </div>
                {activeSession ? (
                  <Button asChild className="w-full" variant="secondary">
                    <Link to={studyPath("quiz", activeSelection, { sessionMode: activeSession.mode })}>
                      <PlayCircle aria-hidden="true" />
                      Continue {quizSessionTitle(activeSession.mode)}
                      <ArrowRight aria-hidden="true" />
                    </Link>
                  </Button>
                ) : null}
                <Button asChild className="w-full">
                  <Link to={studyPath("quiz", { year }, { sessionMode: "focused" })}>
                    <ClipboardList aria-hidden="true" />
                    Start 25-question session
                    <ArrowRight aria-hidden="true" />
                  </Link>
                </Button>
                <div className="grid gap-2 sm:grid-cols-2">
                  <Button asChild className="w-full" variant="outline">
                    <Link to={studyPath("quiz", { year }, { sessionMode: "quick" })}>
                      <Clock3 aria-hidden="true" />
                      Quick 10
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={studyPath("quiz", { year }, { sessionMode: "mock" })}>
                      <Timer aria-hidden="true" />
                      Mock 170
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={studyPath("answers", { year })}>
                      <ListChecks aria-hidden="true" />
                      Review all answers
                    </Link>
                  </Button>
                  <Button asChild className="w-full" variant="outline">
                    <Link to={studyPath("review", { year })}>
                      <Brain aria-hidden="true" />
                      Card review
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
