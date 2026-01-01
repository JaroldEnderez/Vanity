import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const dbPath = path.resolve(process.cwd(), "prisma", "vanity.db");
const connectionString = `file:${dbPath}`;

// Set DATABASE_URL - required for Prisma 7 adapter
process.env.DATABASE_URL = connectionString;

const adapter = new PrismaBetterSqlite3({ url: connectionString });

export const db = new PrismaClient({ adapter });
