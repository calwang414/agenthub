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

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    ensureDb();
    const db = getDb();
    const { id } = await params;
    const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!announcement) return jsonResponse(error("公告不存在"), 404);
    return jsonResponse(success(parseAnnouncement(announcement)));
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
    const existing = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as Record<string, unknown> | undefined;
    if (!existing) return jsonResponse(error("公告不存在"), 404);

    const body = await request.json();

    db.prepare(`
      UPDATE announcements SET title=?, content=?, priority=?, link_url=?, is_dismissible=?, is_active=?, publish_at=?, expire_at=?
      WHERE id=?
    `).run(
      body.title ?? existing.title,
      body.content ?? existing.content,
      body.priority ?? existing.priority,
      body.linkUrl ?? existing.link_url,
      body.isDismissible !== undefined ? (body.isDismissible ? 1 : 0) : existing.is_dismissible,
      body.isActive !== undefined ? (body.isActive ? 1 : 0) : existing.is_active,
      body.publishAt !== undefined ? (body.publishAt || null) : existing.publish_at,
      body.expireAt !== undefined ? (body.expireAt || null) : existing.expire_at,
      id
    );

    const announcement = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id) as Record<string, unknown>;
    return jsonResponse(success(parseAnnouncement(announcement)));
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
    const existing = db.prepare("SELECT * FROM announcements WHERE id = ?").get(id);
    if (!existing) return jsonResponse(error("公告不存在"), 404);

    db.prepare("DELETE FROM announcements WHERE id = ?").run(id);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
