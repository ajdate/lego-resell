"use client";

import { useRef, useState } from "react";
import {
  addToPortfolio,
  type PortfolioItem,
} from "@/lib/portfolio";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";

type GenericCSVImportModalProps = {
  onClose: () => void;
  onImportComplete: (items: PortfolioItem[]) => void;
};

type ParsedCsv = {
  headers: string[];
  rows: string[][];
};

const SET_NUMBER_ALIASES = [
  "set number",
  "setnumber",
  "set #",
  "set#",
  "set no",
  "set no.",
  "number",
  "set",
  "item number",
  "itemnumber",
];

const QUANTITY_ALIASES = [
  "quantity",
  "qty",
  "qty.",
  "count",
  "owned",
  "amount",
];

const PRICE_ALIASES = [
  "purchase price",
  "purchaseprice",
  "price paid",
  "pricepaid",
  "price",
  "paid",
  "cost",
  "bought for",
  "rrp",
];

function detectDelimiter(text: string): "," | ";" {
  const firstLine = text.split(/\r?\n/).find((line) => line.trim()) ?? "";
  const commas = (firstLine.match(/,/g) ?? []).length;
  const semis = (firstLine.match(/;/g) ?? []).length;
  return semis > commas ? ";" : ",";
}

function parseCSVLine(line: string, delimiter: "," | ";"): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    const next = line[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === delimiter && !inQuotes) {
      cells.push(current.trim());
      current = "";
      continue;
    }

    current += char;
  }

  cells.push(current.trim());
  return cells;
}

function parseGenericCsv(text: string): ParsedCsv {
  const delimiter = detectDelimiter(text);
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.trimEnd())
    .filter((line) => line.trim().length > 0);

  if (lines.length === 0) {
    return { headers: [], rows: [] };
  }

  const headers = parseCSVLine(lines[0], delimiter).map((h) =>
    h.replace(/^"|"$/g, "").trim(),
  );
  const rows = lines.slice(1).map((line) => parseCSVLine(line, delimiter));

  return { headers, rows };
}

function normalizeHeader(header: string): string {
  return header.toLowerCase().replace(/[_-]+/g, " ").replace(/\s+/g, " ").trim();
}

function findColumnIndex(headers: string[], aliases: string[]): number {
  const normalized = headers.map(normalizeHeader);
  for (const alias of aliases) {
    const idx = normalized.indexOf(alias);
    if (idx >= 0) return idx;
  }
  for (let i = 0; i < normalized.length; i++) {
    if (aliases.some((alias) => normalized[i].includes(alias))) {
      return i;
    }
  }
  return -1;
}

