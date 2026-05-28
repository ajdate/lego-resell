"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import type { RiskRewardPoint } from "@/lib/riskReward";

const WIDTH = 500;
const HEIGHT = 400;
const MARGIN = { left: 56, right: 24, top: 24, bottom: 58 };
const PLOT_W = WIDTH - MARGIN.left - MARGIN.right;
const PLOT_H = HEIGHT - MARGIN.top - MARGIN.bottom;

function xFromRisk(risk: number): number {
  return MARGIN.left + (risk / 100) * PLOT_W;
}

function yFromReturn(ret: number): number {
  return MARGIN.top + ((100 - ret) / 100) * PLOT_H;
}

function quadrantColor(quadrant: RiskRewardPoint["quadrant"]) {
  if (quadrant === "Star Investment") return "#10b981";
  if (quadrant === "Speculative") return "#f59e0b";
  if (quadrant === "Safe Hold") return "#3b82f6";
  return "#ef4444";
}

export function RiskRewardChart({
  points,
  showLabels,
  highlightPortfolio,
  highlightWatchlist,
}: {
  points: RiskRewardPoint[];
  showLabels: boolean;
  highlightPortfolio: boolean;
  highlightWatchlist: boolean;
}) {
  const [hovered, setHovered] = useState<RiskRewardPoint | null>(null);
  const [tooltipPos, setTooltipPos] = useState<{ x: number; y: number } | null>(null);

  const counts = useMemo(() => {
    return points.reduce(
      (acc, p) => {
        acc[p.quadrant] = (acc[p.quadrant] ?? 0) + 1;
        return acc;
      },
      {} as Record<RiskRewardPoint["quadrant"], number>,
    );
  }, [points]);

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${WIDTH} ${HEIGHT}`} className="h-auto w-full">
        <rect x={MARGIN.left} y={MARGIN.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="rgb(16 185 129 / 0.07)" />
        <rect x={MARGIN.left + PLOT_W / 2} y={MARGIN.top} width={PLOT_W / 2} height={PLOT_H / 2} fill="rgb(245 158 11 / 0.07)" />
        <rect x={MARGIN.left} y={MARGIN.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="rgb(59 130 246 / 0.07)" />
        <rect x={MARGIN.left + PLOT_W / 2} y={MARGIN.top + PLOT_H / 2} width={PLOT_W / 2} height={PLOT_H / 2} fill="rgb(239 68 68 / 0.07)" />

        <line x1={xFromRisk(50)} x2={xFromRisk(50)} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} stroke="rgb(255 255 255 / 0.2)" strokeDasharray="5 4" />
        <line x1={MARGIN.left} x2={MARGIN.left + PLOT_W} y1={yFromReturn(50)} y2={yFromReturn(50)} stroke="rgb(255 255 255 / 0.2)" strokeDasharray="5 4" />

        <line x1={MARGIN.left} x2={MARGIN.left + PLOT_W} y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H} stroke="rgb(255 255 255 / 0.35)" />
        <line x1={MARGIN.left} x2={MARGIN.left} y1={MARGIN.top} y2={MARGIN.top + PLOT_H} stroke="rgb(255 255 255 / 0.35)" />

        <text x={MARGIN.left + 6} y={MARGIN.top + 16} fill="rgb(16 185 129 / 0.9)" fontSize="10">Star Investment</text>
        <text x={MARGIN.left + PLOT_W - 86} y={MARGIN.top + 16} fill="rgb(245 158 11 / 0.9)" fontSize="10">Speculative</text>
        <text x={MARGIN.left + 6} y={MARGIN.top + PLOT_H - 6} fill="rgb(59 130 246 / 0.9)" fontSize="10">Safe Hold</text>
        <text x={MARGIN.left + PLOT_W - 34} y={MARGIN.top + PLOT_H - 6} fill="rgb(239 68 68 / 0.9)" fontSize="10">Avoid</text>

        {[0, 25, 50, 75, 100].map((n) => (
          <g key={`x-${n}`}>
            <line x1={xFromRisk(n)} x2={xFromRisk(n)} y1={MARGIN.top + PLOT_H} y2={MARGIN.top + PLOT_H + 4} stroke="rgb(255 255 255 / 0.25)" />
            <text x={xFromRisk(n)} y={MARGIN.top + PLOT_H + 16} textAnchor="middle" fill="rgb(161 161 170)" fontSize="10">
              {n}
            </text>
          </g>
        ))}
        {[0, 25, 50, 75, 100].map((n) => (
          <g key={`y-${n}`}>
            <line x1={MARGIN.left - 4} x2={MARGIN.left} y1={yFromReturn(n)} y2={yFromReturn(n)} stroke="rgb(255 255 255 / 0.25)" />
            <text x={MARGIN.left - 10} y={yFromReturn(n) + 3} textAnchor="end" fill="rgb(161 161 170)" fontSize="10">
              {n}
            </text>
          </g>
        ))}

        <text x={MARGIN.left + PLOT_W / 2} y={HEIGHT - 12} textAnchor="middle" fill="rgb(212 212 216)" fontSize="11">
          Risk Score (low → high)
        </text>
        <text x={16} y={MARGIN.top + PLOT_H / 2} transform={`rotate(-90 16 ${MARGIN.top + PLOT_H / 2})`} textAnchor="middle" fill="rgb(212 212 216)" fontSize="11">
          Return Score (low → high)
        </text>

        {points.map((p) => {
          const cx = xFromRisk(p.riskScore);
          const cy = yFromReturn(p.returnScore);
          const portfolioHl = highlightPortfolio && p.inPortfolio;
          const watchHl = highlightWatchlist && p.inWatchlist;
          const r = portfolioHl || watchHl ? 10 : 6;
          const ringStroke = portfolioHl ? "white" : watchHl ? "#f59e0b" : "transparent";
          return (
            <g key={`${p.setNumber}-${p.condition}`}>
              {showLabels && (
                <text x={cx + 8} y={cy - 8} fill="rgb(212 212 216 / 0.8)" fontSize="9">
                  {p.setNumber}
                </text>
              )}
              <circle
                cx={cx}
                cy={cy}
                r={r}
                fill={quadrantColor(p.quadrant)}
                stroke="white"
                strokeWidth={1}
                onMouseEnter={(e) => {
                  setHovered(p);
                  setTooltipPos({ x: e.clientX, y: e.clientY });
                }}
                onMouseMove={(e) => setTooltipPos({ x: e.clientX, y: e.clientY })}
                onMouseLeave={() => {
                  setHovered(null);
                  setTooltipPos(null);
                }}
              />
              {(portfolioHl || watchHl) && (
                <circle cx={cx} cy={cy} r={r + 3} fill="transparent" stroke={ringStroke} strokeWidth={2} />
              )}
            </g>
          );
        })}
      </svg>

      {hovered && tooltipPos && (
        <div
          className="pointer-events-none fixed z-50 w-64 -translate-x-1/2 rounded-xl border border-white/20 bg-[#111] p-3 shadow-xl"
          style={{ left: tooltipPos.x, top: tooltipPos.y - 20 }}
        >
          <p className="text-sm font-semibold text-white">{hovered.name}</p>
          <p className="text-xs text-zinc-400">#{hovered.setNumber} · {hovered.quadrant}</p>
          <p className="mt-2 text-xs text-zinc-300">Return {hovered.returnScore} · Risk {hovered.riskScore}</p>
          <p className="text-xs text-zinc-400">Volatility {hovered.volatilityScore} · Liquidity {hovered.liquidityScore}</p>
          <Link
            href={`/results?set=${encodeURIComponent(hovered.setNumber)}&condition=${hovered.condition}`}
            className="pointer-events-auto mt-2 inline-block text-xs font-semibold text-[#f59e0b] hover:underline"
          >
            View Analysis →
          </Link>
        </div>
      )}

      <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-zinc-500 sm:grid-cols-4">
        <span>⭐ Star: {counts["Star Investment"] ?? 0}</span>
        <span>⚡ Speculative: {counts.Speculative ?? 0}</span>
        <span>🛡 Safe Hold: {counts["Safe Hold"] ?? 0}</span>
        <span>❌ Avoid: {counts.Avoid ?? 0}</span>
      </div>
    </div>
  );
}

