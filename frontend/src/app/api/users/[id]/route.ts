import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("用户不存在"), 404);
    return jsonResponse(success(toCamelCase(data as Record<string, unknown>)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data: existing, error: getErr } = await supabase
      .from("agenthub_users")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("用户不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.nickname !== undefined) updates.nickname = body.nickname;
    if (body.phone !== undefined) updates.phone = body.phone;
    if (body.email !== undefined) updates.email = body.email;
    if (body.role !== undefined) updates.role = body.role;
    if (body.status !== undefined) updates.status = body.status;
    updates.last_active_at = new Date().toISOString();

    const { data, error: err } = await supabase
      .from("agenthub_users")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(toCamelCase(data as Record<string, unknown>)));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { error: err } = await supabase
      .from("agenthub_users")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
