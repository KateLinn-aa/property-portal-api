import "dotenv/config";
import path from "node:path";
import { defineConfig } from "prisma/config";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  datasource: {
    url: process.env.DATABASE_URL!,
  },
  migrate: {
    adapter: async () => new PrismaBetterSqlite3({ url: process.env.DATABASE_URL! }),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
