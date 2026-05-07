import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCaseArray, toCamelCase } from "@/lib/api-helper";

export async function GET() {
  try {
    const supabase = await createServerSupabase();
    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .select("id, name, description, version, author, category, downloads, rating, status, tags, icon, package_file, cover_images, created_at, updated_at")
      .order("created_at", { ascending: false });

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

    const { data, error: err } = await supabase
      .from("agenthub_plugins")
      .insert({
        name: body.name || "",
        description: body.description || "",
        version: body.version || "1.0.0",
        author: body.author || "",
        category: body.category || "Skill",
        downloads: body.downloads ?? 0,
        rating: body.rating ?? 0,
        status: body.status || "draft",
        tags: body.tags || [],
        icon: body.icon || "",
        readme: body.readme || "",
        changelog: body.changelog || "",
      })
      .select()
      .single();

    if (err) return jsonResponse(error(err.message), 500);
    return jsonResponse(success(toCamelCase(data as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
