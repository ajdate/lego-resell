"use client";

import { useId, useMemo, useState } from "react";
import { RADAR_METRIC_DEFS } from "@/lib/radar-metrics";

const CX = 200;
const CY = 200;
const MAX_R = 150;
const LABEL_R = 165;
const RING_RADII = [30, 60, 90, 120, 150];
const RING_LABELS = [20, 40, 60, 80, 100];
const AXIS_COUNT = 8;
const DEG_STEP = 360 / AXIS_COUNT;

function polarToCartesian(
  centerX: number,
  centerY: number,
  radius: number,
  index: number,
): { x: number; y: number } {
  const angleDeg = index * DEG_STEP - 90;
  const angleRad = (angleDeg * Math.PI) / 180;
  return {
    x: centerX + radius * Math.cos(angleRad),
    y: centerY + radius * Math.sin(angleRad),
  };
}

function polygonPoints(
  metrics: Record<string, number>,
  keys: string[],
): string {
  return keys
    .map((key, i) => {
      const score = Math.min(100, Math.max(0, metrics[key] ?? 0));
      const r = (score / 100) * MAX_R;
      const { x, y } = polarToCartesian(CX, CY, r, i);
      return `${x},${y}`;
    })
    .join(" ");
}

export interface RadarChartProps {
  setA: { name: string; metrics: Record<string, number> };
  setB: { name: string; metrics: Record<string, number> };
  size?: number;
}

type HoverState = {
  axisIndex: number;
  side: "a" | "b";
} | null;

export function RadarChart({ setA, setB, size }: RadarChartProps) {
  const keys = useMemo(
    () => RADAR_METRIC_DEFS.map((d) => d.key),
    [],
  );
  const [hover, setHover] = useState<HoverState>(null);
  const gradientA = useId();
  const gradientB = useId();

  const pointsA = polygonPoints(setA.metrics, keys);
  const pointsB = polygonPoints(setB.metrics, keys);

  const wrapperClass = size
    ? "mx-auto w-full"
    : "mx-auto w-full max-w-lg";

  const tooltip =
    hover !== null
      ? (() => {
          const def = RADAR_METRIC_DEFS[hover.axisIndex];
          const score =
            hover.side === "a"
              ? setA.metrics[def.key]
              : setB.metrics[def.key];
          const setName = hover.side === "a" ? setA.name : setB.name;
          return { def, score, setName };
        })()
      : null;

  return (
    <div className={wrapperClass}>
      <div className="relative aspect-square w-full">
        <svg
          viewBox="0 0 400 400"
          className="h-full w-full"
          role="img"
          aria-label={`Radar comparison: ${setA.name} vs ${setB.name}`}
        >
          <defs>
            <linearGradient id={gradientA} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.1" />
            </linearGradient>
            <linearGradient id={gradientB} x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.35" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.1" />
            </linearGradient>
          </defs>

          {RING_RADII.map((r) => (
            <polygon
              key={`ring-${r}`}
              points={keys
                .map((_, i) => {
                  const { x, y } = polarToCartesian(CX, CY, r, i);
                  return `${x},${y}`;
                })
                .join(" ")}
              fill="none"
              stroke="rgb(255 255 255 / 0.1)"
              strokeWidth={1}
            />
          ))}

          {keys.map((_, i) => {
            const end = polarToCartesian(CX, CY, MAX_R, i);
            const highlighted = hover?.axisIndex === i;
            return (
              <line
                key={`axis-${i}`}
                x1={CX}
                y1={CY}
                x2={end.x}
                y2={end.y}
                stroke={
                  highlighted
                    ? "rgb(255 255 255 / 0.35)"
                    : "rgb(255 255 255 / 0.15)"
                }
                strokeWidth={highlighted ? 1.5 : 1}
              />
            );
          })}

          {RING_LABELS.map((label, i) => {
            const { x, y } = polarToCartesian(CX, CY, RING_RADII[i], 2);
            return (
              <text
                key={`ring-label-${label}`}
                x={x + 6}
                y={y}
                fill="rgb(161 161 170)"
                fontSize={9}
                textAnchor="start"
                dominantBaseline="middle"
              >
                {label}
              </text>
            );
          })}

          {RADAR_METRIC_DEFS.map((def, i) => {
            const { x, y } = polarToCartesian(CX, CY, LABEL_R, i);
            return (
              <text
                key={def.key}
                x={x}
                y={y}
                fill={
                  hover?.axisIndex === i
                    ? "rgb(255 255 255 / 0.95)"
                    : "rgb(255 255 255 / 0.7)"
                }
                fontSize={11}
                fontWeight={hover?.axisIndex === i ? 600 : 400}
                textAnchor="middle"
                dominantBaseline="middle"
              >
                {def.shortLabel}
              </text>
            );
          })}

          <polygon
            points={pointsB}
            fill={`url(#${gradientB})`}
            stroke="#3b82f6"
            strokeWidth={2}
            strokeLinejoin="round"
            opacity={0.9}
          />
          <polygon
            points={pointsA}
            fill={`url(#${gradientA})`}
            stroke="#f59e0b"
            strokeWidth={2}
            strokeLinejoin="round"
            opacity={0.9}
          />

          {keys.map((key, i) => {
            const scoreB = Math.min(
              100,
              Math.max(0, setB.metrics[key] ?? 0),
            );
            const rB = (scoreB / 100) * MAX_R;
            const ptB = polarToCartesian(CX, CY, rB, i);
            const scoreA = Math.min(
              100,
              Math.max(0, setA.metrics[key] ?? 0),
            );
            const rA = (scoreA / 100) * MAX_R;
            const ptA = polarToCartesian(CX, CY, rA, i);

            return (
              <g key={`points-${key}`}>
                <circle
                  cx={ptB.x}
                  cy={ptB.y}
                  r={6}
                  fill="#3b82f6"
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHover({ axisIndex: i, side: "b" })
                  }
                  onMouseLeave={() => setHover(null)}
                />
                <circle
                  cx={ptA.x}
                  cy={ptA.y}
                  r={6}
                  fill="#f59e0b"
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHover({ axisIndex: i, side: "a" })
                  }
                  onMouseLeave={() => setHover(null)}
                />
              </g>
            );
          })}

          <circle cx={CX} cy={CY} r={3} fill="rgb(255 255 255 / 0.4)" />
        </svg>

        {tooltip && (
          <div
            className="pointer-events-none absolute left-1/2 top-4 z-10 -translate-x-1/2 rounded-lg border border-white/10 bg-zinc-900/95 px-3 py-2 text-center text-xs shadow-xl"
            role="status"
          >
            <p className="font-semibold text-white">{tooltip.def.fullName}</p>
            <p className="mt-0.5 text-zinc-400">{tooltip.setName}</p>
            <p className="mt-1 text-lg font-bold tabular-nums text-white">
              {tooltip.score}/100
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-sm">
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm bg-amber-500"
            aria-hidden
          />
          <span className="text-zinc-300">{setA.name}</span>
        </div>
        <div className="flex items-center gap-2">
          <span
            className="h-3 w-3 rounded-sm bg-blue-500"
            aria-hidden
          />
          <span className="text-zinc-300">{setB.name}</span>
        </div>
      </div>
    </div>
  );
}
