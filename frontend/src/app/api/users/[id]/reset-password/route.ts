import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;
    const body = await request.json();
    const { password } = body;

    if (!password || typeof password !== "string" || password.length < 6) {
      return jsonResponse(error("密码不能为空且至少6位"), 400);
    }

    const { data: { user: currentUser } } = await supabase.auth.getUser();
    if (!currentUser) return jsonResponse(error("未登录"), 401);

    const { data: currentProfile } = await supabase
      .from("agenthub_users")
      .select("role")
      .eq("id", currentUser.id)
      .single();

    if (!currentProfile || currentProfile.role !== "admin") {
      return jsonResponse(error("无操作权限"), 403);
    }

    const adminClient = createAdminClient();
    const { error: resetErr } = await adminClient.auth.admin.updateUserById(
      id,
      { password }
    );

    if (resetErr) return jsonResponse(error(resetErr.message), 500);

    return jsonResponse(success({ success: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
