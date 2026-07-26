"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import type { BrowserMultiFormatReader } from "@zxing/browser";
import type { IScannerControls } from "@zxing/browser";
import { hapticSuccess } from "@/lib/haptics";

const CAMERA_PERMISSION_KEY = "camera-permission";

export default function ScanPage() {
  const router = useRouter();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [scanning, setScanning] = useState(false);
  const [error, setError] = useState("");
  const [requestingPermission, setRequestingPermission] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(
    () =>
      typeof window !== "undefined" &&
      localStorage.getItem(CAMERA_PERMISSION_KEY) === "granted",
  );

  const grantCameraAccess = useCallback(async () => {
    setError("");
    setRequestingPermission(true);

    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        throw new Error("Camera not supported");
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment",
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
      });

      stream.getTracks().forEach((track) => track.stop());
      localStorage.setItem(CAMERA_PERMISSION_KEY, "granted");
      setPermissionGranted(true);
    } catch {
      setError(
        "Could not access camera. Please allow camera access in Settings.",
      );
    } finally {
      setRequestingPermission(false);
    }
  }, []);

  useEffect(() => {
    if (!permissionGranted) return;

    let codeReader: BrowserMultiFormatReader | null = null;
    let controls: IScannerControls | null = null;
    let active = true;

    async function handleBarcode(barcode: string, video: HTMLVideoElement) {
      if (!active) return;

      active = false;
      const stream = video.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
      controls?.stop();
      void hapticSuccess();

      try {
        const response = await fetch(
          `/api/barcode?code=${encodeURIComponent(barcode)}`,
        );
        const data = (await response.json()) as {
          found?: boolean;
          setNumber?: string;
        };

        if (data.found && data.setNumber) {
          router.push(`/results?set=${encodeURIComponent(data.setNumber)}`);
        } else {
          router.push(`/?q=${encodeURIComponent(barcode)}`);
        }
      } catch {
        router.push(`/?q=${encodeURIComponent(barcode)}`);
      }
    }

    async function startCamera() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) {
          throw new Error("Camera not supported");
        }

        const primeStream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "environment",
            width: { ideal: 1280 },
            height: { ideal: 720 },
          },
        });
        primeStream.getTracks().forEach((track) => track.stop());

        const { BrowserMultiFormatReader } = await import("@zxing/browser");
        codeReader = new BrowserMultiFormatReader();

        const video = videoRef.current;
        if (!video || !active) return;

        controls = await codeReader.decodeFromVideoDevice(
          undefined,
          video,
          (result) => {
            if (!active || !result) return;
            void handleBarcode(result.getText(), video);
          },
        );

        setScanning(true);
      } catch {
        if (!active) return;
        localStorage.removeItem(CAMERA_PERMISSION_KEY);
        setPermissionGranted(false);
        setError(
          "Could not access camera. Please allow camera access in Settings.",
        );
        setScanning(false);
      }
    }

    void startCamera();

    return () => {
      active = false;
      controls?.stop();
      const stream = videoRef.current?.srcObject as MediaStream | null;
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [permissionGranted, router]);

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

        {!permissionGranted && !error && (
          <div className="flex min-h-[60vh] flex-col items-center justify-center px-8">
            <div className="max-w-sm text-center">
              <div className="mb-4 text-5xl">📷</div>
              <h2 className="mb-2 text-lg font-bold text-white">
                Camera access needed
              </h2>
              <p className="mb-6 text-sm text-white/50">
                Allow camera access once to scan LEGO set barcodes. We&apos;ll
                remember your choice for next time.
              </p>
              <button
                type="button"
                onClick={() => void grantCameraAccess()}
                disabled={requestingPermission}
                style={{ touchAction: "manipulation" }}
                className="w-full rounded-xl bg-amber-500 py-4 text-sm font-bold text-black disabled:opacity-50"
              >
                {requestingPermission ? "Requesting access..." : "Allow Camera Access"}
              </button>
            </div>
          </div>
        )}

        {permissionGranted && !scanning && !error && (
          <div className="flex items-center justify-center min-h-[60vh]">
            <div className="text-white/40 text-sm">Starting camera...</div>
          </div>
        )}

        {error && (
          <div className="flex items-center justify-center min-h-[60vh] px-8">
            <div className="text-center">
              <div className="text-4xl mb-4">📷</div>
              <p className="text-red-400 text-sm mb-4">{error}</p>
              {!permissionGranted && (
                <button
                  type="button"
                  onClick={() => void grantCameraAccess()}
                  disabled={requestingPermission}
                  className="mb-3 w-full rounded-xl bg-amber-500 px-6 py-3 text-sm font-bold text-black disabled:opacity-50"
                >
                  Try Again
                </button>
              )}
              <button
                type="button"
                onClick={() => router.push("/")}
                className="bg-white/5 border border-white/10 text-white/60 font-medium rounded-xl px-6 py-3 text-sm"
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
