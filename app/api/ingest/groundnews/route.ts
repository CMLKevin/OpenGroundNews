import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import { NextResponse } from "next/server";
import { isAuthorizedApiRequest, sanitizeServerErrorMessage } from "@/lib/security";

const execFileAsync = promisify(execFile);

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = isAuthorizedApiRequest(request);
  if (!auth.ok) {
    return NextResponse.json({ ok: false, error: auth.reason }, { status: auth.status });
  }

  const scriptPath = path.join(process.cwd(), "scripts", "sync_groundnews_pipeline.mjs");

  try {
    const { stdout } = await execFileAsync("node", [scriptPath], {
      cwd: process.cwd(),
      env: process.env,
      timeout: 900000,
      maxBuffer: 1024 * 1024 * 4,
    });

    const summary = JSON.parse(stdout);
    return NextResponse.json({ ok: true, summary });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: sanitizeServerErrorMessage(error),
      },
      { status: 500 },
    );
  }
}
