import { FormEvent, useState } from "react";
import { AlertCircle, CheckCircle2, KeyRound } from "lucide-react";
import { CivIQLogo } from "@/components/brand/CivIQLogo";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/lib/auth";
import { Link } from "@/lib/router";

export function ResetPasswordPage() {
  const { session, updatePassword } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  async function submitReset(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    const form = new FormData(event.currentTarget);
    const password = String(form.get("password") ?? "");
    const confirmPassword = String(form.get("confirmPassword") ?? "");
    const validationError = validatePassword(password, confirmPassword);

    if (validationError) {
      setError(validationError);
      return;
    }

    setLoading(true);
    const nextError = await updatePassword(password);
    setLoading(false);

    if (nextError) {
      setError(nextError);
      return;
    }

    setMessage("Password updated. You can continue to CivIQ.");
    event.currentTarget.reset();
  }

  return (
    <main className="grid min-h-screen place-items-center px-4 py-10">
      <Card className="w-full max-w-md">
        <CardHeader>
          <div className="mb-3 flex items-center gap-3">
            <CivIQLogo className="h-12 w-12 shrink-0" aria-hidden="true" />
            <div>
              <CardTitle className="text-2xl">Reset password</CardTitle>
              <CardDescription>Create a new password for your CivIQ email account.</CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {message ? <StatusMessage tone="success">{message}</StatusMessage> : null}
          {error ? <StatusMessage tone="error">{error}</StatusMessage> : null}
          {!session ? (
            <div className="space-y-4">
              <div className="rounded-md border bg-muted/40 p-4 text-sm font-semibold leading-6 text-muted-foreground">
                Open the latest reset link from your email to set a new password. If the link expired, send a new reset email.
              </div>
              <Button asChild className="w-full" variant="outline">
                <Link to="/">Back to sign in</Link>
              </Button>
            </div>
          ) : (
            <form className="space-y-4" onSubmit={submitReset}>
              <Field label="New password" name="password" type="password" autoComplete="new-password" minLength={8} />
              <Field label="Confirm password" name="confirmPassword" type="password" autoComplete="new-password" minLength={8} />
              <Button className="w-full" disabled={loading} type="submit">
                <KeyRound aria-hidden="true" />
                {loading ? "Updating password" : "Update password"}
              </Button>
              {message ? (
                <Button asChild className="w-full" variant="outline">
                  <Link to="/">Continue to CivIQ</Link>
                </Button>
              ) : null}
            </form>
          )}
        </CardContent>
      </Card>
    </main>
  );
}

function Field({
  label,
  name,
  type,
  autoComplete,
  minLength
}: {
  label: string;
  name: string;
  type: string;
  autoComplete: string;
  minLength: number;
}) {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} autoComplete={autoComplete} minLength={minLength} required />
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

function validatePassword(password: string, confirmPassword: string) {
  if (password.length < 8) return "Use a password with at least 8 characters.";
  if (password !== confirmPassword) return "Passwords do not match.";
  return null;
}
