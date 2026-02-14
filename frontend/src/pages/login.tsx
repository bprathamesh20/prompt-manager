import { FormEvent, useState } from "react";
import { Navigate, useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import { setAccessToken, getAccessToken } from "@/lib/auth";
import { promptApiClient } from "@/lib/api-client";

type Mode = "login" | "signup";

const inputClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

export function LoginPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (getAccessToken()) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Email and password are required.");
      return;
    }

    setLoading(true);
    try {
      if (mode === "signup") {
        await promptApiClient.register({ email: email.trim(), password: password.trim() });
      }

      const token = await promptApiClient.login({
        email: email.trim(),
        password: password.trim()
      });
      setAccessToken(token.access_token);
      navigate("/", { replace: true });
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : "Authentication failed.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-md rounded-lg border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-bold">Prompt Manager</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "login" ? "Sign in to continue." : "Create an account to continue."}
        </p>

        <form className="mt-6 space-y-4" onSubmit={handleSubmit}>
          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              className={inputClassName}
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div className="space-y-1">
            <label className="text-sm font-medium" htmlFor="password">
              Password
            </label>
            <input
              id="password"
              className={inputClassName}
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="At least 8 characters"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <Button className="w-full" type="submit" disabled={loading}>
            {loading ? "Please wait..." : mode === "login" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <div className="mt-4 text-sm">
          {mode === "login" ? (
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setMode("signup")}
              type="button"
            >
              Need an account? Sign up
            </button>
          ) : (
            <button
              className="font-medium text-primary hover:underline"
              onClick={() => setMode("login")}
              type="button"
            >
              Already have an account? Sign in
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
