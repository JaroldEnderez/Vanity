import { defineConfig } from "prisma/config";

export default defineConfig({
  datasource: {
    url: "file:./prisma/vanity.db",
  },
  migrations: {
    seed: "tsx prisma/seed.ts",
  },
});
