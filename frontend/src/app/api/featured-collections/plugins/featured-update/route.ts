import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse } from "@/lib/api-helper";

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const body = await request.json();
    const pluginId = body.pluginId as string;
    const collectionIds = body.collectionIds as string[];

    if (!pluginId || !Array.isArray(collectionIds)) {
      return jsonResponse(error("缺少必要参数 pluginId 或 collectionIds"), 400);
    }

    const { data: allCollections, error: fetchErr } = await supabase
      .from("agenthub_featured_collections")
      .select("*");

    if (fetchErr) return jsonResponse(error(fetchErr.message), 500);

    const addedTo: string[] = [];
    const removedFrom: string[] = [];

    for (const col of allCollections || []) {
      const currentIds: string[] = col.plugin_ids || [];
      const isIncluded = currentIds.includes(pluginId);
      const shouldInclude = collectionIds.includes(col.id);

      if (!isIncluded && shouldInclude) {
        const newIds = [...currentIds, pluginId];
        const { error: updateErr } = await supabase
          .from("agenthub_featured_collections")
          .update({ plugin_ids: newIds })
          .eq("id", col.id);
        if (updateErr) return jsonResponse(error(updateErr.message), 500);
        addedTo.push(col.title);
      } else if (isIncluded && !shouldInclude) {
        const newIds = currentIds.filter((id: string) => id !== pluginId);
        const { error: updateErr } = await supabase
          .from("agenthub_featured_collections")
          .update({ plugin_ids: newIds })
          .eq("id", col.id);
        if (updateErr) return jsonResponse(error(updateErr.message), 500);
        removedFrom.push(col.title);
      }
    }

    return jsonResponse(success({ addedTo, removedFrom }));
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
