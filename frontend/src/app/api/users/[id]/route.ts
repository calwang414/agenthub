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
    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!user) return jsonResponse(error("用户不存在"), 404);
    return jsonResponse(success(toCamelCase(user)));
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
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return jsonResponse(error("用户不存在"), 404);

    const body = await request.json();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      UPDATE users SET name=?, nickname=?, email=?, phone=?, password=?, role=?, status=?, last_active_at=?
      WHERE id=?
    `).run(
      body.name ?? existing.name,
      body.nickname ?? existing.nickname,
      body.email ?? existing.email,
      body.phone ?? existing.phone,
      body.password ?? existing.password,
      body.role ?? existing.role,
      body.status ?? existing.status,
      now,
      id
    );

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(id) as Record<string, unknown>;
    return jsonResponse(success(toCamelCase(user)));
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
    const existing = db.prepare("SELECT * FROM users WHERE id = ?").get(id);
    if (!existing) return jsonResponse(error("用户不存在"), 404);

    db.prepare("DELETE FROM users WHERE id = ?").run(id);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
