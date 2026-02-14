import { FormEvent, useEffect, useState } from "react";
import { Copy, Plus, Search, Trash2 } from "lucide-react";
import { diffLines } from "diff";

import {
  promptApiClient,
  type PromptCreateRequest,
  type PromptVersionResponse
} from "@/lib/api-client";
import { Badge } from "@/components/ui/badge";
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

type Tab = "prompt" | "diff" | "config" | "generations" | "use";

type DiffRow = {
  kind: "context" | "added" | "removed";
  oldLine: number | null;
  newLine: number | null;
  text: string;
};

const TAG_COLORS: Record<string, string> = {
  production: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
  staging: "bg-amber-500/20 text-amber-400 border-amber-500/30",
  latest: "bg-blue-500/20 text-blue-400 border-blue-500/30"
};

function getTagColor(tag?: string): string {
  if (!tag) return "";
  return TAG_COLORS[tag.toLowerCase()] || "bg-violet-500/20 text-violet-400 border-violet-500/30";
}

function toDiffRows(previousContent: string, currentContent: string): DiffRow[] {
  const changes = diffLines(previousContent, currentContent);
  const rows: DiffRow[] = [];

  let oldLine = 1;
  let newLine = 1;

  for (const change of changes) {
    const kind: DiffRow["kind"] = change.added
      ? "added"
      : change.removed
        ? "removed"
        : "context";

    const rawLines = change.value.split("\n");
    if (rawLines.length > 0 && rawLines[rawLines.length - 1] === "") {
      rawLines.pop();
    }

    if (rawLines.length === 0) {
      rawLines.push("");
    }

    for (const rawLine of rawLines) {
      if (kind === "added") {
        rows.push({ kind, oldLine: null, newLine, text: rawLine });
        newLine += 1;
      } else if (kind === "removed") {
        rows.push({ kind, oldLine, newLine: null, text: rawLine });
        oldLine += 1;
      } else {
        rows.push({ kind, oldLine, newLine, text: rawLine });
        oldLine += 1;
        newLine += 1;
      }
    }
  }

  return rows;
}

type PromptWorkspaceProps = {
  promptName: string;
  onPromptNamesChanged?: () => void;
};

