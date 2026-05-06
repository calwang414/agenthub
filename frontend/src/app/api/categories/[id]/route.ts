import { ensureDb, success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDb();
    const db = getDb();
    const { id } = await params;
    const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!category) return jsonResponse(error("分类不存在"), 404);
    return jsonResponse(success(toCamelCase(category)));
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
    const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return jsonResponse(error("分类不存在"), 404);

    const body = await request.json();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      UPDATE categories SET name=?, icon=?, description=?, plugin_count=?, sort_order=?, status=?, updated_at=?
      WHERE id=?
    `).run(
      body.name ?? existing.name,
      body.icon ?? existing.icon,
      body.description ?? existing.description,
      body.pluginCount ?? existing.plugin_count,
      body.sortOrder ?? existing.sort_order,
      body.status ?? existing.status,
      now,
      id
    );

    const category = db.prepare("SELECT * FROM categories WHERE id = ?").get(id) as Record<string, unknown>;
    return jsonResponse(success(toCamelCase(category)));
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
    const existing = db.prepare("SELECT * FROM categories WHERE id = ?").get(id);
    if (!existing) return jsonResponse(error("分类不存在"), 404);

    db.prepare("DELETE FROM categories WHERE id = ?").run(id);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
