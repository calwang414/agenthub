import { NextResponse } from "next/server";
import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_announcements")
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
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data, error: err } = await supabase
      .from("agenthub_announcements")
      .insert({
        title: body.title || "",
        content: body.content || "",
        priority: body.priority || "normal",
        link_url: body.linkUrl || "",
        is_dismissible: body.isDismissible !== false,
        is_active: body.isActive !== false,
        publish_at: body.publishAt || null,
        expire_at: body.expireAt || null,
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(data), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
