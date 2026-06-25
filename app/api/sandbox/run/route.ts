import { NextResponse } from "next/server";
import {
  runJavaScriptInSandbox,
  SandboxConfigError,
  validateSandboxCode,
} from "@/lib/sandbox/run-playground";

export const runtime = "nodejs";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { code?: unknown };
    const code = validateSandboxCode(body.code);
    const result = await runJavaScriptInSandbox(code);

    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof SandboxConfigError) {
      return NextResponse.json({ error: error.message }, { status: 503 });
    }

    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: "Failed to run code in sandbox" },
      { status: 500 }
    );
  }
}