export function PromptWorkspace({ promptName, onPromptNamesChanged }: PromptWorkspaceProps) {
  const [versions, setVersions] = useState<PromptVersionResponse[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedVersion, setSelectedVersion] = useState<PromptVersionResponse | null>(null);
  const [compareVersionId, setCompareVersionId] = useState<number | null>(null);
  const [editContent, setEditContent] = useState("");
  const [editTag, setEditTag] = useState("");
  const [activeTab, setActiveTab] = useState<Tab>("prompt");
  const [saving, setSaving] = useState(false);
  const [searchFilter, setSearchFilter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [newForm, setNewForm] = useState<PromptCreateRequest>({ name: "", content: "", tag: "" });
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (promptName) {
      loadVersions();
    }
  }, [promptName]);

  async function loadVersions() {
    setLoading(true);
    try {
      const result = await promptApiClient.getPrompts({ name: promptName });
      setVersions(result);
      if (result.length > 0) {
        selectVersion(result[0]);
      } else {
        setSelectedVersion(null);
      }
    } catch {
      setVersions([]);
      setSelectedVersion(null);
    } finally {
      setLoading(false);
    }
  }

  function selectVersion(v: PromptVersionResponse) {
    setSelectedVersion(v);
    setEditContent(v.content);
    setEditTag(v.tag || "");
  }

  useEffect(() => {
    if (!selectedVersion) {
      setCompareVersionId(null);
      return;
    }

    const candidates = versions.filter((version) => version.id !== selectedVersion.id);
    if (candidates.length === 0) {
      setCompareVersionId(null);
      return;
    }

    setCompareVersionId((current) => {
      if (current && candidates.some((version) => version.id === current)) {
        return current;
      }

      const selectedIndex = versions.findIndex((version) => version.id === selectedVersion.id);
      const immediatePrevious =
        selectedIndex >= 0 && selectedIndex + 1 < versions.length
          ? versions[selectedIndex + 1]
          : null;

      if (immediatePrevious && immediatePrevious.id !== selectedVersion.id) {
        return immediatePrevious.id;
      }

      return candidates[0].id;
    });
  }, [selectedVersion, versions]);

  async function handleSave() {
    if (!selectedVersion) return;
    setSaving(true);
    try {
      const updated = await promptApiClient.updatePromptVersion(selectedVersion.id, {
        content: editContent,
        tag: editTag || null
      });
      setSelectedVersion(updated);
      setVersions((prev) => prev.map((v) => (v.id === updated.id ? updated : v)));
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to save.");
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete() {
    if (!selectedVersion || !confirm("Delete this version?")) return;
    try {
      await promptApiClient.deletePromptVersion(selectedVersion.id);
      const next = versions.filter((v) => v.id !== selectedVersion.id);
      setVersions(next);
      onPromptNamesChanged?.();
      if (next.length > 0) {
        selectVersion(next[0]);
      } else {
        setSelectedVersion(null);
      }
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to delete.");
    }
  }

  async function handleCreate(e: FormEvent) {
    e.preventDefault();
    if (!newForm.name.trim() || !newForm.content.trim()) return;
    try {
      const created = await promptApiClient.createPrompt({
        name: newForm.name.trim(),
        content: newForm.content.trim(),
        tag: newForm.tag?.trim() || undefined
      });
      setVersions((prev) => [created, ...prev]);
      selectVersion(created);
      onPromptNamesChanged?.();
      setDialogOpen(false);
      setNewForm({ name: "", content: "", tag: "" });
    } catch (err) {
      alert(err instanceof Error ? err.message : "Failed to create.");
    }
  }

  function copyContent() {
    navigator.clipboard.writeText(editContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  const filteredVersions = versions.filter((v) => {
    if (!searchFilter) return true;
    const q = searchFilter.toLowerCase();
    return (
      String(v.version).includes(q) ||
      (v.tag?.toLowerCase().includes(q) ?? false) ||
      v.content.toLowerCase().includes(q)
    );
  });

  const tabs: { key: Tab; label: string }[] = [
    { key: "prompt", label: "Prompt" },
    { key: "diff", label: "Diff" },
    { key: "config", label: "Config" },
    { key: "generations", label: "Linked Generations" },
    { key: "use", label: "Use Prompt" }
  ];

  const comparisonOptions = selectedVersion
    ? versions.filter((version) => version.id !== selectedVersion.id)
    : [];
  const comparedVersion =
    selectedVersion && compareVersionId
      ? versions.find((version) => version.id === compareVersionId) ?? null
      : null;
  const diffRows =
    selectedVersion && comparedVersion
      ? toDiffRows(comparedVersion.content, selectedVersion.content)
      : [];
  const addedLines = diffRows.filter((row) => row.kind === "added").length;
  const removedLines = diffRows.filter((row) => row.kind === "removed").length;

  return (
    <div className="flex h-full">
      {/* Versions sidebar */}
      <div className="flex w-[260px] flex-shrink-0 flex-col border-r">
        <div className="flex items-center gap-2 border-b p-3">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search versions"
              value={searchFilter}
              onChange={(e) => setSearchFilter(e.target.value)}
            />
          </div>
          <Button
            size="sm"
            onClick={() => {
              setNewForm({ name: promptName, content: "", tag: "" });
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-1 h-4 w-4" />
            New
          </Button>
        </div>

        <ScrollArea className="flex-1">
          {loading ? (
            <p className="p-4 text-sm text-muted-foreground">Loading...</p>
          ) : filteredVersions.length === 0 ? (
            <div className="p-4 text-center text-sm text-muted-foreground">
              <p>No versions yet.</p>
              <button
                className="mt-1 text-primary hover:underline"
                onClick={() => {
                  setNewForm({ name: promptName, content: "", tag: "" });
                  setDialogOpen(true);
                }}
              >
                Create first version
              </button>
            </div>
          ) : (
            <div className="p-2">
              {filteredVersions.map((v) => (
                <button
                  key={v.id}
                  className={`group relative mb-1 w-full rounded-md px-3 py-2.5 text-left transition-colors ${
                    selectedVersion?.id === v.id
                      ? "bg-accent text-accent-foreground"
                      : "hover:bg-accent/50"
                  }`}
                  onClick={() => selectVersion(v)}
                >
                  {/* Timeline dot */}
                  <div className="absolute -left-0.5 top-4 h-2 w-2 rounded-full bg-muted-foreground/40" />

                  <div className="flex items-center gap-2">
                    <Badge variant="outline" className="text-xs font-mono">
                      # {v.version}
                    </Badge>
                    {v.tag && (
                      <Badge variant="outline" className={`text-xs ${getTagColor(v.tag)}`}>
                        {v.tag}
                      </Badge>
                    )}
                  </div>
                  <p className="mt-1 truncate text-xs text-muted-foreground">
                    {v.name}
                  </p>
                  <p className="text-xs text-muted-foreground/60">
                    {new Date(v.created_at).toLocaleDateString(undefined, {
                      month: "short",
                      day: "numeric",
                      year: "numeric"
                    })}
                  </p>
                </button>
              ))}
            </div>
          )}
        </ScrollArea>
      </div>

      {/* Main content */}
      <div className="flex flex-1 flex-col overflow-hidden">
        {selectedVersion ? (
          <>
            {/* Header */}
            <div className="flex items-center justify-between border-b px-5 py-3">
              <div className="flex items-center gap-3">
                <Badge variant="outline" className="font-mono text-sm">
                  # {selectedVersion.version}
                </Badge>
                <h2 className="text-lg font-semibold">{selectedVersion.name}</h2>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={handleDelete}>
                  <Trash2 className="mr-1 h-3.5 w-3.5" />
                  Delete
                </Button>
                <Button size="sm" onClick={handleSave} disabled={saving}>
                  {saving ? "Saving..." : "Save"}
                </Button>
              </div>
            </div>

            {/* Tabs */}
            <div className="border-b px-5">
              <nav className="flex gap-6">
                {tabs.map((tab) => (
                  <button
                    key={tab.key}
                    className={`border-b-2 py-2.5 text-sm font-medium transition-colors ${
                      activeTab === tab.key
                        ? "border-blue-500 text-foreground"
                        : "border-transparent text-muted-foreground hover:text-foreground"
                    }`}
                    onClick={() => setActiveTab(tab.key)}
                  >
                    {tab.label}
                  </button>
                ))}
              </nav>
            </div>

            {/* Tab content */}
            <ScrollArea className="flex-1">
              <div className="p-5">
                {activeTab === "prompt" && (
                  <div className="space-y-5">
                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-sm font-medium text-muted-foreground">Tag</Label>
                      </div>
                      <Input
                        value={editTag}
                        onChange={(e) => setEditTag(e.target.value)}
                        placeholder="e.g., production, staging"
                      />
                    </div>

                    <div>
                      <div className="mb-2 flex items-center justify-between">
                        <Label className="text-sm font-medium text-muted-foreground">System</Label>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={copyContent}
                        >
                          <Copy className="h-3.5 w-3.5" />
                          {copied && <span className="ml-1 text-xs">Copied</span>}
                        </Button>
                      </div>
                      <div className="rounded-md border bg-secondary/30">
                        <Textarea
                          className="min-h-[350px] border-0 bg-transparent font-mono text-sm focus-visible:ring-0"
                          value={editContent}
                          onChange={(e) => setEditContent(e.target.value)}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === "diff" && (
                  <div className="space-y-4">
                    {comparedVersion ? (
                      <>
                        <div className="flex items-center gap-3">
                          <Label className="text-sm font-medium text-muted-foreground">
                            Compare against
                          </Label>
                          <select
                            className="h-9 rounded-md border bg-background px-3 text-sm"
                            value={compareVersionId ?? ""}
                            onChange={(event) => {
                              const value = Number(event.target.value);
                              setCompareVersionId(Number.isNaN(value) ? null : value);
                            }}
                          >
                            {comparisonOptions.map((version) => (
                              <option key={version.id} value={version.id}>
                                v{version.version}
                                {version.tag ? ` (${version.tag})` : ""}
                              </option>
                            ))}
                          </select>
                        </div>
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">
                            Comparing version {selectedVersion.version} with version{" "}
                            {comparedVersion.version}
                          </span>
                          <span className="font-mono text-xs">
                            <span className="text-emerald-500">+{addedLines}</span>{" "}
                            <span className="text-red-500">-{removedLines}</span>
                          </span>
                        </div>
                        <div className="overflow-hidden rounded-md border">
                          <div className="grid grid-cols-[56px_56px_1fr] border-b bg-muted/40 font-mono text-[11px] text-muted-foreground">
                            <div className="border-r px-2 py-1 text-right">Old</div>
                            <div className="border-r px-2 py-1 text-right">New</div>
                            <div className="px-2 py-1">Diff</div>
                          </div>
                          <div className="max-h-[460px] overflow-y-auto font-mono text-xs">
                            {diffRows.map((row, index) => (
                              <div
                                key={`${index}-${row.kind}-${row.oldLine ?? "n"}-${row.newLine ?? "n"}`}
                                className={`grid grid-cols-[56px_56px_1fr] border-b last:border-b-0 ${
                                  row.kind === "added"
                                    ? "bg-emerald-500/10"
                                    : row.kind === "removed"
                                      ? "bg-red-500/10"
                                      : ""
                                }`}
                              >
                                <div className="border-r px-2 py-1 text-right text-muted-foreground">
                                  {row.oldLine ?? ""}
                                </div>
                                <div className="border-r px-2 py-1 text-right text-muted-foreground">
                                  {row.newLine ?? ""}
                                </div>
                                <div className="whitespace-pre-wrap break-words px-2 py-1">
                                  <span
                                    className={`mr-2 inline-block w-3 text-center ${
                                      row.kind === "added"
                                        ? "text-emerald-500"
                                        : row.kind === "removed"
                                          ? "text-red-500"
                                          : "text-muted-foreground"
                                    }`}
                                  >
                                    {row.kind === "added" ? "+" : row.kind === "removed" ? "-" : " "}
                                  </span>
                                  {row.text || " "}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </>
                    ) : (
                      <div className="flex h-60 items-center justify-center text-muted-foreground">
                        No previous version available to compare.
                      </div>
                    )}
                  </div>
                )}

                {activeTab === "config" && (
                  <div className="flex h-60 items-center justify-center text-muted-foreground">
                    Configuration options coming soon.
                  </div>
                )}

                {activeTab === "generations" && (
                  <div className="flex h-60 items-center justify-center text-muted-foreground">
                    Linked generations coming soon.
                  </div>
                )}

                {activeTab === "use" && (
                  <div className="space-y-4">
                    <h3 className="font-medium">Use this prompt via API</h3>
                    <div className="rounded-md border bg-secondary/30 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">cURL</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `curl -X GET "${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/prompts?name=${selectedVersion.name}" \\\n  -H "Authorization: Bearer YOUR_TOKEN"`
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <pre className="overflow-x-auto text-xs text-muted-foreground">
{`curl -X GET "${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/prompts?name=${selectedVersion.name}" \\
  -H "Authorization: Bearer YOUR_TOKEN"`}
                      </pre>
                    </div>
                    <div className="rounded-md border bg-secondary/30 p-4">
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">JavaScript</span>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-7 px-2"
                          onClick={() =>
                            navigator.clipboard.writeText(
                              `const response = await fetch(\n  "${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/prompts?name=${selectedVersion.name}",\n  { headers: { Authorization: "Bearer YOUR_TOKEN" } }\n);\nconst prompts = await response.json();`
                            )
                          }
                        >
                          <Copy className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                      <pre className="overflow-x-auto text-xs text-muted-foreground">
{`const response = await fetch(
  "${import.meta.env.VITE_API_BASE_URL || "http://localhost:8000"}/api/v1/prompts?name=${selectedVersion.name}",
  { headers: { Authorization: "Bearer YOUR_TOKEN" } }
);
const prompts = await response.json();`}
                      </pre>
                    </div>
                  </div>
                )}
              </div>
            </ScrollArea>
          </>
        ) : (
          <div className="flex flex-1 items-center justify-center text-muted-foreground">
            <div className="text-center">
              <p className="text-lg">No version selected</p>
              <p className="mt-1 text-sm">
                Select a version from the list or{" "}
                <button
                  className="text-blue-400 hover:underline"
                  onClick={() => {
                    setNewForm({ name: promptName, content: "", tag: "" });
                    setDialogOpen(true);
                  }}
                >
                  create a new one
                </button>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Create dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Version</DialogTitle>
          </DialogHeader>
          <form className="space-y-4" onSubmit={handleCreate}>
            <div className="space-y-2">
              <Label>Prompt Name</Label>
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
