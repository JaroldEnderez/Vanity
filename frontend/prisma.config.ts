import "dotenv/config";
import { defineConfig } from "prisma/config";

// Local (migrate/seed): DEV_DATABASE_URL or DATABASE_URL. Vercel uses DATABASE_URL in env.
function getDatabaseUrl(): string {
  if (process.env.VERCEL) {
    return process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder";
  }
  const u = process.env.DEV_DATABASE_URL ?? process.env.DATABASE_URL;
  if (u) return u;
  const key = Object.keys(process.env).find(
    (k) =>
      k.endsWith("_DATABASE_URL") ||
      k.endsWith("_DB_URL") ||
      k.endsWith("_db_url")
  );
  return (key ? process.env[key] : undefined) ?? "postgresql://localhost:5432/placeholder";
}

export default defineConfig({
  datasource: {
    url: getDatabaseUrl(),
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
