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

  const BVMark = ({ s }: { s: number }) => (
    <svg
      width={s}
      height={s}
      viewBox="0 0 95 90"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <defs>
        <linearGradient id={goldGrad} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#FFE066" />
          <stop offset="50%" stopColor="#F5C518" />
          <stop offset="100%" stopColor="#B8860B" />
        </linearGradient>
      </defs>

      <path
        d="M15 15 L15 85 L50 85 
       C62 85 70 79 70 68 
       C70 61 66 56 59 53 
       C65 50 68 45 68 38 
       C68 26 60 15 47 15 Z
       M27 25 L45 25 C51 25 56 29 56 36 
       C56 43 51 46 45 46 L27 46 Z
       M27 56 L48 56 C55 56 59 60 59 67 
       C59 74 54 75 48 75 L27 75 Z"
        fill={`url(#${goldGrad})`}
      />

      <path
        d="M58 15 L72 58 L86 15 L96 15 L76 85 L68 85 L48 15 Z"
        fill={`url(#${goldGrad})`}
      />

      <path
        d="M74 10 L94 10 L94 30 L88 24 L66 46 L60 40 L82 18 Z"
        fill={`url(#${goldGrad})`}
      />

    </svg>
  );

  const IconVariant = () => (
    <div
      className={`relative flex items-center justify-center rounded-2xl ${className}`}
      style={{
        width: size,
        height: size,
        background: "linear-gradient(145deg, #1a1a1a, #0a0a0a)",
        border: "2px solid #C8960C",
        boxShadow:
          "0 0 16px rgba(245, 197, 24, 0.4), inset 0 1px 0 rgba(255, 215, 0, 0.15)",
      }}
    >
      <BVMark s={size * 0.82} />
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
