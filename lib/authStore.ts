import fs from "node:fs/promises";
import path from "node:path";
import crypto from "node:crypto";
import { cookies } from "next/headers";

const AUTH_PATH = path.join(process.cwd(), "data", "auth.json");
const AUTH_LOCK_PATH = path.join(process.cwd(), "data", "auth.lock");
const LOCK_STALE_MS = 120000;
const LOCK_WAIT_STEP_MS = 80;
const LOCK_TIMEOUT_MS = 15000;
const SESSION_COOKIE = "ogn_session";

export type UserRole = "user" | "admin";

export type AuthUser = {
  id: string;
  email: string;
  role: UserRole;
  createdAt: string;
  password: {
    saltHex: string;
    hashHex: string;
  };
};

export type AuthSession = {
  token: string;
  userId: string;
  createdAt: string;
  expiresAt: string;
};

export type UserPrefs = {
  topics: string[];
  outlets: string[];
  savedStories: string[];
  subscription?: {
    status: "none" | "active" | "canceled" | "past_due" | "incomplete";
    plan?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
    updatedAt: string;
  };
  updatedAt: string;
};

export type SubscriptionStatus = NonNullable<UserPrefs["subscription"]>["status"];

type AuthShape = {
  users: AuthUser[];
  sessions: Record<string, AuthSession>;
  prefs: Record<string, UserPrefs>;
};

const EMPTY: AuthShape = {
  users: [],
  sessions: {},
  prefs: {},
};

async function sleep(ms: number) {
  await new Promise((resolve) => setTimeout(resolve, ms));
}

async function ensureAuthStore() {
  try {
    await fs.access(AUTH_PATH);
  } catch {
    await fs.mkdir(path.dirname(AUTH_PATH), { recursive: true });
    await fs.writeFile(AUTH_PATH, JSON.stringify(EMPTY, null, 2) + "\n", "utf8");
  }
}

async function withAuthFileLock<T>(run: () => Promise<T>): Promise<T> {
  const start = Date.now();
  let lockHandle: fs.FileHandle | null = null;
  await fs.mkdir(path.dirname(AUTH_LOCK_PATH), { recursive: true });

  while (!lockHandle) {
    try {
      lockHandle = await fs.open(AUTH_LOCK_PATH, "wx");
      await lockHandle.writeFile(
        JSON.stringify({ pid: process.pid, acquiredAt: new Date().toISOString() }, null, 2),
        "utf8",
      );
    } catch (error) {
      const isExists = error instanceof Error && "code" in error && error.code === "EEXIST";
      if (!isExists) throw error;

      try {
        const stat = await fs.stat(AUTH_LOCK_PATH);
        if (Date.now() - stat.mtimeMs > LOCK_STALE_MS) {
          await fs.rm(AUTH_LOCK_PATH, { force: true });
          continue;
        }
      } catch {
        continue;
      }

      if (Date.now() - start > LOCK_TIMEOUT_MS) {
        throw new Error("Timed out while waiting for auth lock.");
      }
      await sleep(LOCK_WAIT_STEP_MS);
    }
  }

  try {
    return await run();
  } finally {
    await lockHandle.close().catch(() => {});
    await fs.rm(AUTH_LOCK_PATH, { force: true }).catch(() => {});
  }
}

async function readAuthUnsafe(): Promise<AuthShape> {
  await ensureAuthStore();
  const raw = await fs.readFile(AUTH_PATH, "utf8");
  try {
    const parsed = JSON.parse(raw) as Partial<AuthShape>;
    return {
      ...EMPTY,
      ...parsed,
      users: Array.isArray(parsed.users) ? parsed.users : [],
      sessions: parsed.sessions && typeof parsed.sessions === "object" ? (parsed.sessions as AuthShape["sessions"]) : {},
      prefs: parsed.prefs && typeof parsed.prefs === "object" ? (parsed.prefs as AuthShape["prefs"]) : {},
    };
  } catch {
    await fs.writeFile(AUTH_PATH, JSON.stringify(EMPTY, null, 2) + "\n", "utf8");
    return { ...EMPTY };
  }
}

async function writeAuthAtomic(next: AuthShape) {
  const tempPath = `${AUTH_PATH}.tmp-${process.pid}-${Date.now()}`;
  await fs.writeFile(tempPath, JSON.stringify(next, null, 2) + "\n", "utf8");
  await fs.rename(tempPath, AUTH_PATH);
}

function normalizeEmail(value: string) {
  return (value || "").trim().toLowerCase();
}

