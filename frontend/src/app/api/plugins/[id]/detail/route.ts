import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: plugin, error: pluginErr } = await supabase
      .from("agenthub_plugins")
      .select("id")
      .eq("id", id)
      .single();

    if (pluginErr || !plugin) return jsonResponse(error("插件不存在"), 404);

    const { data: detail, error: detailErr } = await supabase
      .from("agenthub_plugin_details")
      .select("*")
      .eq("plugin_id", id)
      .single();

    if (detailErr || !detail) {
      return jsonResponse(
        success({
          pluginId: id,
          readme: "",
          installSteps: [],
          dependencies: [],
          reviews: [],
          versionHistory: [],
          developer: { name: "", description: "", website: "" },
          docs: [],
        })
      );
    }

    return jsonResponse(
      success({
        pluginId: detail.plugin_id,
        readme: detail.readme,
        installSteps: detail.install_steps,
        dependencies: detail.dependencies,
        reviews: detail.reviews,
        versionHistory: detail.version_history,
        developer: {
          name: detail.developer_name,
          description: detail.developer_description,
          website: detail.developer_website,
        },
        docs: detail.docs,
      })
    );
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
