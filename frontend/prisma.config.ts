import { defineConfig } from "prisma/config";

// DATABASE_URL or Neon-style *_DB_URL / *_DATABASE_URL (e.g. VANITY_DB_URL when you can't rename in Vercel)
function getDatabaseUrl(): string {
  const u = process.env.DATABASE_URL;
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
