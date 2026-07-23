"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrowserMultiFormatReader } from "@zxing/library";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream: MediaStream | null = null;
    let codeReader: BrowserMultiFormatReader | null = null;
    let active = true;

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported");
        }

        const { BrowserMultiFormatReader } = await import("@zxing/library");
        codeReader = new BrowserMultiFormatReader();

        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });

        const video = videoRef.current;
        if (!video || !active) return;

        video.srcObject = stream;
        await video.play();
        setScanning(true);

        const scanFrame = async () => {
          if (!active || !videoRef.current || !codeReader) return;

          try {
            const result = await codeReader.decodeOnceFromVideoElement(
              videoRef.current,
            );
            if (result && active) {
              active = false;
              const barcode = result.getText();
              codeReader.reset();
              stream?.getTracks().forEach((track) => track.stop());
              router.push(`/?q=${encodeURIComponent(barcode)}`);
              return;
            }
          } catch {
            // No barcode in this frame — keep scanning.
          }

          if (active) {
            requestAnimationFrame(() => {
              void scanFrame();
            });
          }
        };

        void scanFrame();
      } catch {
        if (!active) return;
        setError(
          "Could not access camera. Please allow camera access in Settings.",
        );
        setScanning(false);
      }
    }

    void startCamera();

    return () => {
      active = false;
      codeReader?.reset();
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [router]);

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col pb-24">
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className={`w-full h-full object-cover ${scanning ? "block" : "hidden"}`}
          style={{ minHeight: "60vh" }}
          playsInline
          muted
        />

        {scanning && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-64 h-40 border-2 border-amber-400 rounded-xl relative">
              <div className="absolute inset-x-0 top-1/2 h-0.5 bg-amber-400/60 animate-pulse" />
              <div className="absolute -top-1 -left-1 w-6 h-6 border-t-2 border-l-2 border-amber-400 rounded-tl" />
              <div className="absolute -top-1 -right-1 w-6 h-6 border-t-2 border-r-2 border-amber-400 rounded-tr" />
              <div className="absolute -bottom-1 -left-1 w-6 h-6 border-b-2 border-l-2 border-amber-400 rounded-bl" />
              <div className="absolute -bottom-1 -right-1 w-6 h-6 border-b-2 border-r-2 border-amber-400 rounded-br" />
            </div>
          </div>
        )}

        {!scanning && !error && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-white/40 text-sm">Starting camera...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center min-h-[60vh] px-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📷</div>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-amber-500 text-black font-bold rounded-xl px-6 py-3 text-sm"
              >
                Search Manually
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="px-4 py-6 bg-[#0a0a0a]">
        <h1 className="text-lg font-bold text-white mb-1">
          Scan LEGO Set Barcode
        </h1>
        <p className="text-white/40 text-sm mb-4">
          Point camera at barcode on any LEGO set box
        </p>
        <button
          type="button"
          onClick={() => router.push("/")}
          style={{ touchAction: "manipulation" }}
          className="w-full bg-white/5 border border-white/10 text-white/60 font-medium rounded-xl py-3 text-sm"
        >
          Search Manually Instead
        </button>
      </div>
    </div>
  );
}
