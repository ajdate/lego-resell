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

  useEffect(() => {
    setEmail(user?.emailAddresses[0]?.emailAddress || "");
  }, [user]);

  async function handleSubmit() {
    if (!message.trim() || loading) return;

    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#0a0a0a] px-4 pb-24">
        <div className="max-w-sm text-center">
          <div className="mb-4 text-5xl">🎉</div>
          <h2 className="mb-2 text-xl font-bold text-white">Thanks!</h2>
          <p className="text-sm text-white/50">
            Every message is read by the founder. Your feedback genuinely helps
            shape BrickValue.
          </p>
          <button
            type="button"
            onClick={() => router.back()}
            className="mt-6 text-sm text-amber-400"
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
