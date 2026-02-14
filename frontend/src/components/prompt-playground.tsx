import { FormEvent, useState } from "react";

import {
  promptApiClient,
  type PromptCreateRequest,
  type PromptVersionResponse
} from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type CreateState = {
  loading: boolean;
  error?: string;
  created?: PromptVersionResponse;
};

type FetchState = {
  loading: boolean;
  error?: string;
  items: PromptVersionResponse[];
};

const inputClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

export function PromptPlayground() {
  const [createForm, setCreateForm] = useState<PromptCreateRequest>({
    name: "",
    content: "",
    tag: ""
  });
  const [lookupName, setLookupName] = useState("");
  const [lookupTag, setLookupTag] = useState("");

  const [createState, setCreateState] = useState<CreateState>({ loading: false });
  const [fetchState, setFetchState] = useState<FetchState>({ loading: false, items: [] });

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!createForm.name.trim() || !createForm.content.trim()) {
      setCreateState({
        loading: false,
        error: "Name and content are required."
      });
      return;
    }

    setCreateState({ loading: true });
    try {
      const created = await promptApiClient.createPrompt({
        name: createForm.name.trim(),
        content: createForm.content.trim(),
        tag: createForm.tag?.trim() || undefined
      });
      setCreateState({ loading: false, created });
    } catch (error) {
      setCreateState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to create prompt."
      });
    }
  }

  async function handleLookup(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!lookupName.trim()) {
      setFetchState({
        loading: false,
        items: [],
        error: "Prompt name is required."
      });
      return;
    }

    setFetchState({ loading: true, items: [] });
    try {
      const items = await promptApiClient.getPrompts({
        name: lookupName.trim(),
        tag: lookupTag.trim() || undefined
      });
      setFetchState({ loading: false, items });
    } catch (error) {
      setFetchState({
        loading: false,
        items: [],
        error: error instanceof Error ? error.message : "Failed to fetch prompts."
      });
    }
  }

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <h2 className="text-xl font-semibold">Prompt Playground</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Create new prompt versions and retrieve versions by prompt name and optional tag.
      </p>

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        <form className="space-y-3" onSubmit={handleCreate}>
          <h3 className="text-sm font-medium">Create Prompt Version</h3>
          <input
            className={inputClassName}
            value={createForm.name}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, name: event.target.value }))
            }
            placeholder="Prompt name"
          />
          <textarea
            className={`${inputClassName} min-h-28`}
            value={createForm.content}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, content: event.target.value }))
            }
            placeholder="Prompt content"
          />
          <input
            className={inputClassName}
            value={createForm.tag}
            onChange={(event) =>
              setCreateForm((current) => ({ ...current, tag: event.target.value }))
            }
            placeholder="Tag (optional)"
          />
          <Button type="submit" disabled={createState.loading}>
            {createState.loading ? "Creating..." : "Create Version"}
          </Button>
          {createState.error && <p className="text-sm text-red-600">{createState.error}</p>}
          {createState.created && (
            <p className="text-sm text-green-700">
              Created version {createState.created.version} for{" "}
              <span className="font-medium">{createState.created.name}</span>.
            </p>
          )}
        </form>

        <form className="space-y-3" onSubmit={handleLookup}>
          <h3 className="text-sm font-medium">Fetch Prompt Versions</h3>
          <input
            className={inputClassName}
            value={lookupName}
            onChange={(event) => setLookupName(event.target.value)}
            placeholder="Prompt name"
          />
          <input
            className={inputClassName}
            value={lookupTag}
            onChange={(event) => setLookupTag(event.target.value)}
            placeholder="Tag (optional)"
          />
          <Button type="submit" variant="outline" disabled={fetchState.loading}>
            {fetchState.loading ? "Fetching..." : "Fetch Versions"}
          </Button>
          {fetchState.error && <p className="text-sm text-red-600">{fetchState.error}</p>}
        </form>
      </div>

      <div className="mt-6 space-y-2">
        <h3 className="text-sm font-medium">Results</h3>
        {fetchState.items.length === 0 ? (
          <p className="text-sm text-muted-foreground">No versions returned yet.</p>
        ) : (
          fetchState.items.map((item) => (
            <div key={item.id} className="rounded-md border p-3 text-sm">
              <p>
                <span className="font-medium">{item.name}</span> v{item.version}
              </p>
              <p className="text-muted-foreground">Tag: {item.tag || "none"}</p>
              <p className="mt-2 whitespace-pre-wrap">{item.content}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
