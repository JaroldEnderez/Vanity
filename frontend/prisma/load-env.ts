/**
 * `tsx prisma/seed.ts` does not load Next.js env files.
 * Load .env / .env.local from the frontend root so DATABASE_URL has credentials.
 */
import { config } from "dotenv";
import { resolve } from "path";

config({ path: resolve(process.cwd(), ".env") });
config({ path: resolve(process.cwd(), ".env.local"), override: true });
