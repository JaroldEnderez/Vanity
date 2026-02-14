import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import { PrismaPg } from "@prisma/adapter-pg";
import path from "path";

const url = process.env.DATABASE_URL ?? "";
const isPostgres = url.startsWith("postgresql://") || url.startsWith("postgres://");

function defaultSqliteUrl(): string {
  const cwd = process.cwd();
  const inFrontend = cwd.endsWith("frontend") || path.basename(cwd) === "frontend";
  const dbPath = inFrontend
    ? path.resolve(cwd, "prisma", "vanity.db")
    : path.resolve(cwd, "frontend", "prisma", "vanity.db");
  return `file:${dbPath}`;
}

const connectionString = isPostgres ? url : (url.startsWith("file:") ? url : defaultSqliteUrl());

if (!process.env.DATABASE_URL) process.env.DATABASE_URL = connectionString;

// Prisma 7 requires adapter or accelerateUrl. Postgres: PrismaPg; SQLite: PrismaBetterSqlite3.
export const db = isPostgres
  ? new PrismaClient({ adapter: new PrismaPg({ connectionString }) })
  : new PrismaClient({ adapter: new PrismaBetterSqlite3({ url: connectionString }) });
