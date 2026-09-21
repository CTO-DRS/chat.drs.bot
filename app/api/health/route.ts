import Database from "better-sqlite3";
import { mkdirSync } from "node:fs";
import path from "node:path";

export function GET(request: Request) {
  // Reading request headers keeps this route dynamic (no static optimization)
  const requestStart = request.headers.get("x-request-start") ?? "";
  const startedAt = Date.now();
  const databasePath = process.env.DATABASE_PATH ?? "db/drs-chat.db";

  try {
    mkdirSync(path.dirname(databasePath), { recursive: true });
    const client = new Database(databasePath, { readonly: true });
    client.prepare("SELECT 1").get();
    client.close();

    return Response.json({
      status: "ok",
      database: "ok",
      requestMarker: requestStart === "" ? "none" : "present",
      uptimeSeconds: Math.round(process.uptime()),
      latencyMs: Date.now() - startedAt,
      timestamp: new Date().toISOString(),
      version: "3.1.0",
    });
  } catch (error) {
    return Response.json(
      {
        status: "degraded",
        database: "error",
        error: error instanceof Error ? error.message : "unknown error",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
