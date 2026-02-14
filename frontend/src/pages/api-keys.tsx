import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "@/components/ui/button";
import {
  promptApiClient,
  type ApiKeyCreateResponse,
  type ApiKeyMetadataResponse
} from "@/lib/api-client";

const inputClassName =
  "w-full rounded-md border bg-background px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary/40";

function formatDate(value?: string | null): string {
  if (!value) {
    return "Never";
  }
  return new Date(value).toLocaleString();
}

export function ApiKeysPage() {
  const navigate = useNavigate();
  const [keys, setKeys] = useState<ApiKeyMetadataResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [createName, setCreateName] = useState("");
  const [creating, setCreating] = useState(false);
  const [revealedKey, setRevealedKey] = useState<ApiKeyCreateResponse | null>(null);
  const [copyStatus, setCopyStatus] = useState<string | null>(null);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      const list = await promptApiClient.listApiKeys();
      setKeys(list);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Failed to load API keys.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadKeys();
  }, []);

  async function handleCreate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setCopyStatus(null);

    const name = createName.trim();
    if (!name) {
      setError("Key name is required.");
      return;
    }

    setCreating(true);
    try {
      const created = await promptApiClient.createApiKey({ name });
      setRevealedKey(created);
      setKeys((current) => [created, ...current]);
      setCreateName("");
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleDelete(id: number) {
    setError(null);
    setCopyStatus(null);
    try {
      await promptApiClient.deleteApiKey(id);
      setKeys((current) =>
        current.map((key) =>
          key.id === id ? { ...key, revoked_at: new Date().toISOString() } : key
        )
      );
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "Failed to revoke API key.");
    }
  }

  async function copyKey(rawKey: string) {
    try {
      await navigator.clipboard.writeText(rawKey);
      setCopyStatus("Copied to clipboard.");
    } catch {
      setCopyStatus("Copy failed. Please copy manually.");
    }
  }

  return (
    <main className="min-h-screen bg-background text-foreground">
      <div className="mx-auto max-w-4xl p-8">
        <header className="mb-8 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-3xl font-bold">API Keys</h1>
            <p className="mt-2 text-muted-foreground">
              Create and revoke user-specific read-only integration keys.
            </p>
          </div>
          <Button variant="outline" onClick={() => navigate("/", { replace: true })}>
            Back to Home
          </Button>
        </header>

        <section className="mb-6 rounded-lg border bg-card p-6 shadow-sm">
          <h2 className="text-lg font-semibold">Create API Key</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            You can have up to 5 active keys. The raw key is shown only once.
          </p>
          <form className="mt-4 flex flex-col gap-3 sm:flex-row" onSubmit={handleCreate}>
            <input
              className={inputClassName}
              value={createName}
              onChange={(event) => setCreateName(event.target.value)}
              placeholder="Key name (e.g. CI read key)"
            />
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create Key"}
            </Button>
          </form>
        </section>

        {revealedKey && (
          <section className="mb-6 rounded-lg border border-amber-300 bg-amber-50 p-6 text-amber-900">
            <h3 className="text-sm font-semibold">Copy this key now</h3>
            <p className="mt-1 text-sm">This value will not be shown again.</p>
            <code className="mt-3 block overflow-x-auto rounded bg-white p-3 text-xs">
              {revealedKey.api_key}
            </code>
            <div className="mt-3 flex items-center gap-3">
              <Button onClick={() => copyKey(revealedKey.api_key)}>Copy</Button>
              {copyStatus && <span className="text-sm">{copyStatus}</span>}
            </div>
          </section>
        )}

        <section className="rounded-lg border bg-card p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your Keys</h2>
            <Button variant="outline" onClick={() => void loadKeys()}>
              Refresh
            </Button>
          </div>

          {error && <p className="mb-3 text-sm text-red-600">{error}</p>}
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys created yet.</p>
          ) : (
            <div className="space-y-3">
              {keys.map((key) => (
                <div key={key.id} className="rounded-md border p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="space-y-1 text-sm">
                      <p>
                        <span className="font-medium">{key.name}</span> ({key.prefix}...)
                      </p>
                      <p className="text-muted-foreground">Created: {formatDate(key.created_at)}</p>
                      <p className="text-muted-foreground">
                        Last used: {formatDate(key.last_used_at || null)}
                      </p>
                      <p className="text-muted-foreground">
                        Revoked: {key.revoked_at ? formatDate(key.revoked_at) : "Active"}
                      </p>
                    </div>
                    <Button
                      variant="outline"
                      disabled={Boolean(key.revoked_at)}
                      onClick={() => void handleDelete(key.id)}
                    >
                      {key.revoked_at ? "Revoked" : "Revoke"}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
