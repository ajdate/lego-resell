"use client";

import { useId } from "react";

interface BrickValueLogoProps {
  variant?: "icon" | "wordmark" | "full";
  size?: number;
  className?: string;
}

export default function BrickValueLogo({
  variant = "icon",
  size = 40,
  className = "",
}: BrickValueLogoProps) {
  const uid = useId().replace(/:/g, "");
  const goldGrad = `goldGrad-${uid}`;
  const goldGrad2 = `goldGrad2-${uid}`;

  const BVMark = ({ s }: { s: number }) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={goldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFD700" />
          <stop offset="50%" stopColor="#F5C518" />
          <stop offset="100%" stopColor="#C8960C" />
        </linearGradient>
        <linearGradient id={goldGrad2} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE55C" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>

      <path
        d="M18 20 L18 80 L52 80 C64 80 72 74 72 64 C72 57 68 52 62 50 C67 48 70 43 70 37 C70 27 63 20 51 20 Z
           M30 30 L49 30 C55 30 59 33 59 38 C59 43 55 46 49 46 L30 46 Z
           M30 55 L51 55 C58 55 62 58 62 64 C62 70 58 70 51 70 L30 70 Z"
        fill={`url(#${goldGrad})`}
      />

      <path
        d="M55 46 L68 75 L80 75 L95 20 L83 20 L74 58 L63 30 Z"
        fill={`url(#${goldGrad2})`}
      />

      <path
        d="M72 18 L92 18 L92 38 L86 32 L68 50 L62 44 L80 26 Z"
        fill={`url(#${goldGrad})`}
      />

      <ellipse
        cx="35"
        cy="84"
        rx="8"
        ry="4"
        fill={`url(#${goldGrad})`}
        opacity="0.9"
      />
      <ellipse cx="35" cy="82" rx="8" ry="3.5" fill={`url(#${goldGrad2})`} />
    </svg>
  );

  const IconVariant = () => (
    <div
      className={`relative flex items-center justify-center rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
        border: "1.5px solid #C8960C",
        boxShadow:
          "0 0 12px rgba(197, 150, 12, 0.3), inset 0 1px 0 rgba(255, 215, 0, 0.1)",
      }}
    >
      <BVMark s={size * 0.75} />
    </div>
  );

  const WordmarkVariant = () => (
    <div className={`flex items-center gap-3 ${className}`}>
      <BVMark s={size} />
      <div
        style={{
          width: "1px",
          height: size * 0.8,
          background:
            "linear-gradient(to bottom, transparent, #C8960C, transparent)",
        }}
      />
      <div className="flex flex-col justify-center">
        <span
          style={{
            fontSize: size * 0.45,
            fontWeight: 800,
            letterSpacing: "0.08em",
            color: "#ffffff",
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          BRICKVALUE
        </span>
        <span
          style={{
            fontSize: size * 0.18,
            fontWeight: 400,
            letterSpacing: "0.12em",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1,
            marginTop: size * 0.06,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          INVEST SMARTER. COLLECT BETTER.
        </span>
      </div>
    </div>
  );

  const FullVariant = () => (
    <div className={`flex items-center gap-4 ${className}`}>
      <div
        className="flex items-center justify-center rounded-2xl"
        style={{
          width: size * 1.1,
          height: size * 1.1,
          background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
          border: "2px solid #C8960C",
          boxShadow:
            "0 0 20px rgba(197, 150, 12, 0.4), inset 0 1px 0 rgba(255, 215, 0, 0.15)",
        }}
      >
        <BVMark s={size * 0.85} />
      </div>
      <div
        style={{
          width: "1px",
          height: size,
          background:
            "linear-gradient(to bottom, transparent, #C8960C, transparent)",
        }}
      />
      <div className="flex flex-col justify-center">
        <span
          style={{
            fontSize: size * 0.5,
            fontWeight: 800,
            letterSpacing: "0.1em",
            color: "#ffffff",
            lineHeight: 1,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          BRICKVALUE
        </span>
        <span
          style={{
            fontSize: size * 0.2,
            fontWeight: 400,
            letterSpacing: "0.15em",
            color: "rgba(255,255,255,0.5)",
            lineHeight: 1,
            marginTop: size * 0.08,
            fontFamily: "system-ui, sans-serif",
          }}
        >
          INVEST SMARTER. COLLECT BETTER.
        </span>
      </div>
    </div>
  );

  if (variant === "wordmark") return <WordmarkVariant />;
  if (variant === "full") return <FullVariant />;
  return <IconVariant />;
}
