import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";

function getExt(filename: string): string {
  if (filename.endsWith(".tar.gz")) return "tar.gz";
  const parts = filename.split(".");
  return parts[parts.length - 1] || "bin";
}

export async function POST(request: Request) {
  try {
    const supabase = await createServerSupabase();
    const formData = await request.formData();

    const name = (formData.get("name") as string) || "";
    const description = (formData.get("description") as string) || "";
    const version = (formData.get("version") as string) || "1.0.0";
    const author = (formData.get("author") as string) || "";
    const category = (formData.get("category") as string) || "Skill";
    const status = (formData.get("status") as string) || "draft";

    const tags: string[] = [];
    formData.forEach((val, key) => {
      if (/^tags\[(\d+)\]$/.test(key)) {
        tags.push(val as string);
      }
    });

    if (!name.trim()) {
      return jsonResponse(error("插件名称不能为空"), 400);
    }

    const { data: plugin, error: insertErr } = await supabase
      .from("agenthub_plugins")
      .insert({
        name: name.trim(),
        description: description.trim(),
        version: version.trim(),
        author: author.trim(),
        category,
        status,
        tags,
      })
      .select()
      .single();

    if (insertErr || !plugin) {
      return jsonResponse(error(insertErr?.message || "创建插件失败"), 500);
    }

    const pluginId = plugin.id;

    const packageFile = formData.get("package") as File | null;
    const coverFiles = formData.getAll("coverImages").filter(
      (f): f is File => f instanceof File
    );

    let packagePath = "";
    const coverPaths: string[] = [];

    if (packageFile && packageFile.size > 0) {
      const ext = getExt(packageFile.name);
      const filePath = `packages/${pluginId}.${ext}`;

      const { error: pkgErr } = await supabase.storage
        .from("agenthub")
        .upload(filePath, packageFile, { upsert: true });

      if (!pkgErr) {
        packagePath = filePath;
      }
    }

    if (coverFiles.length > 0) {
      for (let i = 0; i < coverFiles.length; i++) {
        const file = coverFiles[i];
        const ext = file.name.split(".").pop() || "png";
        const filePath = `covers/${pluginId}_${i}.${ext}`;

        const { error: coverErr } = await supabase.storage
          .from("agenthub")
          .upload(filePath, file, { upsert: true });

        if (!coverErr) {
          coverPaths.push(filePath);
        }
      }
    }

    if (packagePath || coverPaths.length > 0) {
      const updates: Record<string, unknown> = {};
      if (packagePath) updates.package_file = packagePath;
      if (coverPaths.length > 0) updates.cover_images = coverPaths;

      const { error: updateErr } = await supabase
        .from("agenthub_plugins")
        .update(updates)
        .eq("id", pluginId);

      if (updateErr) {
        return jsonResponse(error(updateErr.message), 500);
      }

      const { data: updated, error: fetchErr } = await supabase
        .from("agenthub_plugins")
        .select("*")
        .eq("id", pluginId)
        .single();

      if (fetchErr || !updated) {
        return jsonResponse(success(toCamelCase(plugin as Record<string, unknown>)), 201);
      }

      return jsonResponse(success(toCamelCase(updated as Record<string, unknown>)), 201);
    }

    return jsonResponse(success(toCamelCase(plugin as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
