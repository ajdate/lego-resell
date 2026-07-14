"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useClerk, useUser } from "@clerk/nextjs";

export default function DeleteAccountPage() {
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();
  const [confirming, setConfirming] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  async function handleDelete() {
    if (!user || deleting) return;

    setDeleting(true);
    setError("");

    try {
      await user.delete();
      await signOut({ redirectUrl: "/" });
    } catch {
      setError(
        "Could not delete your account. Please try again or email support@brickvalue.app.",
      );
      setDeleting(false);
      setConfirming(false);
    }
  }

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] text-zinc-500">
        Loading…
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 pb-24">
        <div className="w-full max-w-sm text-center">
          <h1 className="mb-3 text-2xl font-bold text-white">Sign in required</h1>
          <p className="mb-6 text-sm text-white/50">
            You need to be signed in to delete your BrickValue account.
          </p>
          <button
            type="button"
            onClick={() => router.push("/sign-in")}
            style={{ touchAction: "manipulation" }}
            className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] px-4 py-8 pb-24">
      <div className="mx-auto max-w-md">
        <button
          type="button"
          onClick={() => router.back()}
          className="mb-6 block text-sm text-amber-400"
          style={{ touchAction: "manipulation" }}
        >
          ← Back
        </button>

        <h1 className="mb-2 text-2xl font-bold text-white">Delete Account</h1>
        <p className="mb-6 text-sm leading-relaxed text-white/50">
          Permanently delete your BrickValue account and associated cloud data.
          This action cannot be undone.
        </p>

        <div className="mb-6 rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="mb-3 text-sm font-semibold text-red-300">
            What will be deleted
          </p>
          <ul className="space-y-2 text-sm text-red-200/80">
            <li>• Your BrickValue account and login</li>
            <li>• Synced portfolio and watchlist data in the cloud</li>
            <li>• Account preferences and profile information</li>
          </ul>
          <p className="mt-4 text-xs text-white/40">
            Local data saved on this device may remain until you clear browser
            storage. Email{" "}
            <a
              href="mailto:support@brickvalue.app"
              className="text-amber-400 hover:underline"
            >
              support@brickvalue.app
            </a>{" "}
            if you need help.
          </p>
        </div>

        {error && (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        {!confirming ? (
          <button
            type="button"
            onClick={() => setConfirming(true)}
            disabled={deleting}
            style={{ touchAction: "manipulation" }}
            className="w-full rounded-xl border border-red-500/50 bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
          >
            Delete My Account
          </button>
        ) : (
          <div className="space-y-3 rounded-2xl border border-red-500/40 bg-[#111] p-5">
            <p className="text-sm font-semibold text-white">
              Are you absolutely sure?
            </p>
            <p className="text-sm text-white/50">
              This permanently deletes your account. You will be signed out
              immediately.
            </p>
            <button
              type="button"
              onClick={() => void handleDelete()}
              disabled={deleting}
              style={{ touchAction: "manipulation" }}
              className="w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white transition hover:bg-red-500 disabled:opacity-50"
            >
              {deleting ? "Deleting…" : "Yes, permanently delete my account"}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={deleting}
              style={{ touchAction: "manipulation" }}
              className="w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        )}

        <p className="mt-6 text-center text-xs text-white/30">
          Prefer help first?{" "}
          <Link href="/support" className="text-amber-400 hover:underline">
            Contact support
          </Link>
        </p>
      </div>
    </div>
  );
}
