import { useNavigate } from "react-router-dom";

import { HealthCard } from "@/components/health-card";
import { PromptPlayground } from "@/components/prompt-playground";
import { Button } from "@/components/ui/button";
import { clearAccessToken } from "@/lib/auth";

export function HomePage() {
  const navigate = useNavigate();

  function handleLogout() {
    clearAccessToken();
    navigate("/login", { replace: true });
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-3xl p-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">Prompt Manager</h1>
            <p className="mt-2 text-muted-foreground">
              Scaffolding environment for prompt versioning APIs and UI.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={() => navigate("/settings/api-keys")}>
              API Keys
            </Button>
            <Button variant="outline" onClick={handleLogout}>
              Logout
            </Button>
          </div>
        </header>

        <section className="space-y-4">
          <HealthCard />
          <PromptPlayground />
        </section>
      </div>
    </main>
  );
}
