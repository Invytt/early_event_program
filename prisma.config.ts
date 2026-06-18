import { config } from "dotenv"
// Next.js keeps secrets in .env.local; load it for the Prisma CLI.
config({ path: ".env.local" })

import { defineConfig, env } from "prisma/config"

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
  },
  // DIRECT_URL = non-pooled connection, used for migrations.
  datasource: {
    url: env("DIRECT_URL"),
  },
})
