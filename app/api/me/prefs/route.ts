import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { getUserBySessionToken } from "@/lib/authStore";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  const prefs = await db.userPrefs.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return NextResponse.json({
    ok: true,
    prefs: {
      edition: prefs.edition,
      localLabel: prefs.localLabel,
      localLat: prefs.localLat,
      localLon: prefs.localLon,
      theme: prefs.theme,
      notifyDailyBriefing: prefs.notifyDailyBriefing,
      notifyBlindspot: prefs.notifyBlindspot,
      notifyFollowed: prefs.notifyFollowed,
      updatedAt: prefs.updatedAt.toISOString(),
    },
  });
}

export async function POST(request: NextRequest) {
  const token = request.cookies.get("ogn_session")?.value || "";
  const user = token ? await getUserBySessionToken(token) : null;
  if (!user) return NextResponse.json({ ok: false, error: "Unauthorized" }, { status: 401 });

  try {
    const body = (await request.json()) as {
      edition?: string;
      localLabel?: string;
      localLat?: number;
      localLon?: number;
      theme?: "light" | "dark" | "auto";
      notifyDailyBriefing?: boolean;
      notifyBlindspot?: boolean;
      notifyFollowed?: boolean;
    };

    const edition = body.edition ? String(body.edition).trim().slice(0, 60) : undefined;
    const localLabel = body.localLabel ? String(body.localLabel).trim().slice(0, 120) : undefined;

    const localLat = body.localLat != null && Number.isFinite(Number(body.localLat)) ? Number(body.localLat) : undefined;
    const localLon = body.localLon != null && Number.isFinite(Number(body.localLon)) ? Number(body.localLon) : undefined;

    const theme = body.theme === "light" || body.theme === "dark" || body.theme === "auto" ? body.theme : undefined;

    const notifyDailyBriefing = typeof body.notifyDailyBriefing === "boolean" ? body.notifyDailyBriefing : undefined;
    const notifyBlindspot = typeof body.notifyBlindspot === "boolean" ? body.notifyBlindspot : undefined;
    const notifyFollowed = typeof body.notifyFollowed === "boolean" ? body.notifyFollowed : undefined;

    const prefs = await db.userPrefs.upsert({
      where: { userId: user.id },
      update: {
        ...(edition != null ? { edition } : {}),
        ...(localLabel != null ? { localLabel } : {}),
        ...(localLat != null ? { localLat } : {}),
        ...(localLon != null ? { localLon } : {}),
        ...(theme != null ? { theme } : {}),
        ...(notifyDailyBriefing != null ? { notifyDailyBriefing } : {}),
        ...(notifyBlindspot != null ? { notifyBlindspot } : {}),
        ...(notifyFollowed != null ? { notifyFollowed } : {}),
      },
      create: {
        userId: user.id,
        edition: edition ?? "International",
        localLabel: localLabel ?? null,
        localLat: localLat ?? null,
        localLon: localLon ?? null,
        theme: theme ?? "dark",
        notifyDailyBriefing: notifyDailyBriefing ?? false,
        notifyBlindspot: notifyBlindspot ?? false,
        notifyFollowed: notifyFollowed ?? false,
      },
    });

    return NextResponse.json({
      ok: true,
      prefs: {
        edition: prefs.edition,
        localLabel: prefs.localLabel,
        localLat: prefs.localLat,
        localLon: prefs.localLon,
        theme: prefs.theme,
        notifyDailyBriefing: prefs.notifyDailyBriefing,
        notifyBlindspot: prefs.notifyBlindspot,
        notifyFollowed: prefs.notifyFollowed,
        updatedAt: prefs.updatedAt.toISOString(),
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed";
    return NextResponse.json({ ok: false, error: message }, { status: 400 });
  }
}
