"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { EbaySalesResponse } from "@/lib/ebay-sales";

const ADMIN_PASSWORD = "brickvalue2026";
const AUTH_STORAGE_KEY = "brickvalue-price-monitor-auth";
const CHECK_DELAY_MS = 500;

type CatalogueSet = {
  number: string;
  name: string;
  retired?: boolean;
  retiringSoon?: boolean;
};

type PriceStatus =
  | "Pending"
  | "Accurate"
  | "Review"
  | "Update Needed"
  | "No Live Data"
  | "Error";

type PriceCheckRow = {
  setNumber: string;
  name: string;
  ourPrice: number | null;
  ebayAvg: number | null;
  differencePercent: number | null;
  status: PriceStatus;
  note?: string;
};

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(new DOMException("Aborted", "AbortError"));
      return;
    }
    const id = setTimeout(resolve, ms);
    signal?.addEventListener(
      "abort",
      () => {
        clearTimeout(id);
        reject(new DOMException("Aborted", "AbortError"));
      },
      { once: true },
    );
  });
}

function classifyDifference(
  ourPrice: number,
  ebayAvg: number,
  liveData: boolean,
): { differencePercent: number | null; status: PriceStatus } {
  if (!liveData || ebayAvg <= 0) {
    return { differencePercent: null, status: "No Live Data" };
  }
  const differencePercent = Math.round(
    (Math.abs(ourPrice - ebayAvg) / ebayAvg) * 100,
  );
  let status: PriceStatus = "Update Needed";
  if (differencePercent <= 15) status = "Accurate";
  else if (differencePercent <= 30) status = "Review";
  return { differencePercent, status };
}

function statusClass(status: PriceStatus): string {
  switch (status) {
    case "Accurate":
      return "bg-emerald-500/15 text-emerald-400";
    case "Review":
      return "bg-amber-500/15 text-amber-400";
    case "Update Needed":
      return "bg-red-500/15 text-red-400";
    case "Error":
      return "bg-red-500/15 text-red-300";
    case "No Live Data":
      return "bg-zinc-700/50 text-zinc-400";
    default:
      return "bg-zinc-800 text-zinc-500";
  }
}

function formatAud(amount: number | null): string {
  if (amount == null) return "—";
  return `$${amount.toLocaleString("en-AU")}`;
}

function formatPercent(value: number | null): string {
  if (value == null) return "—";
  return `${value}%`;
}

function buildCopyText(rows: PriceCheckRow[]): string {
  const header =
    "Set Number | Set Name | Our Price | eBay Avg | Difference % | Status";
  const lines = rows.map((row) => {
    const our = row.ourPrice != null ? `$${row.ourPrice}` : "—";
    const ebay = row.ebayAvg != null ? `$${row.ebayAvg}` : "—";
    return `${row.setNumber} | ${row.name} | ${our} | ${ebay} | ${formatPercent(row.differencePercent)} | ${row.status}`;
  });

  const needsUpdate = rows.filter((r) => r.status === "Update Needed");
  const review = rows.filter((r) => r.status === "Review");

  const sections = [header, ...lines, ""];

  if (needsUpdate.length > 0) {
    sections.push("Sets needing price updates:");
    for (const row of needsUpdate) {
      sections.push(
        `- ${row.setNumber} ${row.name}: our ${formatAud(row.ourPrice)} vs eBay ${formatAud(row.ebayAvg)} (${formatPercent(row.differencePercent)} off)`,
      );
    }
    sections.push("");
  }

  if (review.length > 0) {
    sections.push("Sets to review:");
    for (const row of review) {
      sections.push(
        `- ${row.setNumber} ${row.name}: our ${formatAud(row.ourPrice)} vs eBay ${formatAud(row.ebayAvg)} (${formatPercent(row.differencePercent)} off)`,
      );
    }
  }

  return sections.join("\n");
}

function PasswordGate({ onUnlock }: { onUnlock: () => void }) {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (password === ADMIN_PASSWORD) {
      sessionStorage.setItem(AUTH_STORAGE_KEY, "1");
      setError("");
      onUnlock();
      return;
    }
    setError("Incorrect password");
  }

  return (
    <div className="mx-auto flex min-h-[70vh] max-w-sm flex-col justify-center px-4">
      <h1 className="text-2xl font-bold text-white">Price Monitor</h1>
      <p className="mt-2 text-sm text-zinc-500">Admin access required</p>
      <form onSubmit={handleSubmit} className="mt-6 space-y-4">
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          autoComplete="current-password"
          className="h-12 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 text-base text-white"
          style={{ fontSize: "16px" }}
        />
        {error && (
          <p className="text-sm text-red-400" role="alert">
            {error}
          </p>
        )}
        <button
          type="submit"
          className="h-12 w-full rounded-lg bg-[#f59e0b] text-sm font-semibold text-zinc-900"
        >
          Enter
        </button>
      </form>
    </div>
  );
}

