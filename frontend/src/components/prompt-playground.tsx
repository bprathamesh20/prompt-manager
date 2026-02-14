import { FormEvent, useEffect, useState } from "react";

import {
  promptApiClient,
  type PromptCreateRequest,
  type PromptVersionResponse
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type Tab = "prompt" | "config" | "generations" | "use";

type WorkspaceState = {
  loading: boolean;
  error?: string;
  versions: PromptVersionResponse[];
};

const inputClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

export function PromptPlayground() {
  const [promptName, setPromptName] = useState("");
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionResponse | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTag, setEditTag] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [saving, setSaving] = useState(false);
  const [newVersionDialogOpen, setNewVersionDialogOpen] = useState(false);
  const [newVersionForm, setNewVersionForm] = useState<PromptCreateRequest>({
    name: "",
    content: "",
    tag: ""
  });

  const [workspaceState, setWorkspaceState] = useState<WorkspaceState>({
    loading: false,
    versions: []
  });

  async function loadVersions(name: string, tag?: string) {
    if (!name.trim()) return;
    
    setWorkspaceState({ loading: true, versions: [] });
    try {
      const versions = await promptApiClient.getPrompts({
        name: name.trim(),
        tag: tag?.trim() || undefined
      });
      setWorkspaceState({ loading: false, versions });
      if (versions.length > 0 && !selectedVersion) {
        handleSelectVersion(versions[0]);
      }
    } catch (error) {
      setWorkspaceState({
        loading: false,
        versions: [],
        error: error instanceof Error ? error.message : "Failed to load versions."
      });
    }
  }

  useEffect(() => {
    if (promptName.trim()) {
      const debounce = setTimeout(() => {
        loadVersions(promptName);
      }, 300);
      return () => clearTimeout(debounce);
    }
    setWorkspaceState({ loading: false, versions: [] });
    setSelectedVersion(null);
  }, [promptName]);

  function handleSelectVersion(version: PromptVersionResponse) {
    setSelectedVersion(version);
    setEditContent(version.content);
    setEditTag(version.tag || "");
  }

  async function handleUpdate() {
    if (!selectedVersion) return;
    
    setSaving(true);
    try {
      const updated = await promptApiClient.updatePromptVersion(selectedVersion.id, {
        content: editContent,
        tag: editTag || null
      });
      setSelectedVersion(updated);
      setWorkspaceState((prev) => ({
        ...prev,
        versions: prev.versions.map((v) => (v.id === updated.id ? updated : v))
      }));
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to update prompt.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedVersion) return;
    if (!confirm("Are you sure you want to delete this version?")) return;

    try {
      await promptApiClient.deletePromptVersion(selectedVersion.id);
      setWorkspaceState((prev) => ({
        ...prev,
        versions: prev.versions.filter((v) => v.id !== selectedVersion.id)
      }));
      setSelectedVersion(null);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to delete version.");
    }
  }

  async function handleCreateVersion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!newVersionForm.name.trim() || !newVersionForm.content.trim()) {
      return;
    }

    try {
      const created = await promptApiClient.createPrompt({
        name: newVersionForm.name.trim(),
        content: newVersionForm.content.trim(),
        tag: newVersionForm.tag?.trim() || undefined
      });
      setWorkspaceState((prev) => ({
        ...prev,
        versions: [created, ...prev.versions]
      }));
      handleSelectVersion(created);
      setNewVersionDialogOpen(false);
      setNewVersionForm({ name: "", content: "", tag: "" });
      setPromptName(created.name);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Failed to create version.");
    }
  }

  return (
    <div className="flex h-[calc(100vh-200px)] min-h-[500px] rounded-lg border bg-card shadow-sm">
      <aside className="w-64 flex-shrink-0 border-r bg-muted/20">
        <div className="flex h-full flex-col">
          <div className="border-b p-3">
            <input
              className={inputClassName}
              value={promptName}
              onChange={(e) => setPromptName(e.target.value)}
              placeholder="Search prompt name..."
            />
          </div>

          <div className="flex-1 overflow-y-auto p-2">
            {workspaceState.loading ? (
              <p className="p-3 text-sm text-muted-foreground">Loading...</p>
            ) : workspaceState.versions.length === 0 ? (
              <p className="p-3 text-sm text-muted-foreground">
                {promptName ? "No versions yet." : "Enter a prompt name to search."}
              </p>
            ) : (
              <ul className="space-y-1">
                {workspaceState.versions.map((version) => (
                  <li key={version.id}>
                    <button
                      className={`w-full rounded-md px-3 py-2 text-left text-sm transition-colors ${
                        selectedVersion?.id === version.id
                          ? "bg-primary text-primary-foreground"
                          : "hover:bg-muted"
                      }`}
                      onClick={() => handleSelectVersion(version)}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">v{version.version}</span>
                        <span className="text-xs opacity-70">{version.tag || "none"}</span>
                      </div>
                      <div className="text-xs opacity-70">
                        {new Date(version.created_at).toLocaleDateString()}
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="border-t p-2">
            <Button
              className="w-full"
              size="sm"
              variant="outline"
              onClick={() => {
                setNewVersionForm((prev) => ({ ...prev, name: promptName }));
                setNewVersionDialogOpen(true);
              }}
            >
              + New Version
            </Button>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col">
        {selectedVersion ? (
          <>
            <header className="flex items-center justify-between border-b px-4 py-3">
              <div>
                <h2 className="font-semibold">{selectedVersion.name}</h2>
                <p className="text-xs text-muted-foreground">
                  Version {selectedVersion.version} • ID: {selectedVersion.id}
                </p>
              </div>
              <div className="flex gap-2">
                <Button size="sm" variant="outline" onClick={handleDelete}>
                  Delete
                </Button>
                <Button size="sm" onClick={handleUpdate} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </header>

            <div className="border-b px-4">
              <nav className="flex gap-4">
                {(["prompt", "config", "generations", "use"] as Tab[]).map((tab) => (
                  <button
                    key={tab}
                    className={`border-b-2 py-2 text-sm font-medium capitalize transition-colors ${
                      activeTab === tab
                        ? "border-primary text-primary"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab(tab)}
                  >
                    {tab === "generations" ? "Linked Generations" : tab === "use" ? "Use Prompt" : tab}
                  </button>
                ))}
              </nav>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {activeTab === "prompt" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium">Tag</label>
                    <input
                      className={`${inputClassName} mt-1`}
                      value={editTag}
                      onChange={(e) => setEditTag(e.target.value)}
                      placeholder="e.g., production, staging"
                    />
                  </div>
                  <div className="flex-1">
                    <label className="text-sm font-medium">Content</label>
                    <textarea
                      className={`${inputClassName} mt-1 min-h-[300px] font-mono text-sm`}
                      value={editContent}
                      onChange={(e) => setEditContent(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {activeTab === "config" && (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>Configuration options coming soon.</p>
                </div>
              )}

              {activeTab === "generations" && (
                <div className="flex h-full items-center justify-center text-muted-foreground">
                  <p>Linked generations coming soon.</p>
                </div>
              )}

              {activeTab === "use" && (
                <div className="space-y-4">
                  <h3 className="font-medium">Use this prompt via API</h3>
                  <div className="rounded-md bg-muted p-4">
                    <p className="mb-2 text-sm font-medium">cURL</p>
                    <pre className="overflow-x-auto text-xs">
{`curl -X GET "${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/prompts?name=${selectedVersion.name}" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
                    </pre>
                  </div>
                  <div className="rounded-md bg-muted p-4">
                    <p className="mb-2 text-sm font-medium">JavaScript</p>
                    <pre className="overflow-x-auto text-xs">
{`const response = await fetch(
  "${import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000'}/api/v1/prompts?name=${selectedVersion.name}",
  {
    headers: { Authorization: "Bearer YOUR_TOKEN" }
  }
);
const prompts = await response.json();`}
                    </pre>
                  </div>
                </div>
              )}
            </div>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p>Select a version to view and edit.</p>
              <p className="mt-1 text-sm">
                Or{" "}
                <button
                  className="text-primary hover:underline"
                  onClick={() => setNewVersionDialogOpen(true)}
                >
                  create a new version
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {newVersionDialogOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <div className="w-full max-w-lg rounded-lg bg-background p-6 shadow-lg">
            <h3 className="text-lg font-semibold">Create New Version</h3>
            <form className="mt-4 space-y-4" onSubmit={handleCreateVersion}>
              <div>
                <label className="text-sm font-medium">Prompt Name</label>
                <input
                  className={`${inputClassName} mt-1`}
                  value={newVersionForm.name}
                  onChange={(e) =>
                    setNewVersionForm((prev) => ({ ...prev, name: e.target.value }))
                  }
                  placeholder="e.g., qa-answer-with-context"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Content</label>
                <textarea
                  className={`${inputClassName} mt-1 min-h-32`}
                  value={newVersionForm.content}
                  onChange={(e) =>
                    setNewVersionForm((prev) => ({ ...prev, content: e.target.value }))
                  }
                  placeholder="Enter your prompt template..."
                  required
                />
              </div>
              <div>
                <label className="text-sm font-medium">Tag (optional)</label>
                <input
                  className={`${inputClassName} mt-1`}
                  value={newVersionForm.tag}
                  onChange={(e) =>
                    setNewVersionForm((prev) => ({ ...prev, tag: e.target.value }))
                  }
                  placeholder="e.g., production, staging"
                />
              </div>
              <div className="flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setNewVersionDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">Create</Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
