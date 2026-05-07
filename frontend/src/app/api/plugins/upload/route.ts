import { createServerSupabase } from "@/lib/supabase/server";
import { success, error, jsonResponse, toCamelCase } from "@/lib/api-helper";
import { validateRequired } from "@/lib/validations";

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
    const readme = (formData.get("readme") as string) || "";
    const changelog = (formData.get("changelog") as string) || "";

    const tags: string[] = [];
    formData.forEach((val, key) => {
      if (/^tags\[(\d+)\]$/.test(key)) {
        tags.push(val as string);
      }
    });

    if (!name.trim()) {
      return jsonResponse(error("插件名称不能为空"), 400);
    }

    const nameResult = validateRequired(name, 1, 100);
    if (!nameResult.valid) return jsonResponse(error(`插件名称${nameResult.error}`), 400);

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
        readme: readme.trim(),
        changelog: changelog.trim(),
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
    const uploadErrors: string[] = [];

    if (packageFile && packageFile.size > 0) {
      const filePath = `packages/${pluginId}/${packageFile.name}`;

      const { error: pkgErr } = await supabase.storage
        .from("agenthub")
        .upload(filePath, packageFile, { upsert: true });

      if (pkgErr) {
        uploadErrors.push(`安装包上传失败: ${pkgErr.message}`);
        console.error("安装包上传失败:", pkgErr.message);
      } else {
        packagePath = filePath;
      }
    }

    if (coverFiles.length > 0) {
      for (let i = 0; i < coverFiles.length; i++) {
        const file = coverFiles[i];
        const filePath = `covers/${pluginId}/${file.name}`;

        const { error: coverErr } = await supabase.storage
          .from("agenthub")
          .upload(filePath, file, { upsert: true });

        if (coverErr) {
          uploadErrors.push(`封面图上传失败: ${coverErr.message}`);
          console.error("封面图上传失败:", coverErr.message);
        } else {
          coverPaths.push(filePath);
        }
      }
    }

    if (uploadErrors.length > 0 && !packagePath && coverPaths.length === 0) {
      return jsonResponse(error(uploadErrors.join("; ")), 500);
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

      const result = toCamelCase(updated as Record<string, unknown>);
      if (uploadErrors.length > 0) {
        (result as Record<string, unknown>)._uploadWarnings = uploadErrors;
      }
      return jsonResponse(success(result), 201);
    }

    return jsonResponse(success(toCamelCase(plugin as Record<string, unknown>)), 201);
  } catch (e) {
    return jsonResponse(error(String(e)), 500);
  }
}
