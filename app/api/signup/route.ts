import { start } from "workflow/api";
import { handleUserSignup } from "@/workflows/user-signup";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  const { email } = await request.json();

  if (!email || typeof email !== "string") {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const run = await start(handleUserSignup, [email]);

  return NextResponse.json({
    message: "User signup workflow started",
    runId: run.runId,
  });
}
