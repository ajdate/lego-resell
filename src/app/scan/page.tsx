"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function ScanPage() {
  const router = useRouter();
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  async function startScan() {
    try {
      setScanning(true);
      setError("");

      const { Camera, CameraResultType, CameraSource } = await import(
        "@capacitor/camera"
      );

      const photo = await Camera.getPhoto({
        quality: 90,
        allowEditing: false,
        resultType: CameraResultType.DataUrl,
        source: CameraSource.Camera,
        promptLabelHeader: "Scan LEGO Set Barcode",
        promptLabelPhoto: "Choose from Library",
        promptLabelPicture: "Take Photo of Barcode",
      });

      if (photo.dataUrl) {
        const { BrowserMultiFormatReader } = await import("@zxing/library");
        const reader = new BrowserMultiFormatReader();

        const img = new Image();
        img.src = photo.dataUrl;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
        });

        try {
          const decoded = await reader.decodeFromImageElement(img);
          const barcode = decoded.getText();
          setResult(barcode);
          router.push(`/?q=${encodeURIComponent(barcode)}`);
        } catch {
          setError("Could not read barcode. Try again with better lighting.");
        }
      }
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "";
      if (message.includes("cancelled")) {
        setError("");
      } else {
        setError("Could not access camera. Please check permissions.");
      }
    } finally {
      setScanning(false);
    }
  }

  return (
    <div className="min-h-[100dvh] bg-[#0a0a0a] flex flex-col items-center justify-center px-4 pb-24">
      <div className="text-center max-w-sm w-full">
        <div className="w-24 h-24 bg-amber-500/10 border-2 border-amber-500/30 rounded-3xl flex items-center justify-center mx-auto mb-6">
          <svg
            width="48"
            height="48"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="1.5"
          >
            <path d="M3 7V5a2 2 0 0 1 2-2h2M17 3h2a2 2 0 0 1 2 2v2M21 17v2a2 2 0 0 1-2 2h-2M7 21H5a2 2 0 0 1-2-2v-2" />
            <rect x="7" y="7" width="3" height="10" rx="0.5" />
            <rect x="11" y="7" width="1.5" height="10" rx="0.5" />
            <rect x="14" y="7" width="3" height="10" rx="0.5" />
          </svg>
        </div>

        <h1 className="text-2xl font-bold text-white mb-2">Scan a LEGO Set</h1>
        <p className="text-white/50 text-sm mb-8 leading-relaxed">
          Point your camera at the barcode on any LEGO set box to instantly get
          its market value and SELL/HOLD recommendation.
        </p>

        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-xl p-3 mb-4">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}

        {result && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 mb-4">
            <p className="text-amber-400 text-sm">Barcode: {result}</p>
          </div>
        )}

        <button
          onClick={() => void startScan()}
          disabled={scanning}
          style={{ touchAction: "manipulation" }}
          className="w-full bg-amber-500 text-black font-bold rounded-xl py-4 text-base mb-4 disabled:opacity-50"
        >
          {scanning ? "Processing..." : "📷 Scan Barcode"}
        </button>

        <button
          onClick={() => router.push("/")}
          style={{ touchAction: "manipulation" }}
          className="w-full bg-white/5 border border-white/10 text-white/60 font-medium rounded-xl py-3 text-sm"
        >
          Search Manually Instead
        </button>

        <p className="text-white/20 text-xs mt-6">
          Supports EAN-13 and UPC-A barcodes
        </p>
      </div>
    </div>
  );
}