export default function PriceCheckPage() {
  const [authed, setAuthed] = useState(false);
  const [sets, setSets] = useState<CatalogueSet[]>([]);
  const [rows, setRows] = useState<PriceCheckRow[]>([]);
  const [loadingSets, setLoadingSets] = useState(false);
  const [checking, setChecking] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [copyFeedback, setCopyFeedback] = useState("");
  const cancelRef = useRef(false);

  useEffect(() => {
    if (sessionStorage.getItem(AUTH_STORAGE_KEY) === "1") {
      setAuthed(true);
    }
  }, []);

  const loadSets = useCallback(async () => {
    setLoadingSets(true);
    try {
      const res = await fetch("/api/sets");
      const data = (await res.json()) as { sets?: CatalogueSet[] };
      const list = (data.sets ?? []).sort((a, b) =>
        a.number.localeCompare(b.number, undefined, { numeric: true }),
      );
      setSets(list);
      setRows(
        list.map((s) => ({
          setNumber: s.number,
          name: s.name,
          ourPrice: null,
          ebayAvg: null,
          differencePercent: null,
          status: "Pending",
        })),
      );
    } finally {
      setLoadingSets(false);
    }
  }, []);

  useEffect(() => {
    if (authed) {
      void loadSets();
    }
  }, [authed, loadSets]);

  async function runPriceCheck() {
    if (sets.length === 0 || checking) return;

    cancelRef.current = false;
    setChecking(true);
    setProgress({ current: 0, total: sets.length });

    const nextRows: PriceCheckRow[] = sets.map((s) => ({
      setNumber: s.number,
      name: s.name,
      ourPrice: null,
      ebayAvg: null,
      differencePercent: null,
      status: "Pending",
    }));

    for (let i = 0; i < sets.length; i++) {
      if (cancelRef.current) break;

      const set = sets[i];
      setProgress({ current: i + 1, total: sets.length });

      try {
        const res = await fetch(
          `/api/ebay-sales?setNumber=${encodeURIComponent(set.number)}`,
        );
        const data = (await res.json()) as EbaySalesResponse & {
          error?: string;
        };

        const liveData =
          data.source === "ebay_browse" &&
          !data.mock &&
          data.averageListedPriceAud != null &&
          data.averageListedPriceAud > 0;

        const ebayAvg = liveData ? data.averageListedPriceAud! : null;
        const catalogPrice = data.catalogEstimatedValueAud ?? null;

        if (catalogPrice == null) {
          nextRows[i] = {
            setNumber: set.number,
            name: set.name,
            ourPrice: null,
            ebayAvg,
            differencePercent: null,
            status: "Error",
            note: data.error ?? "No catalogue price",
          };
        } else if (!liveData) {
          nextRows[i] = {
            setNumber: set.number,
            name: set.name,
            ourPrice: catalogPrice,
            ebayAvg: null,
            differencePercent: null,
            status: "No Live Data",
            note: data.message ?? "No live eBay listings",
          };
        } else {
          const { differencePercent, status } = classifyDifference(
            catalogPrice,
            ebayAvg!,
            true,
          );
          nextRows[i] = {
            setNumber: set.number,
            name: set.name,
            ourPrice: catalogPrice,
            ebayAvg,
            differencePercent,
            status,
          };
        }
      } catch (err) {
        nextRows[i] = {
          setNumber: set.number,
          name: set.name,
          ourPrice: null,
          ebayAvg: null,
          differencePercent: null,
          status: "Error",
          note: err instanceof Error ? err.message : "Request failed",
        };
      }

      setRows([...nextRows]);

      if (i < sets.length - 1 && !cancelRef.current) {
        try {
          await sleep(CHECK_DELAY_MS);
        } catch {
          break;
        }
      }
    }

    setChecking(false);
    setProgress({ current: 0, total: 0 });
  }

  function handleCancel() {
    cancelRef.current = true;
  }

  async function handleCopy() {
    const text = buildCopyText(rows);
    try {
      await navigator.clipboard.writeText(text);
      setCopyFeedback("Copied to clipboard");
    } catch {
      setCopyFeedback("Copy failed — select table manually");
    }
    setTimeout(() => setCopyFeedback(""), 2500);
  }

  const updateNeeded = rows.filter((r) => r.status === "Update Needed");
  const reviewCount = rows.filter((r) => r.status === "Review").length;
  const accurateCount = rows.filter((r) => r.status === "Accurate").length;

  if (!authed) {
    return <PasswordGate onUnlock={() => setAuthed(true)} />;
  }

  return (
    <main className="page-main mx-auto max-w-6xl px-4 py-8 md:py-10">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Price Monitor</h1>
          <p className="mt-1 text-sm text-zinc-500">
            Bulk compare catalogue sealed prices to live eBay AU active listings
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sessionStorage.removeItem(AUTH_STORAGE_KEY);
            setAuthed(false);
          }}
          className="text-xs text-zinc-500 hover:text-zinc-300"
        >
          Lock
        </button>
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={() => void runPriceCheck()}
          disabled={checking || loadingSets || sets.length === 0}
          className="h-11 rounded-lg bg-[#f59e0b] px-5 text-sm font-semibold text-zinc-900 disabled:opacity-50"
        >
          Check eBay Prices
        </button>
        {checking && (
          <button
            type="button"
            onClick={handleCancel}
            className="h-11 rounded-lg border border-zinc-600 px-5 text-sm text-zinc-300"
          >
            Cancel
          </button>
        )}
        <button
          type="button"
          onClick={() => void handleCopy()}
          disabled={rows.length === 0}
          className="h-11 rounded-lg border border-zinc-600 px-5 text-sm text-zinc-300 disabled:opacity-50"
        >
          Copy Results
        </button>
        <button
          type="button"
          onClick={() => void loadSets()}
          disabled={loadingSets || checking}
          className="h-11 rounded-lg border border-zinc-700 px-5 text-sm text-zinc-400 disabled:opacity-50"
        >
          Reload sets
        </button>
      </div>

      {checking && progress.total > 0 && (
        <p className="mt-4 text-sm text-[#f59e0b]">
          Checking set {progress.current} of {progress.total}…
        </p>
      )}

      {copyFeedback && (
        <p className="mt-3 text-sm text-emerald-400">{copyFeedback}</p>
      )}

      {!checking && rows.some((r) => r.status !== "Pending") && (
        <div className="mt-4 flex flex-wrap gap-4 text-sm text-zinc-400">
          <span className="text-emerald-400">{accurateCount} accurate</span>
          <span className="text-amber-400">{reviewCount} review</span>
          <span className="text-red-400">{updateNeeded.length} update needed</span>
        </div>
      )}

      {updateNeeded.length > 0 && !checking && (
        <div className="mt-4 rounded-xl border border-red-900/40 bg-red-950/20 p-4">
          <p className="text-sm font-semibold text-red-300">
            Sets needing price updates ({updateNeeded.length})
          </p>
          <ul className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs text-red-200/90">
            {updateNeeded.map((row) => (
              <li key={row.setNumber}>
                {row.setNumber} — {row.name}: {formatAud(row.ourPrice)} vs eBay{" "}
                {formatAud(row.ebayAvg)} ({formatPercent(row.differencePercent)}{" "}
                off)
              </li>
            ))}
          </ul>
        </div>
      )}

      <p className="mt-4 text-xs text-zinc-600">
        {loadingSets
          ? "Loading catalogue…"
          : `${sets.length} sets loaded · 500ms delay between eBay calls`}
      </p>

      <div className="mt-4 overflow-x-auto rounded-xl border border-white/10">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-white/10 bg-zinc-900/80 text-xs uppercase tracking-wide text-zinc-500">
              <th className="px-3 py-3 font-medium">Set Number</th>
              <th className="px-3 py-3 font-medium">Set Name</th>
              <th className="px-3 py-3 font-medium text-right">Our Price</th>
              <th className="px-3 py-3 font-medium text-right">eBay Avg</th>
              <th className="px-3 py-3 font-medium text-right">Difference %</th>
              <th className="px-3 py-3 font-medium">Status</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr
                key={row.setNumber}
                className="border-b border-white/5 hover:bg-white/[0.02]"
              >
                <td className="px-3 py-2.5 font-mono text-zinc-300">
                  {row.setNumber}
                </td>
                <td className="max-w-[200px] truncate px-3 py-2.5 text-zinc-300">
                  {row.name}
                </td>
                <td className="px-3 py-2.5 text-right text-white">
                  {formatAud(row.ourPrice)}
                </td>
                <td className="px-3 py-2.5 text-right text-[#f59e0b]">
                  {formatAud(row.ebayAvg)}
                </td>
                <td className="px-3 py-2.5 text-right text-zinc-400">
                  {formatPercent(row.differencePercent)}
                </td>
                <td className="px-3 py-2.5">
                  <span
                    className={`inline-block rounded-md px-2 py-0.5 text-xs font-medium ${statusClass(row.status)}`}
                    title={row.note}
                  >
                    {row.status}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </main>
  );
}
