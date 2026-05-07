import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createServerSupabase();
    const { id } = await params;

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (err || !data) return jsonResponse(error("公告不存在"), 404);
    return jsonResponse(success(data));
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
      .from("agenthub_announcements")
      .select("*")
      .eq("id", id)
      .single();

    if (getErr || !existing) return jsonResponse(error("公告不存在"), 404);

    const body = await request.json();
    const updates: Record<string, unknown> = {};
    if (body.title !== undefined) updates.title = body.title;
    if (body.content !== undefined) updates.content = body.content;
    if (body.priority !== undefined) updates.priority = body.priority;
    if (body.linkUrl !== undefined) updates.link_url = body.linkUrl;
    if (body.isDismissible !== undefined) updates.is_dismissible = body.isDismissible;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.publishAt !== undefined) updates.publish_at = body.publishAt || null;
    if (body.expireAt !== undefined) updates.expire_at = body.expireAt || null;

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .update(updates)
      .eq("id", id)
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data));
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
      .from("agenthub_announcements")
      .delete()
      .eq("id", id);

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success({ deleted: true }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
