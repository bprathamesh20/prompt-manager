import { useEffect, useState } from "react";

import { promptApiClient, type HealthResponse } from "@/lib/api-client";
import { Button } from "@/components/ui/button";

type HealthState = {
  loading: boolean;
  data?: HealthResponse;
  error?: string;
};

export function HealthCard() {
  const [state, setState] = useState<HealthState>({ loading: true });

  async function loadHealth() {
    setState({ loading: true });
    try {
      const data = await promptApiClient.getHealth();
      setState({ loading: false, data });
    } catch (error) {
      setState({
        loading: false,
        error: error instanceof Error ? error.message : "Failed to fetch health"
      });
    }
  }

  useEffect(() => {
    void loadHealth();
  }, []);

  return (
    <div className="rounded-lg border bg-card p-6 shadow-sm">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">Backend Health</h2>
        <Button onClick={loadHealth}>Refresh</Button>
      </div>

      {state.loading && <p className="text-sm text-muted-foreground">Checking service...</p>}

      {state.data && (
        <div className="space-y-1 text-sm">
          <p>
            <span className="font-medium">Service:</span> {state.data.status}
          </p>
          <p>
            <span className="font-medium">Database:</span> {state.data.database}
          </p>
        </div>
      )}

      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
    </div>
  );
}
