import { config } from "dotenv";
import { defineConfig } from "drizzle-kit";

config({
  path: ".env.local",
});

export default defineConfig({
  dbCredentials: {
    url: process.env.DATABASE_PATH ?? "db/drs-chat.db",
  },
  dialect: "sqlite",
  out: "./lib/db/migrations",
  schema: "./lib/db/schema.ts",
});
