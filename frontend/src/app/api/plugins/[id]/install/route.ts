import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: plugin, error: getErr } = await supabase
      .from("agenthub_plugins")
      .select("package_file, downloads")
      .eq("id", id)
      .single();

    if (getErr || !plugin) {
      return jsonResponse(error("插件不存在"), 404);
    }

    const packageFile: string = (plugin as Record<string, unknown>).package_file as string || "";

    if (!packageFile) {
      return jsonResponse(error("该插件无可下载的安装包"), 404);
    }

    const { data: publicUrlData } = supabase.storage
      .from("agenthub")
      .getPublicUrl(packageFile);

    const currentDownloads: number = (plugin as Record<string, unknown>).downloads as number || 0;
    const newDownloads = currentDownloads + 1;

    const { error: updateErr } = await supabase
      .from("agenthub_plugins")
      .update({ downloads: newDownloads })
      .eq("id", id);

    if (updateErr) {
      console.error("下载计数更新失败:", updateErr.message);
    }

    return jsonResponse(success({
      downloadUrl: publicUrlData.publicUrl,
      newCount: newDownloads,
    }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
