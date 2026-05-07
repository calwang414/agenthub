import { NextRequest } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { success, error, jsonResponse, toCamelCaseArray, toCamelCase } from "@/lib/api-helper";
import { validateRequired, validateEmail, validateRole } from "@/lib/validations";

export async function GET(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const url = new URL(request.url);
    const pageParam = url.searchParams.get("page");
    const page = pageParam ? Math.max(1, parseInt(pageParam)) : null;
    const pageSize = page ? Math.min(100, Math.max(1, parseInt(url.searchParams.get("pageSize") || "50"))) : null;

    if (page && pageSize) {
      const from = (page - 1) * pageSize;
      const to = from + pageSize - 1;
      const { data, error: err, count } = await supabase
        .from("agenthub_users")
        .select("*", { count: "exact" })
        .order("created_at", { ascending: false })
        .range(from, to);

      if (err) return jsonResponse(error(err.message), 500);
      return jsonResponse(success({
        items: toCamelCaseArray(data as Record<string, unknown>[]),
        total: count ?? 0,
        page,
        pageSize,
        totalPages: Math.ceil((count ?? 0) / pageSize),
      }));
    }

    const { data, error: err } = await supabase
      .from("agenthub_users")
      .select("*")
      .order("created_at", { ascending: false });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(toCamelCaseArray(data as Record<string, unknown>[])));
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

    const nameResult = validateRequired(name);
    if (!nameResult.valid) return jsonResponse(error(`用户名${nameResult.error}`), 400);

    const emailResult = validateEmail(email);
    if (!emailResult.valid) return jsonResponse(error(emailResult.error), 400);

    if (password && password.length < 6) return jsonResponse(error("密码至少6位"), 400);

    const roleVal = role || "guest";
    const roleResult = validateRole(roleVal);
    if (!roleResult.valid) return jsonResponse(error(roleResult.error), 400);

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

    for (let i = 0; i < 10; i++) {
      const { data: checkProfile } = await adminClient
        .from("agenthub_users")
        .select("id")
        .eq("id", authData.user.id)
        .single();
      if (checkProfile) break;
      await new Promise((resolve) => setTimeout(resolve, 300));
    }

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

    return jsonResponse(success(toCamelCase(profile as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
