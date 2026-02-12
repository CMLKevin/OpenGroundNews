import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __ogn_prisma__: PrismaClient | undefined;
}

function createClient() {
  if (!process.env.DATABASE_URL) {
    // Fail fast so we don't silently fall back to file stores when parity relies on DB state.
    throw new Error('DATABASE_URL is not set. Set it in .env.local or start via ./restart.sh dev (auto-provisions local Postgres).');
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

export const db: PrismaClient = globalThis.__ogn_prisma__ ?? createClient();

if (process.env.NODE_ENV !== "production") {
  globalThis.__ogn_prisma__ = db;
}
