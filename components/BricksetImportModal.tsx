"use client";

import { useState } from "react";
import { addToPortfolio, type PortfolioItem } from "@/lib/portfolio";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";

export interface BricksetImportPreviewItem {
  setNumber: string;
  name: string;
  theme: string;
  year: number;
  condition: string;
  intent: string;
  pricePaid: number;
  quantity: number;
  dateAdded: string;
  source: string;
}

type BricksetImportModalProps = {
  onClose: () => void;
  onImportComplete: (items: PortfolioItem[]) => void;
};

export function BricksetImportModal({
  onClose,
  onImportComplete,
}: BricksetImportModalProps) {
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<BricksetImportPreviewItem[]>([]);

  async function handleFetch() {
    const trimmed = username.trim();
    if (!trimmed) {
      setError("Enter your Brickset username");
      return;
    }

    setLoading(true);
    setError("");
    setPreview([]);

    try {
      const res = await fetch("/api/brickset-import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bricksetUsername: trimmed }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not fetch Brickset collection");
        return;
      }
      const sets = (data.sets ?? []) as BricksetImportPreviewItem[];
      if (sets.length === 0) {
        setError("No owned sets found for that username");
        return;
      }
      setPreview(sets);
    } catch {
      setError("Failed to connect to Brickset. Try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleConfirm() {
    if (preview.length === 0) return;

    setImporting(true);
    setError("");

    try {
      let next: PortfolioItem[] = [];

      for (const item of preview) {
        const analysis = await fetchSetAnalysis(item.setNumber, "sealed");
        next = addToPortfolio({
          setNumber: item.setNumber,
          name: item.name,
          theme: item.theme || analysis?.set.theme || "Unknown",
          condition: "sealed",
          purchasePrice: item.pricePaid,
          estimatedValue:
            analysis?.estimatedValue ?? Math.max(item.pricePaid, 0),
          suggestedListPrice:
            analysis?.recommendedListPrice ??
            Math.max(item.pricePaid, 0),
          recommendation: analysis?.recommendation ?? "HOLD",
          quantity: item.quantity,
          intentTag: "undecided",
          notes: "Imported from Brickset",
        });
      }

      onImportComplete(next);
      onClose();
    } catch {
      setError("Import failed. Some sets may not have been added.");
    } finally {
      setImporting(false);
    }
  }

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brickset-import-title"
      onClick={onClose}
    >
      <div
        className="modal-panel w-full max-w-lg"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2
              id="brickset-import-title"
              className="text-lg font-bold text-white"
            >
              Import from Brickset
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Enter your public Brickset username to import your owned sets.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-zinc-500 transition hover:text-white"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <label className="block text-sm font-medium text-zinc-400">
            Brickset username
          </label>
          <input
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your Brickset username"
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder:text-zinc-600"
            disabled={loading || importing}
          />
          <button
            type="button"
            onClick={() => void handleFetch()}
            disabled={loading || importing || !username.trim()}
            className="w-full rounded-xl bg-[#f59e0b] py-2.5 text-sm font-bold text-zinc-900 transition hover:bg-[#fbbf24] disabled:opacity-50"
          >
            {loading ? "Fetching…" : "Import from Brickset"}
          </button>
        </div>

        {error && (
          <p className="mt-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {preview.length > 0 && (
          <div className="mt-5">
            <p className="text-sm font-medium text-zinc-300">
              {preview.length} set{preview.length === 1 ? "" : "s"} found
            </p>
            <ul className="mt-3 max-h-56 space-y-2 overflow-y-auto rounded-xl border border-white/10 bg-zinc-950/50 p-3">
              {preview.map((set) => (
                <li
                  key={set.setNumber}
                  className="flex items-center justify-between gap-2 text-sm"
                >
                  <span className="min-w-0 truncate text-white">
                    <span className="text-zinc-500">#{set.setNumber}</span>{" "}
                    {set.name}
                  </span>
                  <span className="shrink-0 text-xs text-zinc-500">
                    ×{set.quantity}
                  </span>
                </li>
              ))}
            </ul>
            <button
              type="button"
              onClick={() => void handleConfirm()}
              disabled={importing}
              className="mt-4 w-full rounded-xl border border-emerald-500/40 bg-emerald-500/10 py-2.5 text-sm font-semibold text-emerald-300 transition hover:bg-emerald-500/20 disabled:opacity-50"
            >
              {importing
                ? "Adding to portfolio…"
                : `Confirm — add ${preview.length} sets`}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
