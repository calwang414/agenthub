import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCaseArray, toCamelCase } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .select("*")
      .order("sort_order", { ascending: true });

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(toCamelCaseArray(data as Record<string, unknown>[])));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();

    const { data: maxRow } = await supabase
      .from("agenthub_tags")
      .select("sort_order")
      .order("sort_order", { ascending: false })
      .limit(1)
      .single();

    const sortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data, error: err } = await supabase
      .from("agenthub_tags")
      .insert({
        name: body.name || "",
        color: body.color || "#cc785c",
        icon: body.icon || "",
        description: body.description || "",
        plugin_count: body.pluginCount ?? 0,
        sort_order: body.sortOrder ?? sortOrder,
        status: body.status || "enabled",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(toCamelCase(data as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
