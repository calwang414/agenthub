import { ensureDb, success, error, jsonResponse } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function POST(request: Request) {
  try {
    ensureDb();
    const db = getDb();
    const body = await request.json();
    const { username, password } = body;

    if (!username || !password) {
      return jsonResponse(error("用户名和密码不能为空"));
    }

    const user = db.prepare(
      "SELECT * FROM users WHERE (email = ? OR phone = ? OR name = ?) AND password = ?"
    ).get(username, username, username, password) as Record<string, unknown> | undefined;

    if (!user) {
      return jsonResponse(error("用户名或密码错误"), 401);
    }

    if (user.status === "disabled") {
      return jsonResponse(error("账号已被禁用"), 403);
    }

    const now = new Date().toISOString().replace("T", " ").slice(0, 19);
    db.prepare("UPDATE users SET last_active_at = ? WHERE id = ?").run(now, user.id);

    return jsonResponse(success({ id: user.id, name: user.name, nickname: user.nickname, email: user.email, role: user.role }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
