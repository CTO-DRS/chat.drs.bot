import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "upload");

const CONTENT_TYPES: Record<string, string> = {
  ".gif": "image/gif",
  ".jpeg": "image/jpeg",
  ".jpg": "image/jpeg",
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".webp": "image/webp",
};

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;

  // Prevent path traversal.
  if (name.includes("/") || name.includes("..")) {
    return new Response("Not found", { status: 404 });
  }

  const filePath = path.join(UPLOAD_DIR, name);

  if (!existsSync(filePath)) {
    return new Response("Not found", { status: 404 });
  }

  const contentType = CONTENT_TYPES[path.extname(name).toLowerCase()];

  if (!contentType) {
    return new Response("Unsupported media type", { status: 415 });
  }

  const data = readFileSync(filePath);

  return new Response(new Uint8Array(data), {
    headers: {
      "Cache-Control": "public, max-age=31536000, immutable",
      "Content-Type": contentType,
    },
  });
}
