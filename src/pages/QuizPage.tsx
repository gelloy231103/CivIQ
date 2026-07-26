import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Library, PlayCircle, RotateCcw } from "lucide-react";
import { QuestionTimer } from "@/components/reviewer/QuestionTimer";
import { YearRequiredCard } from "@/components/reviewer/YearRequiredCard";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { verifiedProfessionalQuestions } from "@/data/professional";
import { useAuth } from "@/lib/auth";
import { QUESTION_TARGET_SECONDS } from "@/lib/exam-timing";
import type { Question } from "@/lib/question-model";
import {
  createQuizSession,
  deleteActiveLocalQuizSession,
  deleteActiveRemoteQuizSession,
  getActiveLocalQuizSession,
  getActiveRemoteQuizSession,
  newestQuizSession,
  saveLocalQuizSession,
  saveRemoteQuizSession,
  updateQuizSession,
  type QuizSession
} from "@/lib/quiz-session-service";
import { Link, useRouter } from "@/lib/router";
import {
  filterQuestionsForSelection,
  parseQuizSessionMode,
  parseStudySelection,
  quizSessionDescription,
  quizSessionTitle,
  selectionKey,
  studyPath,
  studySelectionDescription,
  studySelectionTitle
} from "@/lib/study-selection";
import { useStudy } from "@/lib/study-state";
import { cn, formatPercent } from "@/lib/utils";

