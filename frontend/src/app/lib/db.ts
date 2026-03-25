import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";

// Local: DEV_DATABASE_URL, then VANITY_DATABASE_URL / DATABASE_URL. Vercel: VANITY_DATABASE_URL, then DATABASE_URL.
function getDatabaseUrl(): string {
  if (process.env.VERCEL) {
    return process.env.VANITY_DATABASE_URL ?? process.env.DATABASE_URL ?? "";
  }
  const u =
    process.env.DEV_DATABASE_URL ??
    process.env.VANITY_DATABASE_URL ??
    process.env.DATABASE_URL;
  if (u) return u;
  const key = Object.keys(process.env).find(
    (k) =>
      k.endsWith("_DATABASE_URL") ||
      k.endsWith("_DB_URL") ||
      k.endsWith("_db_url")
  );
  return (key ? process.env[key] : undefined) ?? "";
}
const url = getDatabaseUrl();
// Schema is postgresql: only use SQLite adapter when URL is explicitly file:. Otherwise use Postgres
// (avoids "adapter sqlite not compatible with provider postgres" when DATABASE_URL is missing at build).
const isSqlite = url.startsWith("file:");
const isPostgres = !isSqlite;

function defaultSqliteUrl(): string {
  const cwd = process.cwd();
  const inFrontend = cwd.endsWith("frontend") || path.basename(cwd) === "frontend";
  const dbPath = inFrontend
    ? path.resolve(cwd, "prisma", "vanity.db")
    : path.resolve(cwd, "frontend", "prisma", "vanity.db");
  return `file:${dbPath}`;
}

const connectionString = isSqlite
  ? url
  : url
    ? url
    : "postgresql://localhost:5432/placeholder"; // build-time placeholder when env not set

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = connectionString;

// Prisma 7 requires adapter. Postgres: PrismaPg; SQLite only when DATABASE_URL=file:...
// Use a singleton in development to avoid "Invalid invocation" / multiple client instances on HMR.
function createPrismaClient(): PrismaClient {
  return isPostgres
    ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
    : new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: connectionString }) });
}

const globalForPrisma = globalThis as unknown as { prisma: PrismaClient | undefined };
export const db = globalForPrisma.prisma ?? createPrismaClient();
if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;

/** Default interactive tx timeout is 5s — too low for Neon / pooler latency. */
export const interactiveTxOptions = { maxWait: 10_000, timeout: 30_000 } as const;
