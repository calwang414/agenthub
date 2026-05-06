import { ensureDb, success, error, jsonResponse, toCamelCase, toCamelCaseArray } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const rows = db.prepare("SELECT * FROM tags ORDER BY sort_order ASC").all() as Record<string, unknown>[];
    const result = rows.map((t) => {
      const count = db.prepare(
        "SELECT COUNT(*) as count FROM plugins WHERE tags LIKE ?"
      ).get(`%"${t.name}"%`) as { count: number };
      return { ...toCamelCase(t), pluginCount: count.count };
    });
    return jsonResponse(success(result));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    ensureDb();
    const db = getDb();
    const body = await request.json();

    const newId = String(Date.now());
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const maxOrder = db.prepare("SELECT MAX(sort_order) as max FROM tags").get() as { max: number };
    const sortOrder = (maxOrder?.max ?? 0) + 1;

    db.prepare(`
      INSERT INTO tags (id, name, color, icon, description, plugin_count, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.name || "",
      body.color || "#cc785c",
      body.icon || "",
      body.description || "",
      body.pluginCount ?? 0,
      body.sortOrder ?? sortOrder,
      body.status || "enabled",
      now,
      now
    );

    const tag = db.prepare("SELECT * FROM tags WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success(toCamelCase(tag)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