function randomToken(bytes = 32) {
  return crypto.randomBytes(bytes).toString("hex");
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

function adminEmailsFromEnv(): Set<string> {
  const raw = process.env.OGN_ADMIN_EMAILS || process.env.OGN_ADMIN_EMAIL || "";
  return new Set(
    raw
      .split(",")
      .map((s) => normalizeEmail(s))
      .filter(Boolean),
  );
}

export async function createUser(params: { email: string; password: string }): Promise<{ user: AuthUser; session: AuthSession }> {
  const email = normalizeEmail(params.email);
  const password = params.password || "";
  if (!email || !email.includes("@")) throw new Error("Invalid email");
  if (password.length < 10) throw new Error("Password must be at least 10 characters");

  return withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    const exists = auth.users.find((u) => normalizeEmail(u.email) === email);
    if (exists) throw new Error("Account already exists");

    const now = new Date().toISOString();
    const saltHex = randomToken(16);
    const hashHex = await scryptHash(password, saltHex);

    const adminAllow = adminEmailsFromEnv();
    const role: UserRole = auth.users.length === 0 || adminAllow.has(email) ? "admin" : "user";

    const user: AuthUser = {
      id: `user_${randomToken(10)}`,
      email,
      role,
      createdAt: now,
      password: { saltHex, hashHex },
    };
    auth.users.push(user);

    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const session: AuthSession = { token, userId: user.id, createdAt: now, expiresAt };
    auth.sessions[token] = session;

    auth.prefs[user.id] = auth.prefs[user.id] || { topics: [], outlets: [], savedStories: [], updatedAt: now };

    await writeAuthAtomic(auth);
    return { user, session };
  });
}

export async function createSession(params: { email: string; password: string }): Promise<{ user: AuthUser; session: AuthSession }> {
  const email = normalizeEmail(params.email);
  const password = params.password || "";
  if (!email || !email.includes("@")) throw new Error("Invalid email");
  if (!password) throw new Error("Missing password");

  return withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    const user = auth.users.find((u) => normalizeEmail(u.email) === email);
    if (!user) throw new Error("Invalid email or password");

    const computed = await scryptHash(password, user.password.saltHex);
    const ok = timingSafeEqualHex(computed, user.password.hashHex);
    if (!ok) throw new Error("Invalid email or password");

    const now = new Date().toISOString();
    const token = randomToken(32);
    const expiresAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString();
    const session: AuthSession = { token, userId: user.id, createdAt: now, expiresAt };
    auth.sessions[token] = session;
    auth.prefs[user.id] = auth.prefs[user.id] || { topics: [], outlets: [], savedStories: [], updatedAt: now };

    await writeAuthAtomic(auth);
    return { user, session };
  });
}

export async function destroySession(token: string): Promise<void> {
  const clean = (token || "").trim();
  if (!clean) return;
  await withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    delete auth.sessions[clean];
    await writeAuthAtomic(auth);
  });
}

export async function getUserBySessionToken(token: string): Promise<AuthUser | null> {
  const clean = (token || "").trim();
  if (!clean) return null;
  const auth = await readAuthUnsafe();
  const session = auth.sessions[clean];
  if (!session) return null;
  if (+new Date(session.expiresAt) <= Date.now()) return null;
  const user = auth.users.find((u) => u.id === session.userId) || null;
  return user;
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const cookieJar = await cookies();
  const token = cookieJar.get(SESSION_COOKIE)?.value ?? "";
  return getUserBySessionToken(token);
}

export async function setSessionCookie(token: string) {
  // Intended for API routes; server components should not mutate cookies.
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 14 * 24 * 60 * 60,
  });
}

export async function clearSessionCookie() {
  const jar = await cookies();
  jar.set(SESSION_COOKIE, "", { httpOnly: true, sameSite: "lax", path: "/", maxAge: 0 });
}

export async function getPrefsForUser(userId: string): Promise<UserPrefs> {
  return withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    const now = new Date().toISOString();
    const prefs = auth.prefs[userId] || { topics: [], outlets: [], savedStories: [], updatedAt: now };
    auth.prefs[userId] = prefs;
    await writeAuthAtomic(auth);
    return prefs;
  });
}

export async function toggleFollow(userId: string, params: { kind: "topic" | "outlet"; slug: string }) {
  const slug = (params.slug || "").trim().toLowerCase();
  if (!slug) throw new Error("Missing slug");
  return withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    const now = new Date().toISOString();
    const prefs = auth.prefs[userId] || { topics: [], outlets: [], savedStories: [], updatedAt: now };
    const key = params.kind === "topic" ? "topics" : "outlets";
    const set = new Set((prefs as any)[key] || []);
    if (set.has(slug)) set.delete(slug);
    else set.add(slug);
    (prefs as any)[key] = Array.from(set.values()).sort();
    prefs.updatedAt = now;
    auth.prefs[userId] = prefs;
    await writeAuthAtomic(auth);
    return { prefs };
  });
}

export async function setSubscriptionForUser(
  userId: string,
  sub: {
    status: SubscriptionStatus;
    plan?: string;
    stripeCustomerId?: string;
    stripeSubscriptionId?: string;
  },
) {
  return withAuthFileLock(async () => {
    const auth = await readAuthUnsafe();
    const now = new Date().toISOString();
    const prefs = auth.prefs[userId] || { topics: [], outlets: [], savedStories: [], updatedAt: now };
    prefs.subscription = {
      status: sub.status,
      plan: sub.plan,
      stripeCustomerId: sub.stripeCustomerId,
      stripeSubscriptionId: sub.stripeSubscriptionId,
      updatedAt: now,
    };
    prefs.updatedAt = now;
    auth.prefs[userId] = prefs;
    await writeAuthAtomic(auth);
    return prefs;
  });
}

export async function findUserIdByStripeCustomerId(customerId: string): Promise<string | null> {
  const needle = (customerId || "").trim();
  if (!needle) return null;
  const auth = await readAuthUnsafe();
  for (const [userId, prefs] of Object.entries(auth.prefs || {})) {
    if (prefs?.subscription?.stripeCustomerId === needle) return userId;
  }
  return null;
}
