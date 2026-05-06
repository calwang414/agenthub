import { NextResponse } from "next/server";
import { createServerSupabase, createServerSupabaseAdmin } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabaseAdmin();
    const body = await request.json();

    const { data: authData, error: authErr } = await supabase.auth.admin.createUser({
      email: body.email || "",
      password: body.password || "",
      email_confirm: true,
    });

    if (authErr) return jsonResponse(error(authErr.message), 500);

    if (authData.user) {
      const { error: profileErr } = await supabase
        .from("agenthub_users")
        .update({
          name: body.name || "",
          nickname: body.nickname || body.name || "",
          phone: body.phone || "",
          role: body.role || "guest",
          status: body.status || "active",
        })
        .eq("id", authData.user.id);

      if (profileErr) return jsonResponse(error(profileErr.message), 500);

      const { data: profile } = await supabase
        .from("agenthub_users")
        .select("*")
        .eq("id", authData.user.id)
        .single();

      return jsonResponse(success(profile), 201);
    }

    return jsonResponse(error("用户创建失败"), 500);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
