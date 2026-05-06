import { ensureDb, success, error, jsonResponse } from "@/lib/api-helper";
import { getDb } from "@/lib/db/index";

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

    const detail = db.prepare("SELECT * FROM plugin_details WHERE plugin_id = ?").get(id) as Record<string, unknown> | undefined;

    if (!detail) {
      return jsonResponse(success({
        pluginId: id,
        readme: "",
        installSteps: [],
        dependencies: [],
        reviews: [],
        versionHistory: [],
        developer: { name: "", description: "", website: "" },
        docs: [],
      }));
    }

    const result = {
      pluginId: detail.plugin_id,
      readme: detail.readme,
      installSteps: JSON.parse(String(detail.install_steps || "[]")),
      dependencies: JSON.parse(String(detail.dependencies || "[]")),
      reviews: JSON.parse(String(detail.reviews || "[]")),
      versionHistory: JSON.parse(String(detail.version_history || "[]")),
      developer: {
        name: detail.developer_name,
        description: detail.developer_description,
        website: detail.developer_website,
      },
      docs: JSON.parse(String(detail.docs || "[]")),
    };

    return jsonResponse(success(result));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
