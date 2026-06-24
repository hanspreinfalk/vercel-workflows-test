import { Sandbox } from "@vercel/sandbox";

const MAX_CODE_LENGTH = 10_000;
const SANDBOX_TIMEOUT_MS = 60_000;

export type SandboxRunResult = {
  sandboxId: string;
  exitCode: number;
  stdout: string;
  stderr: string;
  durationMs: number;
};

export class SandboxConfigError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "SandboxConfigError";
  }
}

export function validateSandboxCode(code: unknown): string {
  if (typeof code !== "string" || !code.trim()) {
    throw new Error("Code is required");
  }

  if (code.length > MAX_CODE_LENGTH) {
    throw new Error(`Code must be ${MAX_CODE_LENGTH} characters or fewer`);
  }

  return code;
}

export async function runJavaScriptInSandbox(
  code: string
): Promise<SandboxRunResult> {
  const startedAt = Date.now();
  let sandbox: Sandbox | null = null;

  try {
    sandbox = await Sandbox.create({
      runtime: "node24",
      networkPolicy: "deny-all",
      persistent: false,
      timeout: SANDBOX_TIMEOUT_MS,
      tags: { demo: "sandbox-playground" },
    });

    await sandbox.writeFiles([
      {
        path: "script.js",
        content: Buffer.from(code, "utf-8"),
      },
    ]);

    const result = await sandbox.runCommand("node", ["script.js"]);
    const stdout = await result.stdout();
    const stderr = await result.stderr();

    return {
      sandboxId: sandbox.name,
      exitCode: result.exitCode ?? 1,
      stdout,
      stderr,
      durationMs: Date.now() - startedAt,
    };
  } catch (error) {
    if (
      error instanceof Error &&
      (error.name === "LocalOidcContextError" ||
        error.name === "VercelOidcContextError" ||
        error.message.includes("Could not get credentials"))
    ) {
      throw new SandboxConfigError(
        "Sandbox credentials are missing. Run `vercel link` and `vercel env pull`, then restart the dev server."
      );
    }

    throw error;
  } finally {
    if (sandbox) {
      try {
        await sandbox.stop();
      } catch {
        // Sandbox may already be stopped after a failed command.
      }
    }
  }
}
