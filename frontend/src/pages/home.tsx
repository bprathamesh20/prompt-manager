import { type FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { FileText, Key, LogOut, Plus, Search } from "lucide-react";

import { PromptWorkspace } from "@/components/prompt-workspace";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { promptApiClient } from "@/lib/api-client";
import { clearAccessToken } from "@/lib/auth";

export function HomePage() {
  const navigate = useNavigate();
  const [promptNames, setPromptNames] = useState<string[]>([]);
  const [selectedPrompt, setSelectedPrompt] = useState<string | null>(null);
  const [sidebarFilter, setSidebarFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState({ name: "", content: "", tag: "" });
  const [loadingPrompts, setLoadingPrompts] = useState(false);
  const [promptLoadError, setPromptLoadError] = useState<string | null>(null);

  function handleLogout() {
    clearAccessToken();
    navigate("/login", { replace: true });
  }

  function uniquePromptNames(names: string[]): string[] {
    return [...new Set(names)];
  }

  async function loadPromptNames() {
    setLoadingPrompts(true);
    setPromptLoadError(null);
    try {
      const versions = await promptApiClient.getPrompts({});
      const names = uniquePromptNames(versions.map((version) => version.name));
      setPromptNames(names);
      setSelectedPrompt((current) => {
        if (!names.length) {
          return null;
        }
        if (current && names.includes(current)) {
          return current;
        }
        return names[0];
      });
    } catch (error) {
      setPromptLoadError(
        error instanceof Error ? error.message : "Failed to load prompt names."
      );
    } finally {
      setLoadingPrompts(false);
    }
  }

  async function handleCreatePrompt(e: FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.content.trim()) return;
    try {
      await promptApiClient.createPrompt({
        name: newForm.name.trim(),
        content: newForm.content.trim(),
        tag: newForm.tag?.trim() || undefined
      });
      await loadPromptNames();
      setSelectedPrompt(newForm.name.trim());
      setDialogOpen(false);
      setNewForm({ name: "", content: "", tag: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create prompt.");
    }
  }

  useEffect(() => {
    void loadPromptNames();
  }, []);

  const filteredNames = promptNames.filter((n) =>
    n.toLowerCase().includes(sidebarFilter.toLowerCase())
  );

  return (
    <div className="flex h-screen flex-col">
      {/* Top bar */}
      <header className="flex h-12 items-center justify-between border-b px-4">
        <div className="flex items-center gap-2">
          <FileText className="h-5 w-5 text-muted-foreground" />
          <span className="text-sm font-semibold">Prompt Manager</span>
        </div>
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={() => navigate("/settings/api-keys")}
          >
            <Key className="mr-1.5 h-4 w-4" />
            API Keys
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground"
            onClick={handleLogout}
          >
            <LogOut className="mr-1.5 h-4 w-4" />
            Logout
          </Button>
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        {/* Prompt names sidebar */}
        <aside className="flex w-[240px] flex-shrink-0 flex-col border-r">
          <div className="border-b p-3">
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Prompts
              </span>
              <Button
                size="sm"
                variant="ghost"
                className="h-7 w-7 p-0"
                onClick={() => setDialogOpen(true)}
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                className="h-8 pl-8 text-xs"
                placeholder="Filter prompts..."
                value={sidebarFilter}
                onChange={(e) => setSidebarFilter(e.target.value)}
              />
            </div>
          </div>

          <ScrollArea className="flex-1">
            {filteredNames.length === 0 ? (
              <div className="p-4 text-center text-xs text-muted-foreground">
                {loadingPrompts ? (
                  <p>Loading prompts...</p>
                ) : promptLoadError ? (
                  <p>{promptLoadError}</p>
                ) : promptNames.length === 0 ? (
                  <>
                    <p>No prompts yet.</p>
                    <button
                      className="mt-1 text-blue-400 hover:underline"
                      onClick={() => setDialogOpen(true)}
                    >
                      Create your first prompt
                    </button>
                  </>
                ) : (
                  "No matching prompts."
                )}
              </div>
            ) : (
              <div className="p-1.5">
                {filteredNames.map((name) => (
                  <div
                    key={name}
                    className={`group flex items-center rounded-md transition-colors ${
                      selectedPrompt === name
                        ? "bg-accent text-accent-foreground"
                        : "hover:bg-accent/50"
                    }`}
                  >
                    <button
                      className="flex-1 truncate px-3 py-2 text-left text-sm"
                      onClick={() => setSelectedPrompt(name)}
                    >
                      {name}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </aside>

        {/* Main workspace */}
        <main className="flex-1 overflow-hidden">
          {selectedPrompt ? (
            <PromptWorkspace promptName={selectedPrompt} onPromptNamesChanged={loadPromptNames} />
          ) : (
            <div className="flex h-full items-center justify-center text-muted-foreground">
              <div className="text-center">
                <FileText className="mx-auto mb-3 h-10 w-10 opacity-30" />
                <p className="text-lg">Select a prompt</p>
                <p className="mt-1 text-sm">
                  Choose from the sidebar or{" "}
                  <button
                    className="text-blue-400 hover:underline"
                    onClick={() => setDialogOpen(true)}
                  >
                    create a new one
                  </button>
                </p>
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Create prompt dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New Prompt</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreatePrompt}>
            <div className="space-y-2">
              <Label>Name</Label>
              <Input
                value={newForm.name}
                onChange={(e) => setNewForm((p) => ({ ...p, name: e.target.value }))}
                placeholder="e.g., qa-answer-with-context"
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Content</Label>
              <Textarea
                className="min-h-[120px]"
                value={newForm.content}
                onChange={(e) => setNewForm((p) => ({ ...p, content: e.target.value }))}
                placeholder="Enter your prompt template..."
                required
              />
            </div>
            <div className="space-y-2">
              <Label>Tag (optional)</Label>
              <Input
                value={newForm.tag}
                onChange={(e) => setNewForm((p) => ({ ...p, tag: e.target.value }))}
                placeholder="e.g., production, staging"
              />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button type="submit">Create</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
