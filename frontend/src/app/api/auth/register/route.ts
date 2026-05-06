import { ensureDb, success, error, jsonResponse } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function POST(request: Request) {
  try {
    ensureDb();
    const db = getDb();
    const body = await request.json();
    const { name, nickname, email, phone, password } = body;

    if (!email || !password) {
      return jsonResponse(error("邮箱和密码不能为空"));
    }

    const existing = db.prepare("SELECT id FROM users WHERE email = ?").get(email);
    if (existing) {
      return jsonResponse(error("该邮箱已被注册"));
    }

    const maxId = db.prepare("SELECT MAX(CAST(id AS INTEGER)) as max FROM users").get() as { max: number };
    const newId = String((maxId?.max ?? 18) + 1);
    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    const userName = name || email.split("@")[0];

    db.prepare(`
      INSERT INTO users (id, name, nickname, email, phone, password, role, status, created_at, last_active_at)
      VALUES (?, ?, ?, ?, ?, ?, 'guest', 'active', ?, ?)
    `).run(newId, userName, nickname || userName, email, phone || "", password, now, now);

    return jsonResponse(success({ id: newId, name: userName, nickname: nickname || userName, email, role: "guest" }), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
