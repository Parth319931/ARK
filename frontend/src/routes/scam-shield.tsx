/**
 * frontend/src/routes/scam-shield.tsx
 * Scam Shield: paste a message, get a risk percentage + line-by-line explanation.
 */
import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { RequireAuth } from "@/components/RequireAuth";
import { api, ApiError } from "@/lib/api";

export const Route = createFileRoute("/scam-shield")({
  component: () => (
    <RequireAuth>
      <ScamShieldPage />
    </RequireAuth>
  ),
});

interface ScamShieldResult {
  risk_percentage: number;
  verdict: "risky" | "safe";
  explanations: string[];
}

function ScamShieldPage() {
  const [message, setMessage] = useState("");
  const [result, setResult] = useState<ScamShieldResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleAnalyze() {
    if (!message.trim()) return;
    setIsLoading(true);
    setError(null);
    setResult(null);
    try {
      const data = await api.post<ScamShieldResult>("/scam-shield/analyze", { message });
      setResult(data);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Something went wrong. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const isRisky = result?.verdict === "risky";

  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 px-4 py-10">
      <div>
        <h1 className="text-2xl font-semibold">Scam Shield</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Paste any SMS, WhatsApp, or email message below to check if it's a scam.
        </p>
      </div>

      <textarea
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        rows={6}
        placeholder="Paste the suspicious message here..."
        className="rounded-md border px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-primary"
      />

      <button
        onClick={handleAnalyze}
        disabled={isLoading || !message.trim()}
        className="self-start rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-opacity hover:opacity-90 disabled:opacity-50"
      >
        {isLoading ? "Analyzing…" : "Analyze Message"}
      </button>

      {error && (
        <p className="rounded-md bg-destructive/10 px-3 py-2 text-sm text-destructive">{error}</p>
      )}

      {result && (
        <div className="flex flex-col gap-4 rounded-lg border p-5">
          <div className="flex items-center gap-4">
            <div
              className={`flex h-16 w-16 items-center justify-center rounded-full text-lg font-bold ${
                isRisky
                  ? "bg-destructive/10 text-destructive"
                  : "bg-green-500/10 text-green-600"
              }`}
            >
              {result.risk_percentage}%
            </div>
            <div>
              <p className={`text-lg font-semibold ${isRisky ? "text-destructive" : "text-green-600"}`}>
                {isRisky ? "Risky — likely a scam" : "Looks safe"}
              </p>
              <p className="text-sm text-muted-foreground">
                {isRisky
                  ? "We recommend not clicking links or sharing any info."
                  : "No major red flags detected, but always stay cautious."}
              </p>
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium">Why:</p>
            <ul className="flex flex-col gap-2">
              {result.explanations.map((line, i) => (
                <li key={i} className="flex gap-2 text-sm">
                  <span className="text-muted-foreground">•</span>
                  <span>{line}</span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}