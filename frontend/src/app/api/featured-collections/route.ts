import { ensureDb, success, error, jsonResponse } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

export async function GET() {
  try {
    ensureDb();
    const db = getDb();
    const collections = db.prepare("SELECT * FROM featured_collections").all();
    const parsed = (collections as Record<string, unknown>[]).map((c) => ({
      ...c,
      pluginIds: JSON.parse(String(c.plugin_ids || "[]")),
    }));
    return jsonResponse(success(parsed));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
