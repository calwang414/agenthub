import { ensureDb, success, error, jsonResponse, toCamelCase, toCamelCaseArray } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const plugins = db.prepare("SELECT * FROM plugins ORDER BY id ASC").all() as Record<string, unknown>[];
    const parsed = plugins.map((p) => ({
      ...toCamelCase(p),
      tags: JSON.parse(String(p.tags || "[]")),
    }));
    return jsonResponse(success(parsed));
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

    db.prepare(`
      INSERT INTO plugins (id, name, description, version, author, category, downloads, rating, status, tags, icon, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.name || "",
      body.description || "",
      body.version || "1.0.0",
      body.author || "",
      body.category || "Skill",
      body.downloads ?? 0,
      body.rating ?? 0,
      body.status || "draft",
      JSON.stringify(body.tags || []),
      body.icon || "",
      now,
      now
    );

    const plugin = db.prepare("SELECT * FROM plugins WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success({ ...toCamelCase(plugin), tags: JSON.parse(String(plugin.tags || "[]")) }), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
