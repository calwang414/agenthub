import { ensureDb, success, error, jsonResponse, toCamelCase, toCamelCaseArray } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const rows = db.prepare("SELECT * FROM categories ORDER BY sort_order ASC").all() as Record<string, unknown>[];
    const result = rows.map((c) => {
      const count = db.prepare("SELECT COUNT(*) as count FROM plugins WHERE category = ?").get(c.name) as { count: number };
      return { ...toCamelCase(c), pluginCount: count.count };
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
    const maxOrder = db.prepare("SELECT MAX(sort_order) as max FROM categories").get() as { max: number };
    const sortOrder = (maxOrder?.max ?? 0) + 1;

    db.prepare(`
      INSERT INTO categories (id, name, icon, description, plugin_count, sort_order, status, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.name || "",
      body.icon || "",
      body.description || "",
      body.pluginCount ?? 0,
      body.sortOrder ?? sortOrder,
      body.status || "enabled",
      now,
      now
    );

    const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success(toCamelCase(category)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
