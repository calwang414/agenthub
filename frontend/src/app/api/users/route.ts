import { NextRequest, NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
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

export async function POST(request: NextRequest) {
  try {
    const supabase = await createServerSupabase();
    const adminClient = createAdminClient();
    const body = await request.json();

    const { name, email, phone, role, password } = body;

    if (!name || !email || !password) {
      return jsonResponse(error("用户名、邮箱和密码为必填项"), 400);
    }

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), phone: phone || "" },
    });

    if (authError) {
      return jsonResponse(error(authError.message), 500);
    }

    if (!authData.user) {
      return jsonResponse(error("创建用户失败"), 500);
    }

    await new Promise((resolve) => setTimeout(resolve, 500));

    const { error: updateError } = await adminClient
      .from("agenthub_users")
      .update({
        name: name.trim(),
        phone: phone || "",
        role: role || "guest",
      })
      .eq("id", authData.user.id);

    if (updateError) {
      return jsonResponse(error(updateError.message), 500);
    }

    const { data: profile, error: fetchError } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", authData.user.id)
      .single();

    if (fetchError || !profile) {
      return jsonResponse(error("用户已创建但获取详情失败"), 500);
    }

    return jsonResponse(success(profile), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
