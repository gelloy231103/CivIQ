import { SetupRequired } from "@/components/layout/SetupRequired";
import { AppShell } from "@/components/layout/AppShell";
import { lazy, Suspense } from "react";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useRouter } from "@/lib/router";
import { StudyProvider } from "@/lib/study-state";
import { LoginPage } from "@/pages/LoginPage";

const AnswerReviewPage = lazy(() => import("@/pages/AnswerReviewPage").then((module) => ({ default: module.AnswerReviewPage })));
const BookmarksPage = lazy(() => import("@/pages/BookmarksPage").then((module) => ({ default: module.BookmarksPage })));
const DashboardPage = lazy(() => import("@/pages/DashboardPage").then((module) => ({ default: module.DashboardPage })));
const FriendsPage = lazy(() => import("@/pages/FriendsPage").then((module) => ({ default: module.FriendsPage })));
const LeaderboardPage = lazy(() => import("@/pages/LeaderboardPage").then((module) => ({ default: module.LeaderboardPage })));
const LibraryPage = lazy(() => import("@/pages/LibraryPage").then((module) => ({ default: module.LibraryPage })));
const MistakesPage = lazy(() => import("@/pages/MistakesPage").then((module) => ({ default: module.MistakesPage })));
const ProfilePage = lazy(() => import("@/pages/ProfilePage").then((module) => ({ default: module.ProfilePage })));
const ProgressPage = lazy(() => import("@/pages/ProgressPage").then((module) => ({ default: module.ProgressPage })));
const QuizPage = lazy(() => import("@/pages/QuizPage").then((module) => ({ default: module.QuizPage })));
const ReviewPage = lazy(() => import("@/pages/ReviewPage").then((module) => ({ default: module.ReviewPage })));

export default function App() {
  return (
    <AuthProvider>
      <AppGate />
    </AuthProvider>
  );
}

function AppGate() {
  const { loading, setupRequired, startPreview, profile, session, isPreview } = useAuth();
  const { path } = useRouter();

  if (loading) {
    return (
      <main className="grid min-h-screen place-items-center px-4">
        <div className="rounded-md border bg-card px-5 py-4 text-sm font-bold shadow-soft">Loading CivIQ</div>
      </main>
    );
  }

  if (setupRequired) {
    return <SetupRequired onPreview={startPreview} />;
  }

  if (!profile && !session && !isPreview) {
    return <LoginPage />;
  }

  return (
    <StudyProvider>
      <AppShell>
        <Suspense fallback={<PageLoading />}>
          {renderPage(path)}
        </Suspense>
      </AppShell>
    </StudyProvider>
  );
}

function PageLoading() {
  return (
    <div className="rounded-md border bg-card px-5 py-4 text-sm font-bold text-muted-foreground shadow-soft">
      Loading page
    </div>
  );
}

function renderPage(path: string) {
  if (path === "/review" || path.startsWith("/review/")) {
    return <ReviewPage />;
  }

  if (path === "/quiz" || path.startsWith("/quiz/")) {
    return <QuizPage />;
  }

  if (path === "/answers" || path.startsWith("/answers/")) {
    return <AnswerReviewPage />;
  }

  switch (path) {
    case "/":
      return <DashboardPage />;
    case "/library":
      return <LibraryPage />;
    case "/mistakes":
      return <MistakesPage />;
    case "/bookmarks":
      return <BookmarksPage />;
    case "/progress":
      return <ProgressPage />;
    case "/leaderboard":
      return <LeaderboardPage />;
    case "/friends":
      return <FriendsPage />;
    case "/profile":
      return <ProfilePage />;
    default:
      return <DashboardPage />;
  }
}
