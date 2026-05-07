import { createServerSupabase } from "@/lib/supabase/server";
import { error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: plugin, error: getErr } = await supabase
      .from("agenthub_plugins")
      .select("package_file")
      .eq("id", id)
      .single();

    if (getErr || !plugin) {
      return jsonResponse(error("插件不存在"), 404);
    }

    const packageFile = (plugin as Record<string, unknown>).package_file as string || "";

    if (!packageFile) {
      return jsonResponse(error("该插件无可下载的安装包"), 404);
    }

    const { data: urlData } = supabase.storage
      .from("agenthub")
      .getPublicUrl(packageFile);

    const fileResponse = await fetch(urlData.publicUrl);
    if (!fileResponse.ok) {
      return jsonResponse(error("安装包文件获取失败"), 502);
    }

    const blob = await fileResponse.blob();
    const rawFilename = packageFile.split("/").pop() || "plugin.zip";
    const encodedFilename = encodeURIComponent(rawFilename);

    return new Response(blob, {
      headers: {
        "Content-Type": fileResponse.headers.get("Content-Type") || "application/octet-stream",
        "Content-Disposition": `attachment; filename*=UTF-8''${encodedFilename}`,
        "Content-Length": String(blob.size),
      },
    });
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
