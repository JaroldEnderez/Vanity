import { defineConfig } from "prisma/config";

// Use placeholder when DATABASE_URL is missing (e.g. during Vercel npm install).
// At runtime the app uses process.env.DATABASE_URL in db.ts.
export default defineConfig({
  datasource: {
    url: process.env.DATABASE_URL ?? "postgresql://localhost:5432/placeholder",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
