import { createServerSupabase } from "@/lib/supabase/server";
import { error, jsonResponse } from "@/lib/api-helper";
import { NextResponse } from "next/server";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .select("package_file")
      .eq("id", id)
      .single();

    if (err || !data) {
      return jsonResponse(error("插件不存在"), 404);
    }

    const packageFile: string = (data as Record<string, unknown>).package_file as string || "";

    if (!packageFile) {
      return jsonResponse(error("该插件无可下载的安装包"), 404);
    }

    const { data: publicUrlData } = supabase.storage
      .from("agenthub")
      .getPublicUrl(packageFile);

    return NextResponse.redirect(publicUrlData.publicUrl);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
