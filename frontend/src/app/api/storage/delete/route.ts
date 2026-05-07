import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return jsonResponse(error("未登录"), 401);

    const { data: profile } = await supabase
      .from("agenthub_users")
      .select("role")
      .eq("id", user.id)
      .single();

    if (!profile || profile.role !== "admin") {
      return jsonResponse(error("无操作权限"), 403);
    }

    const body = await request.json();
    const paths: string[] = Array.isArray(body.paths) ? body.paths : [];

    if (paths.length === 0) {
      return jsonResponse(success({ deleted: 0, failed: 0 }));
    }

    const adminClient = createAdminClient();
    const results = await Promise.allSettled(
      paths.map((p) => adminClient.storage.from("agenthub").remove([p]))
    );

    let deleted = 0;
    let failed = 0;

    results.forEach((r, i) => {
      if (r.status === "fulfilled" && !r.value.error) {
        deleted++;
      } else {
        failed++;
        const msg = r.status === "fulfilled" ? r.value.error?.message : String(r.reason);
        console.error(`删除 Storage 文件失败: ${paths[i]}`, msg);
      }
    });

    return jsonResponse(success({ deleted, failed }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
