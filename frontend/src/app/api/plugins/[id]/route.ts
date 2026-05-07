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
      .from("agenthub_plugins")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("插件不存在"), 404);
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
      .from("agenthub_plugins")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("插件不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.name = body.name;
    if (body.description !== undefined) updates.description = body.description;
    if (body.version !== undefined) updates.version = body.version;
    if (body.author !== undefined) updates.author = body.author;
    if (body.category !== undefined) updates.category = body.category;
    if (body.downloads !== undefined) updates.downloads = body.downloads;
    if (body.rating !== undefined) updates.rating = body.rating;
    if (body.status !== undefined) updates.status = body.status;
    if (body.tags !== undefined) updates.tags = body.tags;
    if (body.icon !== undefined) updates.icon = body.icon;

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
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
      .from("agenthub_plugins")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
