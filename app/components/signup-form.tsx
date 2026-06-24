"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

export function SignupForm() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = (await response.json()) as {
        runId?: string;
        error?: string;
      };

      if (!response.ok || !data.runId) {
        throw new Error(data.error ?? "Failed to start signup workflow");
      }

      router.push(`/workflows/${data.runId}`);
    } catch (submitError) {
      setError(
        submitError instanceof Error
          ? submitError.message
          : "Something went wrong"
      );
      setIsSubmitting(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="flex w-full flex-col gap-4">
      <label className="flex flex-col gap-2 text-left">
        <span className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Email address
        </span>
        <input
          type="email"
          required
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          placeholder="you@example.com"
          className="h-12 rounded-xl border border-zinc-200 bg-white px-4 text-zinc-950 outline-none ring-blue-500 transition focus:ring-2 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-50"
        />
      </label>

      <button
        type="submit"
        disabled={isSubmitting}
        className="flex h-12 items-center justify-center rounded-xl bg-zinc-950 px-5 font-medium text-white transition hover:bg-zinc-800 disabled:cursor-not-allowed disabled:opacity-60 dark:bg-zinc-100 dark:text-zinc-950 dark:hover:bg-zinc-300"
      >
        {isSubmitting ? "Starting workflow…" : "Start signup workflow"}
      </button>

      {error ? (
        <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
      ) : null}
    </form>
  );
}
