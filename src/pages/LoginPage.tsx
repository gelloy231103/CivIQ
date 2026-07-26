import { FormEvent, type InputHTMLAttributes, useState } from "react";
import { AlertCircle, CheckCircle2, Chrome, LockKeyhole, UserPlus } from "lucide-react";
import { CivIQLogo } from "@/components/brand/CivIQLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/lib/auth";

export function LoginPage() {
  const { signIn, signInWithGoogle, signUp } = useAuth();
  const [activeTab, setActiveTab] = useState("signin");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loadingAction, setLoadingAction] = useState<"google" | "signin" | "signup" | null>(null);
  const loading = loadingAction !== null;

  async function submitSignIn(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("signin");
    setError(null);
    setNotice(null);
    const form = new FormData(event.currentTarget);
    const nextError = await signIn(String(form.get("email") ?? ""), String(form.get("password") ?? ""));
    setError(nextError);
    setLoadingAction(null);
  }

  async function submitSignUp(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoadingAction("signup");
    setError(null);
    setNotice(null);
    const formElement = event.currentTarget;
    const form = new FormData(event.currentTarget);
    const displayName = String(form.get("displayName") ?? "").trim();
    const username = String(form.get("username") ?? "").trim().toLowerCase();
    const email = String(form.get("email") ?? "").trim().toLowerCase();
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const validationError = validateSignUp(displayName, username, password, confirmPassword);

    if (validationError) {
      setError(validationError);
      setLoadingAction(null);
      return;
    }

    const nextError = await signUp(
      email,
      password,
      displayName,
      username
    );
    if (nextError) {
      setError(nextError);
    } else {
      setNotice("Account created. Check your email if confirmation is required, then sign in.");
      formElement.reset();
      setActiveTab("signin");
    }
    setLoadingAction(null);
  }

  async function startGoogleSignIn() {
    setLoadingAction("google");
    setError(null);
    setNotice(null);
    const nextError = await signInWithGoogle();
    if (nextError) {
      setError(nextError);
      setLoadingAction(null);
    }
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <CivIQLogo className="h-12 w-12 shrink-0" aria-hidden="true" />
            <div>
              <CardTitle className="text-2xl">CivIQ</CardTitle>
              <CardDescription>Civil Service Reviewer</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Button className="mb-5 w-full" variant="outline" disabled={loading} onClick={startGoogleSignIn}>
            <Chrome aria-hidden="true" />
            {loadingAction === "google" ? "Opening Google" : "Continue with Google"}
          </Button>
          <div className="mb-5 flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground">
            <span className="h-px flex-1 bg-border" />
            <span>Email login</span>
            <span className="h-px flex-1 bg-border" />
          </div>
          {notice ? <StatusMessage tone="success">{notice}</StatusMessage> : null}
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          <Tabs
            value={activeTab}
            onValueChange={(value) => {
              setActiveTab(value);
              setError(null);
              setNotice(null);
            }}
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Sign in</TabsTrigger>
              <TabsTrigger value="signup">Create account</TabsTrigger>
            </TabsList>
            <TabsContent value="signin">
              <form className="space-y-4" onSubmit={submitSignIn}>
                <Field label="Email" name="email" type="email" autoComplete="email" />
                <Field label="Password" name="password" type="password" autoComplete="current-password" />
                <Button className="w-full" disabled={loading} type="submit">
                  <LockKeyhole aria-hidden="true" />
                  {loadingAction === "signin" ? "Signing in" : "Sign in"}
                </Button>
              </form>
            </TabsContent>
            <TabsContent value="signup">
              <form className="space-y-4" onSubmit={submitSignUp}>
                <Field label="Display name" name="displayName" autoComplete="name" />
                <Field
                  label="Username"
                  name="username"
                  autoComplete="username"
                  description="Use 3-24 letters, numbers, or underscores."
                />
                <Field label="Email" name="email" type="email" autoComplete="email" />
                <Field
                  label="Password"
                  name="password"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                  description="Use at least 8 characters."
                />
                <Field
                  label="Confirm password"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  minLength={8}
                />
                <Button className="w-full" disabled={loading} type="submit">
                  <UserPlus aria-hidden="true" />
                  {loadingAction === "signup" ? "Creating account" : "Create account"}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </main>
  );
}

function Field({
  label,
  name,
  type = "text",
  description,
  ...inputProps
}: { label: string; name: string; description?: string } & Omit<InputHTMLAttributes<HTMLInputElement>, "name">) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} required {...inputProps} />
      {description ? <p className="text-xs font-medium leading-5 text-muted-foreground">{description}</p> : null}
    </div>
  );
}

function StatusMessage({ tone, children }: { tone: "error" | "success"; children: string }) {
  const Icon = tone === "success" ? CheckCircle2 : AlertCircle;
  return (
    <div
      className={
        tone === "success"
          ? "mb-4 flex gap-2 rounded-md bg-success/10 p-3 text-sm font-semibold text-success"
          : "mb-4 flex gap-2 rounded-md bg-destructive/10 p-3 text-sm font-semibold text-destructive"
      }
      role={tone === "error" ? "alert" : "status"}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" aria-hidden="true" />
      <p>{children}</p>
    </div>
  );
}

function validateSignUp(displayName: string, username: string, password: string, confirmPassword: string) {
  if (displayName.length < 2) return "Enter your display name.";
  if (!/^[a-z0-9_]{3,24}$/.test(username)) return "Username must use 3-24 letters, numbers, or underscores.";
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
