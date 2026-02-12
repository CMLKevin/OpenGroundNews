import "dotenv/config";
import { defineConfig } from "prisma/config";
import dotenv from "dotenv";

// Prisma CLI loads this config directly, and dotenv/config only reads `.env`.
// Align with app/scripts behavior by also loading `.env.local` when present.
dotenv.config({ path: ".env.local", override: false });

function defaultDevDatabaseUrl() {
  const user = process.env.PGUSER || process.env.USER || process.env.LOGNAME || "postgres";
  const port = process.env.OGN_PG_PORT || "54329";
  const db = process.env.OGN_PG_DB || "ogn_dev";
  return `postgresql://${user}@localhost:${port}/${db}?schema=public`;
}

export default defineConfig({
  // Prisma 7 moved datasource URLs out of schema.prisma.
  // Keep it in env for parity with Next.js runtime and scripts.
  datasource: {
    url: process.env.DATABASE_URL || (process.env.NODE_ENV === "production" ? "" : defaultDevDatabaseUrl()),
  },
});
