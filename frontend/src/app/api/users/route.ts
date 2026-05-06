import { ensureDb, success, error, jsonResponse, toCamelCase, toCamelCaseArray } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const users = db.prepare("SELECT * FROM users ORDER BY id ASC").all() as Record<string, unknown>[];
    return jsonResponse(success(toCamelCaseArray(users)));
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
      INSERT INTO users (id, name, nickname, email, phone, password, role, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      newId,
      body.name || "",
      body.nickname || body.name || "",
      body.email || "",
      body.phone || "",
      body.password || "",
      body.role || "guest",
      body.status || "active",
      now,
      now
    );

    const user = db.prepare("SELECT * FROM users WHERE id = ?").get(newId) as Record<string, unknown>;
    return jsonResponse(success(toCamelCase(user)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
