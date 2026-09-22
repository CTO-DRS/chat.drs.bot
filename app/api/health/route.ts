import { mkdirSync } from "node:fs";
import path from "node:path";
import Database from "better-sqlite3";

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
      database: "ok",
      latencyMs: Date.now() - startedAt,
      requestMarker: requestStart === "" ? "none" : "present",
      status: "ok",
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.round(process.uptime()),
      version: "3.4.0",
    });
  } catch (error) {
    return Response.json(
      {
        database: "error",
        error: error instanceof Error ? error.message : "unknown error",
        status: "degraded",
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }
}
