import crypto from "node:crypto";
import { cookies } from "next/headers";
import { db } from "@/lib/db";

const SESSION_COOKIE = "ogn_session";

export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
};

function normalizeEmail(value: string) {
  return (value || "").trim().toLowerCase();
}

function adminEmailsFromEnv(): Set<string> {
  const raw = process.env.OGN_ADMIN_EMAILS || process.env.OGN_ADMIN_EMAIL || "";
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter(Boolean),
  );
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
}

function sha256Hex(value: string): string {
  return crypto.createHash("sha256").update(String(value || ""), "utf8").digest("hex");
}

async function scryptHash(password: string, saltHex: string): Promise<string> {
  const salt = Buffer.from(saltHex, "hex");
  const derived = await new Promise<Buffer>((resolve, reject) => {
    crypto.scrypt(password, salt, 32, { N: 16384, r: 8, p: 1 }, (err, key) => {
      if (err) reject(err);
      else resolve(key as Buffer);
    });
  });
  return derived.toString("hex");
}

function timingSafeEqualHex(aHex: string, bHex: string): boolean {
  try {
    const a = Buffer.from(aHex, "hex");
    const b = Buffer.from(bHex, "hex");
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

export async function createUser(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  const password = params.password || "";
  if (!email || !email.includes("@")) throw new Error("Invalid email");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");

  const existing = await db.user.findUnique({ where: { email } });
  if (existing) throw new Error("Account already exists");

  const now = new Date();
  const saltHex = randomToken(16);
  const hashHex = await scryptHash(password, saltHex);

  const adminAllow = adminEmailsFromEnv();
  const userCount = await db.user.count();
  const role: UserRole = userCount === 0 || adminAllow.has(email) ? "admin" : "user";

  const userId = `user_${randomToken(10)}`;
  await db.user.create({
    data: {
      id: userId,
      email,
      role,
      createdAt: now,
      passwordSalt: saltHex,
      passwordHash: hashHex,
      prefs: { create: {} },
    },
  });

  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId, createdAt: now, expiresAt } });

  return {
    user: { id: userId, email, role, createdAt: now.toISOString() },
    session: { token, userId, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
  };
}

export async function createSession(params: { email: string; password: string }) {
  const email = normalizeEmail(params.email);
  const password = params.password || "";
  if (!email || !email.includes("@")) throw new Error("Invalid email");
  if (!password) throw new Error("Missing password");

  const user = await db.user.findUnique({ where: { email } });
  if (!user || !user.passwordSalt || !user.passwordHash) throw new Error("Invalid email or password");

  const computed = await scryptHash(password, user.passwordSalt);
  const ok = timingSafeEqualHex(computed, user.passwordHash);
  if (!ok) throw new Error("Invalid email or password");

  const now = new Date();
  const token = randomToken(32);
  const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);
  await db.session.create({ data: { token, userId: user.id, createdAt: now, expiresAt } });

  await db.userPrefs.upsert({
    where: { userId: user.id },
    update: {},
    create: { userId: user.id },
  });

  return {
    user: { id: user.id, email: user.email, role: user.role, createdAt: user.createdAt.toISOString() },
    session: { token, userId: user.id, createdAt: now.toISOString(), expiresAt: expiresAt.toISOString() },
  };
}

export async function destroySession(token: string): Promise<void> {
  const clean = (token || "").trim();
  if (!clean) return;
  await db.session.delete({ where: { token: clean } }).catch(() => {});
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const clean = (token || "").trim();
  if (!clean) return null;
  const session = await db.session.findUnique({ where: { token: clean }, include: { user: true } });
  if (!session) return null;
  if (+new Date(session.expiresAt) <= Date.now()) return null;
  const u = session.user;
  return { id: u.id, email: u.email, role: u.role, createdAt: u.createdAt.toISOString() };
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieJar = await cookies();
  const token = cookieJar.get(SESSION_COOKIE)?.value ?? "";
  return getUserBySessionToken(token);
}

export async function getPrefsForUser(userId: string) {
  const prefs = await db.userPrefs.upsert({
    where: { userId },
    update: {},
    create: { userId },
  });

  const follows = await db.follow.findMany({ where: { userId } });
  return {
    topics: follows.filter((f) => f.kind === "topic").map((f) => f.slug),
    outlets: follows.filter((f) => f.kind === "outlet").map((f) => f.slug),
    savedStories: [] as string[],
    subscription: { status: "none", updatedAt: prefs.updatedAt.toISOString() },
    updatedAt: prefs.updatedAt.toISOString(),
  };
}

