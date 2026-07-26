import { SetupRequired } from "@/components/layout/SetupRequired";
import { AppShell } from "@/components/layout/AppShell";
import { AuthProvider, useAuth } from "@/lib/auth";
import { useRouter } from "@/lib/router";
import { StudyProvider } from "@/lib/study-state";
import { AnswerReviewPage } from "@/pages/AnswerReviewPage";
import { BookmarksPage } from "@/pages/BookmarksPage";
import { DashboardPage } from "@/pages/DashboardPage";
import { FriendsPage } from "@/pages/FriendsPage";
import { LeaderboardPage } from "@/pages/LeaderboardPage";
import { LibraryPage } from "@/pages/LibraryPage";
import { LoginPage } from "@/pages/LoginPage";
import { MistakesPage } from "@/pages/MistakesPage";
import { ProfilePage } from "@/pages/ProfilePage";
import { ProgressPage } from "@/pages/ProgressPage";
import { QuizPage } from "@/pages/QuizPage";
import { ReviewPage } from "@/pages/ReviewPage";

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
        {renderPage(path)}
      </AppShell>
    </StudyProvider>
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