export function QuizPage() {
  const { profile, isPreview } = useAuth();
  const { answerQuestion, attempts } = useStudy();
  const { path } = useRouter();
  const [session, setSession] = useState<QuizSession | null>(null);
  const [resumeCandidate, setResumeCandidate] = useState<QuizSession | null>(null);
  const [loadingSession, setLoadingSession] = useState(false);
  const [syncWarning, setSyncWarning] = useState<string | null>(null);
  const selection = useMemo(() => parseStudySelection(path), [path]);
  const sessionMode = useMemo(() => parseQuizSessionMode(path), [path]);
  const currentSelectionKey = selectionKey(selection);
  const userId = profile?.id ?? "preview-user";
  const questions = useMemo(
    () => filterQuestionsForSelection(verifiedProfessionalQuestions, selection),
    [selection.topic, selection.year]
  );
  const questionById = useMemo(() => new Map(questions.map((question) => [question.id, question])), [questions]);
  const sessionQuestions = useMemo(
    () => session?.questionIds.map((questionId) => questionById.get(questionId)).filter((item): item is Question => Boolean(item)) ?? [],
    [questionById, session]
  );
  const safeIndex = sessionQuestions.length === 0 ? 0 : Math.min(session?.currentIndex ?? 0, sessionQuestions.length - 1);
  const question = sessionQuestions[safeIndex];
  const answers = session?.answers ?? {};
  const answeredCount = Object.keys(answers).length;
  const correctCount = sessionQuestions.filter((item) => answers[item.id] === item.answer).length;
  const missedCount = answeredCount - correctCount;
  const totalQuestions = sessionQuestions.length;
  const currentAnswer = question ? answers[question.id] : undefined;
  const isLastQuestion = safeIndex === totalQuestions - 1;
  const finished = Boolean(session?.finishedAt);

  useEffect(() => {
    if (!selection.year || questions.length === 0) {
      setSession(null);
      setResumeCandidate(null);
      setLoadingSession(false);
      return;
    }

    let cancelled = false;

    async function loadSession() {
      setLoadingSession(true);
      setSyncWarning(null);

      const localSession = getActiveLocalQuizSession(userId, currentSelectionKey, sessionMode);
      const remoteSession = profile && !isPreview
        ? await getActiveRemoteQuizSession(profile.id, currentSelectionKey, sessionMode)
        : null;
      const candidate = newestQuizSession(localSession, remoteSession);

      if (cancelled) return;

      if (candidate && Object.keys(candidate.answers).length > 0) {
        saveLocalQuizSession(candidate);
        setResumeCandidate(candidate);
        setSession(null);
        setLoadingSession(false);
        return;
      }

      const nextSession = candidate ?? createQuizSession(userId, selection, sessionMode, questions, attempts);
      saveLocalQuizSession(nextSession);
      setSession(nextSession);
      setResumeCandidate(null);
      setLoadingSession(false);
      if (profile && !isPreview) persistRemote(nextSession);
    }

    loadSession();

    return () => {
      cancelled = true;
    };
  }, [currentSelectionKey, isPreview, profile, questions, selection, sessionMode, userId]);

  function choose(choiceId: string) {
    if (!question || !session) return;
    if (session.answers[question.id]) return;
    const nextSession = updateQuizSession(session, {
      answers: {
        ...session.answers,
        [question.id]: choiceId
      }
    });
    setSession(nextSession);
    saveSession(nextSession);
    answerQuestion(question.id, choiceId, "quiz");
  }

  function goNext() {
    if (!currentAnswer || !session) return;
    if (isLastQuestion) {
      finishSession();
      return;
    }
    const nextSession = updateQuizSession(session, {
      currentIndex: Math.min(totalQuestions - 1, safeIndex + 1)
    });
    setSession(nextSession);
    saveSession(nextSession);
  }

  function continueSession() {
    if (!resumeCandidate) return;
    setSession(resumeCandidate);
    setResumeCandidate(null);
    saveSession(resumeCandidate);
  }

  async function startOver() {
    deleteActiveLocalQuizSession(userId, currentSelectionKey, sessionMode);
    if (profile && !isPreview) {
      const error = await deleteActiveRemoteQuizSession(profile.id, currentSelectionKey, sessionMode);
      if (error) setSyncWarning("Saved on this device. Cross-device sync will retry when Supabase is reachable.");
    }
    const nextSession = createQuizSession(userId, selection, sessionMode, questions, attempts);
    setSession(nextSession);
    setResumeCandidate(null);
    saveSession(nextSession);
  }

  function finishSession() {
    if (!session) return;
    const nextSession = updateQuizSession(session, {
      currentIndex: safeIndex,
      finishedAt: new Date().toISOString()
    });
    setSession(nextSession);
    saveSession(nextSession);
  }

  function saveSession(nextSession: QuizSession) {
    saveLocalQuizSession(nextSession);
    if (profile && !isPreview) persistRemote(nextSession);
  }

  async function persistRemote(nextSession: QuizSession) {
    const error = await saveRemoteQuizSession(nextSession);
    if (error) {
      setSyncWarning("Saved on this device. Cross-device sync will retry when Supabase is reachable.");
    }
  }

  if (!selection.year) {
    return (
      <YearRequiredCard
        title="Choose a reviewer year"
        description="Quiz sessions start from a selected year so the question set and timer stay manageable."
      />
    );
  }

  if (questions.length === 0) {
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

  if (loadingSession) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center text-sm font-bold text-muted-foreground">
            Loading quiz session
          </CardContent>
        </Card>
      </div>
    );
  }

  if (resumeCandidate) {
    const candidateTotal = resumeCandidate.questionIds.length;
    const candidateAnswered = Object.keys(resumeCandidate.answers).length;
    return (
      <div className="mx-auto max-w-2xl space-y-5">
        <Card>
          <CardHeader>
            <div className="mb-2 flex h-12 w-12 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <PlayCircle className="h-5 w-5" aria-hidden="true" />
            </div>
            <CardTitle className="text-3xl">Continue session?</CardTitle>
            <CardDescription>
              {quizSessionTitle(sessionMode)} for {studySelectionTitle(selection)} has {candidateAnswered} of {candidateTotal} answered.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Progress value={candidateTotal === 0 ? 0 : (candidateAnswered / candidateTotal) * 100} />
            <div className="grid gap-2 sm:grid-cols-3">
              <Button onClick={continueSession}>
                <PlayCircle aria-hidden="true" />
                Continue
              </Button>
              <Button variant="outline" onClick={startOver}>
                <RotateCcw aria-hidden="true" />
                Start over
              </Button>
              <Button asChild variant="outline">
                <Link to="/library">
                  <Library aria-hidden="true" />
                  Library
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (!session || !question) {
    return (
      <div className="mx-auto max-w-2xl">
        <Card>
          <CardContent className="flex min-h-40 items-center justify-center text-sm font-bold text-muted-foreground">
            Preparing quiz session
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
              <Button onClick={startOver} variant="outline">
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
        <h1 className="text-3xl font-extrabold">{studySelectionTitle(selection)} {quizSessionTitle(sessionMode)}</h1>
        <p className="mt-1 text-sm font-semibold text-muted-foreground">
          {studySelectionDescription(selection, totalQuestions)} - {quizSessionDescription(sessionMode)} - {QUESTION_TARGET_SECONDS}s target per question
        </p>
        {syncWarning ? <p className="mt-2 text-xs font-semibold text-destructive">{syncWarning}</p> : null}
      </div>
      <Progress value={(answeredCount / totalQuestions) * 100} />
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3">
            <Badge variant="gold">{question.year}</Badge>
            <span className="text-sm font-semibold text-muted-foreground">
              {safeIndex + 1} / {totalQuestions}
            </span>
          </div>
          <QuestionTimer resetKey={`${session.id}:${question.id}`} paused={Boolean(currentAnswer)} />
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
            <Button variant="outline" onClick={finishSession} disabled={answeredCount === 0}>
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
