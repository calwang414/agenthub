import { ensureDb, success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

function parseTags(row: Record<string, unknown>) {
  return { ...toCamelCase(row), tags: JSON.parse(String(row.tags || "[]")) };
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDb();
    const db = getDb();
    const { id } = await params;
    const plugin = db.prepare("SELECT * FROM plugins WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!plugin) return jsonResponse(error("插件不存在"), 404);
    return jsonResponse(success(parseTags(plugin)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDb();
    const db = getDb();
    const { id } = await params;
    const existing = db.prepare("SELECT * FROM plugins WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return jsonResponse(error("插件不存在"), 404);

    const body = await request.json();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      UPDATE plugins SET name=?, description=?, version=?, author=?, category=?, downloads=?, rating=?, status=?, tags=?, icon=?, updated_at=?
      WHERE id=?
    `).run(
      body.name ?? existing.name,
      body.description ?? existing.description,
      body.version ?? existing.version,
      body.author ?? existing.author,
      body.category ?? existing.category,
      body.downloads ?? existing.downloads,
      body.rating ?? existing.rating,
      body.status ?? existing.status,
      body.tags ? JSON.stringify(body.tags) : existing.tags,
      body.icon ?? existing.icon,
      now,
      id
    );

    const plugin = db.prepare("SELECT * FROM plugins WHERE id = ?").get(id) as Record<string, unknown>;
    return jsonResponse(success(parseTags(plugin)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDb();
    const db = getDb();
    const { id } = await params;
    const existing = db.prepare("SELECT * FROM plugins WHERE id = ?").get(id);
    if (!existing) return jsonResponse(error("插件不存在"), 404);

    db.prepare("DELETE FROM plugins WHERE id = ?").run(id);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
