import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

declare global {
  // eslint-disable-next-line no-var
  var __ogn_prisma__: PrismaClient | undefined;
}

function createClientOrNull(): PrismaClient | null {
  if (!process.env.DATABASE_URL) {
    // IMPORTANT:
    // Next.js loads route modules during build-time analysis. Throwing here would break `next build`
    // even though the DB is only needed at runtime. We still fail fast when code actually touches `db`.
    return null;
  }
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const adapter = new PrismaPg(pool);
  return new PrismaClient({ adapter });
}

const dbReal: PrismaClient | null = globalThis.__ogn_prisma__ ?? createClientOrNull();

export const db: PrismaClient =
  dbReal ??
  (new Proxy(
    {},
    {
      get() {
        throw new Error(
          'DATABASE_URL is not set. Set it in .env.local or start via ./restart.sh dev (auto-provisions local Postgres).'
        );
      },
    }
  ) as PrismaClient);

if (process.env.NODE_ENV !== "production" && dbReal) {
  globalThis.__ogn_prisma__ = dbReal;
}