function parseNumber(value: string | undefined, fallback: number): number {
  if (!value) return fallback;
  const cleaned = value.replace(/[^0-9.-]/g, "");
  const num = Number.parseFloat(cleaned);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeSetNumber(value: string): string {
  return value.trim().replace(/^#/, "");
}

export function GenericCSVImportModal({
  onClose,
  onImportComplete,
}: GenericCSVImportModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [parsing, setParsing] = useState(false);
  const [importing, setImporting] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [fileName, setFileName] = useState("");
  const [headers, setHeaders] = useState<string[]>([]);
  const [rows, setRows] = useState<string[][]>([]);
  const [setNumberCol, setSetNumberCol] = useState(-1);
  const [quantityCol, setQuantityCol] = useState(-1);
  const [priceCol, setPriceCol] = useState(-1);
  const [currentSetLabel, setCurrentSetLabel] = useState("");

  const previewRows = rows.slice(0, 3);
  const progressPercent =
    importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0;

  async function handleFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.name.toLowerCase().endsWith(".csv")) {
      setError("Please upload a .csv file");
      setHeaders([]);
      setRows([]);
      setFileName("");
      setSuccessMessage(null);
      return;
    }

    setParsing(true);
    setError("");
    setHeaders([]);
    setRows([]);
    setSuccessMessage(null);
    setFileName(file.name);

    try {
      const text = await file.text();
      const parsed = parseGenericCsv(text);

      if (parsed.headers.length === 0 || parsed.rows.length === 0) {
        setError("No data rows found in this CSV");
        return;
      }

      setHeaders(parsed.headers);
      setRows(parsed.rows);
      setSetNumberCol(findColumnIndex(parsed.headers, SET_NUMBER_ALIASES));
      setQuantityCol(findColumnIndex(parsed.headers, QUANTITY_ALIASES));
      setPriceCol(findColumnIndex(parsed.headers, PRICE_ALIASES));
    } catch {
      setError("Could not read this CSV file. Check the format and try again.");
    } finally {
      setParsing(false);
      event.target.value = "";
    }
  }

  async function handleImport() {
    if (importing || setNumberCol < 0 || rows.length === 0) return;

    const validRows = rows.filter((row) =>
      normalizeSetNumber(row[setNumberCol] ?? ""),
    );

    if (validRows.length === 0) {
      setError("No valid set numbers found in the selected column.");
      return;
    }

    setImporting(true);
    setImportProgress(0);
    setImportTotal(validRows.length);
    setError("");
    setSuccessMessage(null);

    let next: PortfolioItem[] = [];
    let imported = 0;
    let skipped = 0;

    try {
      for (let i = 0; i < validRows.length; i++) {
        const row = validRows[i];
        const setNumber = normalizeSetNumber(row[setNumberCol] ?? "");
        const quantity = Math.max(
          1,
          Math.round(
            quantityCol >= 0 ? parseNumber(row[quantityCol], 1) : 1,
          ),
        );
        const purchasePrice = Math.max(
          0,
          priceCol >= 0 ? parseNumber(row[priceCol], 0) : 0,
        );

        setImportProgress(i + 1);
        setCurrentSetLabel(setNumber);

        const analysis = await fetchSetAnalysis(setNumber, "sealed");
        if (!analysis) {
          skipped += 1;
          continue;
        }

        next = addToPortfolio({
          setNumber: analysis.set.number,
          name: analysis.set.name,
          theme: analysis.set.theme,
          pieces: analysis.set.pieces,
          retired: analysis.set.retired,
          retiringSoon: analysis.set.retiringSoon,
          condition: "sealed",
          purchasePrice,
          estimatedValue: analysis.estimatedValue,
          suggestedListPrice: analysis.recommendedListPrice,
          recommendation: analysis.recommendation,
          quantity,
          intentTag: "undecided",
          notes: "Imported from spreadsheet CSV",
        });
        imported += 1;
      }

      if (imported === 0) {
        setError(
          skipped > 0
            ? "None of the set numbers matched BrickValue catalogues."
            : "No sets were imported.",
        );
        return;
      }

      onImportComplete(next);
      setSuccessMessage(
        `Successfully imported ${imported} set${imported === 1 ? "" : "s"} to your portfolio${
          skipped > 0 ? ` (${skipped} skipped — not found)` : ""
        }.`,
      );
    } catch {
      setError("Import failed. Some sets may not have been added.");
    } finally {
      setImporting(false);
      setImportTotal(0);
      setCurrentSetLabel("");
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
      aria-labelledby="generic-csv-import-title"
      onClick={handleClose}
    >
      <div
        className="w-full max-w-lg rounded-2xl border border-white/10 bg-[#1a1a1a] p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {successMessage !== null ? (
          <div className="py-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full border border-emerald-500/30 bg-emerald-500/10 text-2xl">
              ✓
            </div>
            <h2 className="mt-4 text-xl font-bold text-white">
              Import complete
            </h2>
            <p className="mt-2 text-sm text-zinc-400">{successMessage}</p>
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
                  id="generic-csv-import-title"
                  className="text-lg font-bold text-white"
                >
                  Import from spreadsheet
                </h2>
                <p className="mt-1 text-sm text-zinc-400">
                  Upload any CSV, map your columns, then add sets to your
                  portfolio.
                </p>
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
                  CSV file
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
                  Importing set {importProgress} of {importTotal}…
                </p>
                <p className="mt-1 truncate text-xs text-zinc-500">
                  {currentSetLabel || "Preparing…"}
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

            {headers.length > 0 && !importing && (
              <div className="mt-5 space-y-5">
                <div>
                  <p className="text-sm font-medium text-white">
                    Preview{" "}
                    <span className="text-zinc-500">
                      (first {previewRows.length} of {rows.length} rows)
                    </span>
                  </p>
                  <div className="mt-3 overflow-x-auto rounded-xl border border-white/10 bg-[#0a0a0a]">
                    <table className="min-w-full text-left text-xs text-zinc-300">
                      <thead>
                        <tr className="border-b border-white/10 text-zinc-500">
                          {headers.map((header, index) => (
                            <th
                              key={`${header}-${index}`}
                              className="whitespace-nowrap px-3 py-2 font-medium"
                            >
                              {header || `Column ${index + 1}`}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {previewRows.map((row, rowIndex) => (
                          <tr
                            key={`preview-${rowIndex}`}
                            className="border-b border-white/5 last:border-0"
                          >
                            {headers.map((_, colIndex) => (
                              <td
                                key={`cell-${rowIndex}-${colIndex}`}
                                className="max-w-[140px] truncate px-3 py-2"
                              >
                                {row[colIndex] ?? ""}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="space-y-3">
                  <p className="text-sm font-medium text-white">Column mapping</p>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-zinc-400">
                      Set number <span className="text-amber-400">*</span>
                    </span>
                    <select
                      value={setNumberCol}
                      onChange={(e) =>
                        setSetNumberCol(Number.parseInt(e.target.value, 10))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
                    >
                      <option value={-1}>Select column…</option>
                      {headers.map((header, index) => (
                        <option key={`set-${index}`} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-zinc-400">
                      Quantity{" "}
                      <span className="text-zinc-600">(optional, default 1)</span>
                    </span>
                    <select
                      value={quantityCol}
                      onChange={(e) =>
                        setQuantityCol(Number.parseInt(e.target.value, 10))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
                    >
                      <option value={-1}>None — use 1</option>
                      {headers.map((header, index) => (
                        <option key={`qty-${index}`} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>

                  <label className="block">
                    <span className="mb-1.5 block text-xs text-zinc-400">
                      Purchase price{" "}
                      <span className="text-zinc-600">(optional, default 0)</span>
                    </span>
                    <select
                      value={priceCol}
                      onChange={(e) =>
                        setPriceCol(Number.parseInt(e.target.value, 10))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
                    >
                      <option value={-1}>None — use 0</option>
                      {headers.map((header, index) => (
                        <option key={`price-${index}`} value={index}>
                          {header || `Column ${index + 1}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                <button
                  type="button"
                  onClick={() => void handleImport()}
                  disabled={setNumberCol < 0 || rows.length === 0}
                  className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  Import {rows.length} row{rows.length === 1 ? "" : "s"}
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
