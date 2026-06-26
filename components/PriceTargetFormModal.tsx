"use client";

import { useCallback, useEffect, useState } from "react";
import { ModalSheet } from "@/components/ModalSheet";
import type { Condition } from "@/lib/analyze-types";
import { fetchSetAnalysis } from "@/lib/set-analysis-client";
import {
  createTarget,
  type PriceTarget,
  type TargetType,
  updateTarget,
} from "@/lib/priceTargets";
import type { SetSearchResult } from "@/lib/search";

export type TargetFormPrefill = {
  setNumber?: string;
  setName?: string;
  theme?: string;
  condition?: string;
  targetType?: TargetType;
  targetPrice?: number;
  notes?: string;
};

type PriceTargetFormModalProps = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  editingTarget?: PriceTarget | null;
  prefill?: TargetFormPrefill;
};

const CONDITIONS: Condition[] = ["sealed", "complete", "incomplete"];

export function PriceTargetFormModal({
  open,
  onClose,
  onSaved,
  editingTarget,
  prefill,
}: PriceTargetFormModalProps) {
  const [setQuery, setSetQuery] = useState("");
  const [selectedSet, setSelectedSet] = useState<SetSearchResult | null>(null);
  const [condition, setCondition] = useState<Condition>("sealed");
  const [targetType, setTargetType] = useState<TargetType>("sell");
  const [targetPrice, setTargetPrice] = useState("");
  const [notes, setNotes] = useState("");
  const [suggestions, setSuggestions] = useState<SetSearchResult[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;

    if (editingTarget) {
      setSetQuery(`${editingTarget.setName} (#${editingTarget.setNumber})`);
      setSelectedSet({
        number: editingTarget.setNumber,
        name: editingTarget.setName,
        theme: editingTarget.theme,
        year: 0,
        pieces: 0,
        msrp: 0,
        retired: false,
        retiringSoon: false,
        estimatedValue: editingTarget.currentPrice,
        recommendedListPrice: editingTarget.targetPrice,
        recommendation: "HOLD",
      });
      setCondition(editingTarget.condition as Condition);
      setTargetType(editingTarget.targetType);
      setTargetPrice(String(editingTarget.targetPrice));
      setNotes(editingTarget.notes ?? "");
      return;
    }

    if (prefill?.setNumber) {
      setSetQuery(`${prefill.setName ?? prefill.setNumber} (#${prefill.setNumber})`);
      setSelectedSet({
        number: prefill.setNumber,
        name: prefill.setName ?? prefill.setNumber,
        theme: prefill.theme ?? "Unknown",
        year: 0,
        pieces: 0,
        msrp: 0,
        retired: false,
        retiringSoon: false,
        estimatedValue: prefill.targetPrice ?? 0,
        recommendedListPrice: prefill.targetPrice ?? 0,
        recommendation: "HOLD",
      });
    } else {
      setSetQuery("");
      setSelectedSet(null);
    }

    setCondition((prefill?.condition as Condition) ?? "sealed");
    setTargetType(prefill?.targetType ?? "sell");
    setTargetPrice(
      prefill?.targetPrice !== undefined ? String(Math.round(prefill.targetPrice)) : "",
    );
    setNotes(prefill?.notes ?? "");
  }, [open, editingTarget, prefill]);

  const fetchSuggestions = useCallback(async (term: string) => {
    const trimmed = term.trim();
    if (trimmed.length < 1 || editingTarget) {
      setSuggestions([]);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(trimmed)}`);
      const data = await res.json();
      setSuggestions((data.results ?? []).slice(0, 6));
    } catch {
      setSuggestions([]);
    } finally {
      setLoading(false);
    }
  }, [editingTarget]);

  useEffect(() => {
    if (!open || editingTarget) return;
    const timer = window.setTimeout(() => {
      void fetchSuggestions(setQuery);
    }, 200);
    return () => window.clearTimeout(timer);
  }, [setQuery, open, editingTarget, fetchSuggestions]);

  async function handleSave() {
    const price = parseFloat(targetPrice);
    if (Number.isNaN(price) || price <= 0) return;

    if (editingTarget) {
      updateTarget(editingTarget.id, {
        targetPrice: price,
        notes: notes.trim() || undefined,
        targetType,
      });
      onSaved();
      onClose();
      return;
    }

    if (!selectedSet) return;
    const analysis = await fetchSetAnalysis(selectedSet.number, condition);
    if (!analysis) return;

    createTarget({
      setNumber: selectedSet.number,
      setName: selectedSet.name,
      theme: selectedSet.theme,
      condition,
      targetType,
      targetPrice: price,
      currentPrice: analysis.estimatedValue,
      notes: notes.trim() || undefined,
    });
    onSaved();
    onClose();
  }

  if (!open) return null;

  return (
    <ModalSheet
      title={editingTarget ? "Edit Target" : "Add Price Target"}
      titleId="price-target-form-title"
      onClose={onClose}
      footer={
        <div className="flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 rounded-xl border border-zinc-700 py-3 text-sm font-semibold text-zinc-300"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={
              targetPrice === "" ||
              Number.isNaN(parseFloat(targetPrice)) ||
              (!editingTarget && !selectedSet)
            }
            className="flex-1 rounded-xl bg-[#f59e0b] py-3 text-sm font-semibold text-zinc-900 disabled:opacity-50"
          >
            Save Target
          </button>
        </div>
      }
    >
      <div className="space-y-4 px-1">
        {!editingTarget && (
          <div>
            <label className="mb-1 block text-xs font-medium text-zinc-500">
              Set
            </label>
            <input
              type="text"
              value={setQuery}
              onChange={(e) => {
                setSetQuery(e.target.value);
                setSelectedSet(null);
              }}
              placeholder="Search by name or set number…"
              className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
            />
            {loading && (
              <p className="mt-1 text-xs text-zinc-600">Searching…</p>
            )}
            {suggestions.length > 0 && !selectedSet && (
              <ul className="mt-2 overflow-hidden rounded-lg border border-zinc-800">
                {suggestions.map((s) => (
                  <li key={s.number}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedSet(s);
                        setSetQuery(`${s.name} (#${s.number})`);
                        setSuggestions([]);
                      }}
                      className="w-full px-3 py-2 text-left text-sm text-zinc-300 hover:bg-zinc-800"
                    >
                      <span className="font-medium text-white">{s.name}</span>
                      <span className="ml-2 text-zinc-500">#{s.number}</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Condition
          </label>
          <select
            value={condition}
            disabled={Boolean(editingTarget)}
            onChange={(e) => setCondition(e.target.value as Condition)}
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white disabled:opacity-60"
          >
            {CONDITIONS.map((c) => (
              <option key={c} value={c}>
                {c.charAt(0).toUpperCase() + c.slice(1)}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="mb-2 block text-xs font-medium text-zinc-500">
            Target type
          </label>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setTargetType("sell")}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
                targetType === "sell"
                  ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Sell Target
            </button>
            <button
              type="button"
              onClick={() => setTargetType("buy")}
              className={`flex-1 rounded-lg border py-2.5 text-sm font-semibold transition ${
                targetType === "buy"
                  ? "border-blue-500/50 bg-blue-500/10 text-blue-400"
                  : "border-zinc-700 text-zinc-400"
              }`}
            >
              Buy Target
            </button>
          </div>
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Target price (AUD)
          </label>
          <input
            type="number"
            min="0"
            step="1"
            value={targetPrice}
            onChange={(e) => setTargetPrice(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white"
          />
        </div>

        <div>
          <label className="mb-1 block text-xs font-medium text-zinc-500">
            Notes (optional)
          </label>
          <textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. Will sell when market peaks post-retirement"
            className="w-full rounded-lg border border-white/10 bg-[#0a0a0a] px-3 py-2.5 text-sm text-white placeholder:text-zinc-600"
          />
        </div>
      </div>
    </ModalSheet>
  );
}
