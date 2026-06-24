import { SignupForm } from "@/app/components/signup-form";

export default function Home() {
  return (
    <div className="flex flex-1 items-center justify-center bg-zinc-50 px-6 py-16 dark:bg-black">
      <main className="w-full max-w-lg rounded-3xl border border-zinc-200 bg-white p-8 shadow-sm dark:border-zinc-800 dark:bg-zinc-950">
        <div className="mb-8 flex flex-col gap-3 text-center">
          <p className="text-sm font-medium uppercase tracking-wide text-zinc-500">
            Vercel Workflow
          </p>
          <h1 className="text-3xl font-semibold tracking-tight text-zinc-950 dark:text-zinc-50">
            User signup demo
          </h1>
          <p className="text-sm leading-6 text-zinc-600 dark:text-zinc-400">
            Start a durable signup workflow and watch each step complete in
            real time.
          </p>
        </div>
        <SignupForm />
      </main>
    </div>
  );
}
