"use client";

import { useRef, useState } from "react";
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

function parseCSVLine(line: string): string[] {
  const matches = line.match(/"([^"]*)"/g) || [];
  return matches.map((m) => m.replace(/"/g, ""));
}

function parseBricksetCsv(text: string): BricksetImportPreviewItem[] {
  const lines = text.split("\n");
  const items: BricksetImportPreviewItem[] = [];

  for (const line of lines.slice(1)) {
    if (!line.trim()) continue;

    const cols = parseCSVLine(line);
    const setNumber = cols[1]?.trim() ?? "";
    const quantity = parseInt(cols[48] ?? "0", 10) || 0;

    if (!setNumber || quantity <= 0) continue;

    items.push({
      setNumber,
      name: cols[8] ?? setNumber,
      theme: cols[5] ?? "Unknown",
      year: parseInt(cols[3] ?? "", 10) || 2020,
      condition: "sealed",
      intent: "undecided",
      pricePaid: Math.round((parseFloat(cols[11] ?? "0") || 0) * 1.55),
      quantity,
      dateAdded: new Date().toISOString(),
      source: "brickset-csv-import",
    });
  }

  return items;
}

export function BricksetImportModal({
  onClose,
  onImportComplete,
}: BricksetImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<BricksetImportPreviewItem[]>([]);
  const [fileName, setFileName] = useState("");

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file exported from Brickset");
      setPreview([]);
      setFileName("");
      return;
    }

    setParsing(true);
    setError("");
    setPreview([]);
    setFileName(file.name);

    try {
      const text = await file.text();
      const sets = parseBricksetCsv(text);
      if (sets.length === 0) {
        setError("No owned sets found in this CSV");
        return;
      }
      setPreview(sets);
    } catch {
      setError("Could not read this CSV file. Try exporting again from Brickset.");
    } finally {
      setParsing(false);
      event.target.value = "";
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
            analysis?.recommendedListPrice ?? Math.max(item.pricePaid, 0),
          recommendation: analysis?.recommendation ?? "HOLD",
          quantity: item.quantity,
          intentTag: "undecided",
          notes: "Imported from Brickset CSV",
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
              Import from Brickset CSV
            </h2>
            <p className="mt-1 text-sm text-zinc-400">
              Export your collection from Brickset.com → My Sets → Export, then
              upload the CSV here.
            </p>
            <a
              href="https://brickset.com/export/sets/owned"
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-sm font-medium text-[#f59e0b] hover:underline"
            >
              Open Brickset export page →
            </a>
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
            Brickset CSV file
          </label>
          <input
            ref={fileInputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={(e) => void handleFileChange(e)}
            disabled={parsing || importing}
            className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-[#f59e0b] file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-zinc-900"
          />
          {fileName && (
            <p className="text-xs text-zinc-500">Selected: {fileName}</p>
          )}
          {parsing && (
            <p className="text-sm text-zinc-400">Parsing CSV…</p>
          )}
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
                  key={`${set.setNumber}-${set.quantity}`}
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
