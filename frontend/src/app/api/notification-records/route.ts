import { ensureDb, success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

function parseRecord(row: Record<string, unknown>) {
  const r = toCamelCase(row);
  return {
    ...r,
    targetRoles: JSON.parse(String(row.target_roles || "[]")),
  };
}

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const records = db.prepare("SELECT * FROM notification_records ORDER BY sent_at DESC").all();
    return jsonResponse(success((records as Record<string, unknown>[]).map(parseRecord)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    ensureDb();
    const db = getDb();
    const body = await request.json();

    const newId = "n" + Date.now();
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);

    db.prepare(`
      INSERT INTO notification_records (id, content, target_type, target_roles, sent_at, status)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.content || "",
      body.targetType || "all",
      JSON.stringify(body.targetRoles || []),
      now,
      "sent"
    );

    const record = db.prepare("SELECT * FROM notification_records WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success(parseRecord(record)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
