"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";

export default function FeedbackPage() {
  const { user } = useUser();
  const router = useRouter();
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [type, setType] = useState<"feedback" | "bug">("feedback");
  const [submitted, setSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    setEmail(user?.emailAddresses[0]?.emailAddress || "");
  }, [user]);

  async function handleSubmit() {
    if (!message.trim() || loading) return;

    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message, email, type }),
      });

      if (!response.ok) {
        throw new Error("Failed to send feedback");
      }

      setSubmitted(true);
    } catch {
      setError("Could not send feedback. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-[100dvh] flex-col items-center justify-center bg-[#0a0a0a] px-4 pb-24">
        <div
          className="w-full max-w-sm rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-6 py-10 text-center"
          role="status"
          aria-live="polite"
        >
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 text-3xl text-emerald-400">
            ✓
          </div>
          <h2 className="text-xl font-bold text-white">
            Thank you! Your feedback has been sent.
          </h2>
          <p className="mt-3 text-sm leading-relaxed text-white/60">
            Every message is read by the founder. Your feedback genuinely helps
            shape BrickValue.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-8 w-full rounded-xl border border-white/10 bg-white/5 py-3 text-sm font-medium text-white/80 transition hover:border-amber-500/40 hover:text-white"
          >
            ← Go back
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
        >
          ← Back
        </button>
        <h1 className="mb-1 text-2xl font-bold text-white">Send Feedback</h1>
        <p className="mb-6 text-sm text-white/40">
          Every message goes directly to AJ, the founder.
        </p>

        <div className="mb-4 flex gap-2">
          <button
            type="button"
            onClick={() => setType("feedback")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              type === "feedback"
                ? "bg-amber-500 text-black"
                : "bg-white/5 text-white/60"
            }`}
          >
            💬 Feedback
          </button>
          <button
            type="button"
            onClick={() => setType("bug")}
            className={`flex-1 rounded-lg py-2 text-sm font-medium ${
              type === "bug"
                ? "bg-red-500 text-white"
                : "bg-white/5 text-white/60"
            }`}
          >
            🐞 Report Bug
          </button>
        </div>

        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={
            type === "bug"
              ? "Describe the bug and how to reproduce it..."
              : "How can we improve BrickValue?"
          }
          className="mb-4 h-32 w-full resize-none rounded-xl border border-white/10 bg-white/5 p-4 text-sm text-white placeholder-white/30"
        />

        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email address (optional)"
          className="mb-4 w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white placeholder-white/30"
        />

        {error && (
          <p className="mb-4 text-sm text-red-400" role="alert">
            {error}
          </p>
        )}

        <button
          type="button"
          onClick={() => void handleSubmit()}
          disabled={!message.trim() || loading}
          className="w-full rounded-xl bg-amber-500 py-3 text-sm font-bold text-black disabled:opacity-50"
        >
          {loading ? "Sending..." : "Send"}
        </button>
      </div>
    </div>
  );
}
