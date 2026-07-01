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
  const [importProgress, setImportProgress] = useState(0);
  const [successCount, setSuccessCount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [preview, setPreview] = useState<BricksetImportPreviewItem[]>([]);
  const [fileName, setFileName] = useState("");

  const totalSets = preview.length;
  const progressPercent =
    totalSets > 0 ? Math.round((importProgress / totalSets) * 100) : 0;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file exported from Brickset");
      setPreview([]);
      setFileName("");
      setSuccessCount(null);
      return;
    }

    setParsing(true);
    setError("");
    setPreview([]);
    setSuccessCount(null);
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
    if (preview.length === 0 || importing) return;

    setImporting(true);
    setImportProgress(0);
    setError("");
    setSuccessCount(null);

    try {
      let next: PortfolioItem[] = [];

      for (let i = 0; i < preview.length; i++) {
        const item = preview[i];
        setImportProgress(i + 1);

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
      setSuccessCount(preview.length);
    } catch {
      setError("Import failed. Some sets may not have been added.");
    } finally {
      setImporting(false);
    }
  }

  function handleClose() {
    if (importing) return;
    onClose();
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-start justify-center bg-black/70 px-4 py-8 backdrop-blur-sm sm:items-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="brickset-import-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {successCount !== null ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-2xl">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">
              Successfully imported {successCount} set
              {successCount === 1 ? "" : "s"}!
            </h2>
            <p className="mt-2 text-sm text-zinc-400">
              Your Brickset collection is now in your BrickValue portfolio.
            </p>
            <button
              type="button"
              onClick={handleClose}
              className="mt-6 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black transition hover:bg-amber-400"
            >
              Close
            </button>
          </div>
        ) : (
          <>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2
                  id="brickset-import-title"
                  className="text-lg font-bold text-white"
                >
                  Import from Brickset CSV
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Export your collection from Brickset.com → My Sets → Export,
                  then upload the CSV here.
                </p>
                <a
                  href="https://brickset.com/export/sets/owned"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-2 inline-block text-sm font-medium text-amber-400 hover:underline"
                >
                  Open Brickset export page →
                </a>
              </div>
              <button
                type="button"
                onClick={handleClose}
                disabled={importing}
                className="text-zinc-500 transition hover:text-white disabled:opacity-40"
                aria-label="Close"
              >
                ✕
              </button>
            </div>

            {!importing && (
              <div className="mt-5 space-y-3">
                <label className="block text-sm font-medium text-zinc-400">
                  Brickset CSV file
                </label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  onChange={(e) => void handleFileChange(e)}
                  disabled={parsing}
                  className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-4 py-2.5 text-sm text-white file:mr-3 file:rounded-lg file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-black"
                />
                {fileName && (
                  <p className="text-xs text-zinc-500">Selected: {fileName}</p>
                )}
                {parsing && (
                  <p className="text-sm text-amber-400">Parsing CSV…</p>
                )}
              </div>
            )}

            {importing && (
              <div className="mt-6 rounded-xl border border-white/10 bg-[#0a0a0a] p-5">
                <p className="text-sm font-medium text-white">
                  Importing set {importProgress} of {totalSets}…
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {preview[importProgress - 1]?.name ?? "Preparing…"}
                </p>
                <div className="mt-4 h-2 overflow-hidden rounded-full bg-white/10">
                  <div
                    className="h-full rounded-full bg-amber-500 transition-all duration-300 ease-out"
                    style={{ width: `${progressPercent}%` }}
                  />
                </div>
                <p className="mt-2 text-right text-xs font-medium text-amber-400">
                  {progressPercent}%
                </p>
              </div>
            )}

            {error && (
              <p className="mt-4 text-sm text-red-400" role="alert">
                {error}
              </p>
            )}

            {preview.length > 0 && !importing && (
              <div className="mt-5">
                <p className="text-sm font-medium text-white">
                  <span className="text-amber-400">{preview.length}</span> set
                  {preview.length === 1 ? "" : "s"} ready to import
                </p>
                <ul className="mt-3 max-h-64 divide-y divide-white/5 overflow-y-auto rounded-xl border border-white/10 bg-[#0a0a0a]">
                  {preview.map((set, index) => (
                    <li
                      key={`${set.setNumber}-${index}`}
                      className="flex items-start justify-between gap-3 px-4 py-3"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-white">
                          <span className="text-amber-400">#{set.setNumber}</span>{" "}
                          {set.name}
                        </p>
                        <p className="mt-0.5 truncate text-xs text-zinc-500">
                          {set.theme}
                        </p>
                      </div>
                      <span className="shrink-0 text-xs text-zinc-500">
                        ×{set.quantity}
                      </span>
                    </li>
                  ))}
                </ul>
                <button
                  type="button"
                  onClick={() => void handleConfirm()}
                  className="mt-4 w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black transition hover:bg-amber-400"
                >
                  Confirm — add {preview.length} sets
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
