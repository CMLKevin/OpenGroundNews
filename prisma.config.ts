import "dotenv/config";
import { defineConfig } from "prisma/config";

export default defineConfig({
  // Prisma 7 moved datasource URLs out of schema.prisma.
  // Keep it in env for parity with Next.js runtime and scripts.
  datasource: {
    url: process.env.DATABASE_URL,
  },
});

