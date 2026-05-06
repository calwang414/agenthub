import { ensureDb, success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

function parseBool(v: unknown): boolean {
  return v === 1 || v === true || v === "1";
}

function parseAnnouncement(row: Record<string, unknown>) {
  const r = toCamelCase(row);
  return {
    ...r,
    isDismissible: parseBool(row.is_dismissible),
    isActive: parseBool(row.is_active),
  };
}

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const announcements = db.prepare("SELECT * FROM announcements ORDER BY created_at DESC").all();
    return jsonResponse(success((announcements as Record<string, unknown>[]).map(parseAnnouncement)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    ensureDb();
    const db = getDb();
    const body = await request.json();

    const newId = "a" + Date.now();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      INSERT INTO announcements (id, title, content, priority, link_url, is_dismissible, is_active, publish_at, expire_at, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.title || "",
      body.content || "",
      body.priority || "normal",
      body.linkUrl || "",
      body.isDismissible !== false ? 1 : 0,
      body.isActive !== false ? 1 : 0,
      body.publishAt || null,
      body.expireAt || null,
      now
    );

    const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success(parseAnnouncement(announcement)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