export async function toggleFollow(userId: string, params: { kind: "topic" | "outlet"; slug: string }) {
  const slug = (params.slug || "").trim().toLowerCase();
  if (!slug) throw new Error("Missing slug");

  const existing = await db.follow.findUnique({
    where: { userId_kind_slug: { userId, kind: params.kind, slug } },
  });

  if (existing) {
    await db.follow.delete({ where: { id: existing.id } });
  } else {
    await db.follow.create({ data: { id: `follow_${randomToken(10)}`, userId, kind: params.kind, slug } });
  }

  const follows = await db.follow.findMany({ where: { userId } });
  return {
    prefs: {
      topics: follows.filter((f) => f.kind === "topic").map((f) => f.slug).sort(),
      outlets: follows.filter((f) => f.kind === "outlet").map((f) => f.slug).sort(),
    },
  };
}

export async function addFollowsBatch(
  userId: string,
  follows: Array<{ kind: "topic" | "outlet"; slug: string }>,
) {
  const clean = follows
    .map((item) => ({
      kind: item.kind,
      slug: (item.slug || "").trim().toLowerCase(),
    }))
    .filter((item) => (item.kind === "topic" || item.kind === "outlet") && item.slug.length > 0);

  if (clean.length === 0) {
    const prefs = await getPrefsForUser(userId);
    return { prefs: { topics: prefs.topics, outlets: prefs.outlets } };
  }

  await db.$transaction(
    clean.map((item) =>
      db.follow.upsert({
        where: { userId_kind_slug: { userId, kind: item.kind, slug: item.slug } },
        update: {},
        create: { id: `follow_${randomToken(10)}`, userId, kind: item.kind, slug: item.slug },
      }),
    ),
  );

  const followsNow = await db.follow.findMany({ where: { userId } });
  return {
    prefs: {
      topics: followsNow
        .filter((f) => f.kind === "topic")
        .map((f) => f.slug)
        .sort(),
      outlets: followsNow
        .filter((f) => f.kind === "outlet")
        .map((f) => f.slug)
        .sort(),
    },
  };
}

export async function requestPasswordReset(emailRaw: string) {
  const email = normalizeEmail(emailRaw);
  // Always return ok to avoid user enumeration.
  if (!email || !email.includes("@")) return { ok: true as const };

  const user = await db.user.findUnique({ where: { email } });
  if (!user) return { ok: true as const };

  const token = randomToken(32);
  const tokenHash = sha256Hex(token);
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

  await db.passwordResetToken.create({
    data: {
      id: `prt_${randomToken(10)}`,
      userId: user.id,
      tokenHash,
      expiresAt,
    },
  });

  const site = process.env.NEXT_PUBLIC_SITE_URL || process.env.SITE_URL || "http://localhost:3000";
  const resetUrl = `${site.replace(/\/$/, "")}/reset-password?token=${encodeURIComponent(token)}`;

  // In production you'd send email. For parity and dev workflows we return the link only in non-prod.
  if (process.env.NODE_ENV !== "production") {
    return { ok: true as const, devResetUrl: resetUrl };
  }
  return { ok: true as const };
}

export async function resetPassword(params: { token: string; password: string }) {
  const token = (params.token || "").trim();
  const password = params.password || "";
  if (!token) throw new Error("Missing token");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");

  const tokenHash = sha256Hex(token);
  const record = await db.passwordResetToken.findUnique({ where: { tokenHash } });
  if (!record) throw new Error("Invalid or expired reset link");
  if (record.usedAt) throw new Error("Reset link already used");
  if (+new Date(record.expiresAt) <= Date.now()) throw new Error("Reset link expired");

  const saltHex = randomToken(16);
  const hashHex = await scryptHash(password, saltHex);

  await db.$transaction(async (tx) => {
    await tx.user.update({
      where: { id: record.userId },
      data: { passwordSalt: saltHex, passwordHash: hashHex },
    });
    await tx.passwordResetToken.update({
      where: { tokenHash },
      data: { usedAt: new Date() },
    });
    // Invalidate existing sessions after a reset.
    await tx.session.deleteMany({ where: { userId: record.userId } });
  });

  return { ok: true as const };
}
