import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Copy, RefreshCw } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import {
  promptApiClient,
  type ApiKeyCreateResponse,
  type ApiKeyMetadataResponse
} from "@/lib/api-client";

function formatDate(value?: string | null): string {
  if (!value) return "Never";
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
  const [copied, setCopied] = useState(false);

  async function loadKeys() {
    setLoading(true);
    setError(null);
    try {
      setKeys(await promptApiClient.listApiKeys());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load API keys.");
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
    const name = createName.trim();
    if (!name) return;

    setCreating(true);
    try {
      const created = await promptApiClient.createApiKey({ name });
      setRevealedKey(created);
      setKeys((prev) => [created, ...prev]);
      setCreateName("");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create API key.");
    } finally {
      setCreating(false);
    }
  }

  async function handleRevoke(id: number) {
    try {
      await promptApiClient.deleteApiKey(id);
      setKeys((prev) =>
        prev.map((k) =>
          k.id === id ? { ...k, revoked_at: new Date().toISOString() } : k
        )
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to revoke.");
    }
  }

  function copyKey(raw: string) {
    navigator.clipboard.writeText(raw);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }

  return (
    <div className="min-h-screen">
      <div className="mx-auto max-w-3xl px-6 py-8">
        <div className="mb-6 flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => navigate("/")}>
            <ArrowLeft className="mr-1 h-4 w-4" />
            Back
          </Button>
        </div>

        <h1 className="text-2xl font-semibold tracking-tight">API Keys</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Manage integration keys for programmatic access. Max 5 active keys.
        </p>

        <Separator className="my-6" />

        {/* Create */}
        <div className="rounded-lg border p-5">
          <Label className="text-sm font-medium">Create new key</Label>
          <form className="mt-3 flex gap-3" onSubmit={handleCreate}>
            <Input
              className="flex-1"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="Key name (e.g. CI read key)"
            />
            <Button type="submit" disabled={creating}>
              {creating ? "Creating..." : "Create"}
            </Button>
          </form>
        </div>

        {/* Revealed key */}
        {revealedKey && (
          <div className="mt-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-5">
            <p className="text-sm font-medium text-amber-400">
              Copy this key now — it won't be shown again.
            </p>
            <code className="mt-3 block overflow-x-auto rounded border bg-secondary/50 px-3 py-2 font-mono text-xs">
              {revealedKey.api_key}
            </code>
            <Button size="sm" className="mt-3" onClick={() => copyKey(revealedKey.api_key)}>
              <Copy className="mr-1 h-3.5 w-3.5" />
              {copied ? "Copied" : "Copy key"}
            </Button>
          </div>
        )}

        {error && <p className="mt-4 text-sm text-red-400">{error}</p>}

        <Separator className="my-6" />

        {/* Key list */}
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-medium">Your keys</h2>
          <Button variant="ghost" size="sm" onClick={() => void loadKeys()}>
            <RefreshCw className="mr-1 h-3.5 w-3.5" />
            Refresh
          </Button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading...</p>
          ) : keys.length === 0 ? (
            <p className="text-sm text-muted-foreground">No API keys created yet.</p>
          ) : (
            keys.map((key) => (
              <div key={key.id} className="flex items-center justify-between rounded-lg border p-4">
                <div className="space-y-1 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{key.name}</span>
                    <Badge variant="outline" className="font-mono text-xs">
                      {key.prefix}...
                    </Badge>
                    {key.revoked_at ? (
                      <Badge variant="outline" className="border-red-500/30 text-red-400 text-xs">
                        Revoked
                      </Badge>
                    ) : (
                      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 text-xs">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Created {formatDate(key.created_at)}
                    {key.last_used_at && ` · Last used ${formatDate(key.last_used_at)}`}
                  </p>
                </div>
                {!key.revoked_at && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => void handleRevoke(key.id)}
                  >
                    Revoke
                  </Button>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
