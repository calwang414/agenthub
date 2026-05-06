"use client";

import { useState, useMemo, useCallback, useEffect, useRef, type DragEvent, type ChangeEvent } from "react";
import type { Plugin } from "@/lib/mock/plugins";
import type { Tag } from "@/lib/mock/tags";
import { apiGet, apiPost, apiPut, apiDelete, apiUpload } from "@/lib/api-client";
import { createClient } from "@/lib/supabase/client";
import AdminLayout from "@/components/ui/admin-layout";

type ViewMode = "table" | "card";
type CategoryFilter = "全部" | "Skill" | "Agent" | "Tool" | "MCP" | "Plugin";
type StatusFilter = "全部" | "published" | "draft" | "reviewing";

const CATEGORY_OPTIONS: CategoryFilter[] = ["全部", "Skill", "Agent", "Tool", "MCP", "Plugin"];
const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "全部", value: "全部" },
  { label: "已上架", value: "published" },
  { label: "已下架", value: "draft" },
  { label: "待审核", value: "reviewing" },
];

const STATUS_MAP: Record<Plugin["status"], { label: string; className: string }> = {
  published: { label: "已上架", className: "bg-[#5db872]/12 text-[#5db872]" },
  draft: { label: "已下架", className: "bg-[#8e8b82]/12 text-[#8e8b82]" },
  reviewing: { label: "待审核", className: "bg-[#e8a55a]/12 text-[#d4a017]" },
};

const CATEGORY_COLORS: Record<string, string> = {
  Skill: "bg-[#5db8a6]/12 text-[#5db8a6]",
  Agent: "bg-[#cc785c]/12 text-[#cc785c]",
  Tool: "bg-[#e8a55a]/12 text-[#d4a017]",
  MCP: "bg-[#8e8b82]/12 text-[#6c6a64]",
  Plugin: "bg-[#252523]/12 text-[#252523]",
};

const ITEMS_PER_PAGE = 6;

function formatDownloads(n: number): string {
  if (n >= 10000) return (n / 10000).toFixed(1) + "w";
  if (n >= 1000) return (n / 1000).toFixed(1) + "k";
  return String(n);
}

function renderStars(rating: number) {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("⭑");
  while (stars.length < 5) stars.push("☆");
  return (
    <span className="text-[#e8a55a] text-sm tracking-tight">
      {stars.join("")}{" "}
      <span className="text-[#6c6a64] ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function AdminPluginsPage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("全部");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [pluginList, setPluginList] = useState<Plugin[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [showModal, setShowModal] = useState(false);
  const [editingPlugin, setEditingPlugin] = useState<Plugin | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Plugin | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [packageFile, setPackageFile] = useState<File | null>(null);
  const [packageDragOver, setPackageDragOver] = useState(false);
  const packageInputRef = useRef<HTMLInputElement>(null);
  const [coverImageFile, setCoverImageFile] = useState<File | null>(null);
  const [coverImageDragOver, setCoverImageDragOver] = useState(false);
  const [coverImagePreview, setCoverImagePreview] = useState<string | null>(null);
  const coverImageInputRef = useRef<HTMLInputElement>(null);
  const [iconFile, setIconFile] = useState<File | null>(null);
  const [iconPreview, setIconPreview] = useState<string>("");
  const editorRef = useRef<HTMLDivElement>(null);

  const [formData, setFormData] = useState({
    name: "",
    description: "",
    version: "1.0.0",
    author: "",
    category: "Skill" as Plugin["category"],
    tags: [] as string[],
  });

  const [tagLibrary, setTagLibrary] = useState<Tag[]>([]);

  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchPlugins = useCallback(async () => {
    try {
      const data = await apiGet<Plugin[]>("/api/plugins");
      setPluginList(data);
    } catch {
      addToast("加载插件数据失败", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchPlugins();
  }, [fetchPlugins]);

  const filteredPlugins = useMemo(() => {
    let result = pluginList;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          p.author.toLowerCase().includes(q) ||
          p.description.toLowerCase().includes(q)
      );
    }
    if (categoryFilter !== "全部") {
      result = result.filter((p) => p.category === categoryFilter);
    }
    if (statusFilter !== "全部") {
      result = result.filter((p) => p.status === statusFilter);
    }
    return result;
  }, [pluginList, search, categoryFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredPlugins.length / ITEMS_PER_PAGE));
  const pagedPlugins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredPlugins.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredPlugins, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    return {
      total: pluginList.length,
      published: pluginList.filter((p) => p.status === "published").length,
      totalDownloads: pluginList.reduce((sum, p) => sum + p.downloads, 0),
      reviewing: pluginList.filter((p) => p.status === "reviewing").length,
    };
  }, [pluginList]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedPlugins.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedPlugins.map((p) => p.id)));
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const handleToggleStatus = useCallback(
    async (plugin: Plugin) => {
      const newStatus = plugin.status === "published" ? "draft" : "published";
      try {
        await apiPut(`/api/plugins/${plugin.id}`, { status: newStatus });
        setPluginList((prev) =>
          prev.map((p) =>
            p.id === plugin.id ? { ...p, status: newStatus as Plugin["status"] } : p
          )
        );
        addToast(
          `插件「${plugin.name}」已${plugin.status === "published" ? "下架" : "上架"}`,
          "success"
        );
      } catch (e) {
        addToast(`操作失败: ${String(e)}`, "error");
      }
    },
    [addToast]
  );

  const handleDelete = useCallback(
    async (plugin: Plugin) => {
      try {
        await apiDelete(`/api/plugins/${plugin.id}`);
        setPluginList((prev) => prev.filter((p) => p.id !== plugin.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(plugin.id);
          return next;
        });
        setShowDeleteConfirm(null);
        addToast(`插件「${plugin.name}」已删除`, "success");
      } catch (e) {
        addToast(`删除失败: ${String(e)}`, "error");
      }
    },
    [addToast]
  );

  const handleBatchDelete = async () => {
    const selectedPlugins = pluginList.filter((p) => selectedIds.has(p.id));
    const names = selectedPlugins.map((p) => p.name).join("、");
    try {
      for (const p of selectedPlugins) {
        await apiDelete(`/api/plugins/${p.id}`);
      }
      setPluginList((prev) => prev.filter((p) => !selectedIds.has(p.id)));
      setSelectedIds(new Set());
      addToast(`已批量删除 ${names}`, "success");
    } catch (e) {
      addToast(`批量删除失败: ${String(e)}`, "error");
    }
  };

  const handleBatchPublish = async () => {
    try {
      for (const id of selectedIds) {
        await apiPut(`/api/plugins/${id}`, { status: "published" });
      }
      setPluginList((prev) =>
        prev.map((p) => (selectedIds.has(p.id) ? { ...p, status: "published" as const } : p))
      );
      setSelectedIds(new Set());
      addToast("已批量上架所选插件", "success");
    } catch (e) {
      addToast(`批量上架失败: ${String(e)}`, "error");
    }
  };

  const openAddModal = () => {
    setEditingPlugin(null);
    setFormData({ name: "", description: "", version: "1.0.0", author: "", category: "Skill", tags: [] });
    setPackageFile(null);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setIconFile(null);
    setIconPreview("");
    apiGet<Tag[]>("/api/tags").then((data) => setTagLibrary(data.filter((t) => t.status === "enabled"))).catch(() => {});
    setShowModal(true);
  };

  const openEditModal = (plugin: Plugin) => {
    setEditingPlugin(plugin);
    setFormData({
      name: plugin.name,
      description: plugin.description,
      version: plugin.version,
      author: plugin.author,
      category: plugin.category,
      tags: plugin.tags,
    });
    setPackageFile(null);
    setCoverImageFile(null);
    setCoverImagePreview(null);
    setIconFile(null);
    setIconPreview("");
    apiGet<Tag[]>("/api/tags").then((data) => setTagLibrary(data.filter((t) => t.status === "enabled"))).catch(() => {});
    setShowModal(true);
  };

  const handlePackageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setPackageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidPackageFile(file)) {
      setPackageFile(file);
    } else {
      addToast("仅支持 .zip / .tar.gz / .tgz 格式", "error");
    }
  };

  const handlePackageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidPackageFile(file)) {
      setPackageFile(file);
    } else if (file) {
      addToast("仅支持 .zip / .tar.gz / .tgz 格式", "error");
    }
  };

  const isValidPackageFile = (file: File) => {
    const validExts = [".zip", ".tar.gz", ".tgz"];
    return validExts.some((ext) => file.name.toLowerCase().endsWith(ext));
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + " KB";
    return (bytes / (1024 * 1024)).toFixed(1) + " MB";
  };

  const isValidImageFile = (file: File) => {
    const validTypes = ["image/png", "image/jpeg", "image/jpg"];
    return validTypes.includes(file.type);
  };

  const handleCoverImageDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setCoverImageDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file && isValidImageFile(file)) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) {
      addToast("仅支持 PNG、JPG 格式的图片", "error");
    }
  };

  const handleCoverImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && isValidImageFile(file)) {
      setCoverImageFile(file);
      const reader = new FileReader();
      reader.onload = () => setCoverImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    } else if (file) {
      addToast("仅支持 PNG、JPG 格式的图片", "error");
    }
  };

  const clearCoverImage = () => {
    setCoverImageFile(null);
    setCoverImagePreview(null);
    if (coverImageInputRef.current) {
      coverImageInputRef.current.value = "";
    }
  };

  const execRichCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleEditorBlur = () => {
    if (editorRef.current) {
      setFormData((f) => ({ ...f, description: editorRef.current!.innerHTML }));
    }
  };

  async function uploadPluginIcon(pluginId: string): Promise<string | null> {
    if (!iconFile) return null;
    try {
      const supabase = createClient();
      const ext = iconFile.name.split(".").pop() || "png";
      const filePath = `icons/${pluginId}.${ext}`;

      const { error } = await supabase.storage
        .from("agenthub")
        .upload(filePath, iconFile, { upsert: true });

      if (error) {
        console.error("图标上传失败:", error.message);
        return null;
      }

      return filePath;
    } catch (e) {
      console.error("图标上传异常:", e);
      return null;
    }
  }

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("插件名称不能为空", "error");
      return;
    }
    if (!formData.author.trim()) {
      addToast("作者不能为空", "error");
      return;
    }
    const tags = formData.tags;
    const hasFiles = !!(packageFile || coverImageFile);

    try {
      if (editingPlugin) {
        await apiPut(`/api/plugins/${editingPlugin.id}`, {
          name: formData.name.trim(),
          description: formData.description.trim(),
          version: formData.version.trim(),
          author: formData.author.trim(),
          category: formData.category,
          tags,
        });
        addToast(`插件「${formData.name.trim()}」已更新`, "success");
      } else {
        if (hasFiles) {
          const formDataUpload = new FormData();
          formDataUpload.append("name", formData.name.trim());
          formDataUpload.append("description", formData.description.trim());
          formDataUpload.append("version", formData.version.trim());
          formDataUpload.append("author", formData.author.trim());
          formDataUpload.append("category", formData.category);
          formDataUpload.append("status", "draft");
          tags.forEach((tag, i) => formDataUpload.append(`tags[${i}]`, tag));
          if (packageFile) {
            formDataUpload.append("package", packageFile);
          }
          if (coverImageFile) {
            formDataUpload.append("coverImage", coverImageFile);
          }
          const newPlugin = await apiUpload<Plugin>("/api/plugins/upload", formDataUpload);
          addToast(`插件「${formData.name.trim()}」已创建${packageFile ? "，压缩包已上传" : ""}${coverImageFile ? "，封面图已上传" : ""}`, "success");
          const iconPath = await uploadPluginIcon(newPlugin.id);
          if (iconPath) {
            await fetch(`/api/plugins/${newPlugin.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ icon: iconPath }),
            });
          }
        } else {
          const newPlugin = await apiPost<Plugin>("/api/plugins", {
            name: formData.name.trim(),
            description: formData.description.trim(),
            version: formData.version.trim(),
            author: formData.author.trim(),
            category: formData.category,
            tags,
            status: "draft",
          });
          addToast(`插件「${formData.name.trim()}」已创建`, "success");
          const iconPath = await uploadPluginIcon(newPlugin.id);
          if (iconPath) {
            await fetch(`/api/plugins/${newPlugin.id}`, {
              method: "PUT",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ icon: iconPath }),
            });
          }
        }
      }
      fetchPlugins();
    } catch (e) {
      addToast(`保存失败: ${String(e)}`, "error");
      return;
    }
    setShowModal(false);
    setEditingPlugin(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showDeleteConfirm) setShowDeleteConfirm(null);
        else if (showModal) setShowModal(false);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [showModal, showDeleteConfirm]);

  return (
    <AdminLayout title="插件管理">
        <div className="flex-1 p-8 space-y-6 overflow-auto">
          {/* Stats Row */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
            {[
              { label: "插件总数", value: stats.total, icon: "🔌", color: "text-[#cc785c]" },
              { label: "已上架", value: stats.published, icon: "✅", color: "text-[#5db872]" },
              { label: "总下载量", value: formatDownloads(stats.totalDownloads), icon: "⬇️", color: "text-[#5db8a6]" },
              { label: "待审核", value: stats.reviewing, icon: "⏳", color: "text-[#e8a55a]" },
            ].map((stat) => (
              <div key={stat.label} className="bg-[#efe9de] rounded-xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{stat.icon}</span>
                  <span
                    className={`text-3xl tracking-tight tabular-nums ${stat.color}`}
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}
                  >
                    {stat.value}
                  </span>
                </div>
                <div className="text-[#6c6a64] text-sm mt-2">{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[180px] relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]"
                fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索插件名称或作者…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
              />
            </div>

            <select
              value={categoryFilter}
              onChange={(e) => { setCategoryFilter(e.target.value as CategoryFilter); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none pr-8 bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 12px center",
              }}
            >
              {CATEGORY_OPTIONS.map((c) => (
                <option key={c} value={c}>{c === "全部" ? "全部分类" : c}</option>
              ))}
            </select>

            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none pr-8 bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 12px center",
              }}
            >
              {STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>

            <div className="flex bg-[#efe9de] rounded-lg p-0.5">
              <button
                onClick={() => setViewMode("table")}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === "table" ? "bg-[#faf9f5] text-[#141413] shadow-sm" : "text-[#6c6a64] hover:text-[#141413]"
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M3 10h18M3 14h18m-9-4v8m-7 0h14a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                表格
              </button>
              <button
                onClick={() => setViewMode("card")}
                className={`px-3 py-2 rounded-md text-sm transition-colors ${
                  viewMode === "card" ? "bg-[#faf9f5] text-[#141413] shadow-sm" : "text-[#6c6a64] hover:text-[#141413]"
                }`}
              >
                <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                卡片
              </button>
            </div>

            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 4v16m8-8H4" />
              </svg>
              新增插件
            </button>
          </div>

          {/* Batch Actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#252320] rounded-lg text-sm">
              <span className="text-[#faf9f5]">已选择 {selectedIds.size} 项</span>
              <button onClick={handleBatchPublish} className="px-3 py-1.5 bg-[#5db872] text-white rounded-md hover:opacity-90 transition-opacity text-xs">
                批量上架
              </button>
              <button onClick={handleBatchDelete} className="px-3 py-1.5 bg-[#c64545] text-white rounded-md hover:opacity-90 transition-opacity text-xs">
                批量删除
              </button>
              <button onClick={() => setSelectedIds(new Set())} className="ml-auto px-3 py-1.5 text-[#a09d96] hover:text-[#faf9f5] transition-colors text-xs">
                取消选择
              </button>
            </div>
          )}

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8]">
                      <th className="px-4 py-3 text-left">
                        <input
                          type="checkbox"
                          checked={selectedIds.size === pagedPlugins.length && pagedPlugins.length > 0}
                          onChange={toggleSelectAll}
                          className="w-4 h-4 rounded accent-[#cc785c] cursor-pointer"
                        />
                      </th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">插件名称</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden md:table-cell">版本</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden md:table-cell">作者</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden lg:table-cell">分类</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium hidden lg:table-cell">下载量</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden xl:table-cell">评分</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">状态</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedPlugins.map((plugin) => (
                      <tr key={plugin.id} className="border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors">
                        <td className="px-4 py-3">
                          <input
                            type="checkbox"
                            checked={selectedIds.has(plugin.id)}
                            onChange={() => toggleSelect(plugin.id)}
                            className="w-4 h-4 rounded accent-[#cc785c] cursor-pointer"
                          />
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#efe9de] flex items-center justify-center flex-shrink-0">
                              <span className="text-sm">
                                {plugin.category === "Agent" ? "🤖" : plugin.category === "Tool" ? "🛠️" : plugin.category === "MCP" ? "🔗" : plugin.category === "Skill" ? "🧩" : "📦"}
                              </span>
                            </div>
                            <div className="min-w-0">
                              <div className="text-[#141413] text-sm font-medium truncate max-w-[200px]">{plugin.name}</div>
                              <div className="text-[#8e8b82] text-xs truncate max-w-[200px] hidden sm:block">
                                {plugin.description.slice(0, 40)}…
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-[#6c6a64] text-sm hidden md:table-cell">v{plugin.version}</td>
                        <td className="px-4 py-3 text-[#3d3d3a] text-sm hidden md:table-cell">{plugin.author}</td>
                        <td className="px-4 py-3 hidden lg:table-cell">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[plugin.category]}`}>
                            {plugin.category}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-right text-[#3d3d3a] text-sm hidden lg:table-cell tabular-nums">
                          {formatDownloads(plugin.downloads)}
                        </td>
                        <td className="px-4 py-3 hidden xl:table-cell">{renderStars(plugin.rating)}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[plugin.status].className}`}>
                            {STATUS_MAP[plugin.status].label}
                          </span>
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(plugin)}
                              className="px-2 py-1.5 text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-md transition-colors text-xs"
                            >
                              编辑
                            </button>
                            <button
                              onClick={() => handleToggleStatus(plugin)}
                              className={`px-2 py-1.5 rounded-md transition-colors text-xs ${
                                plugin.status === "published"
                                  ? "text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8"
                                  : "text-[#5db872] hover:text-[#5db872] hover:bg-[#5db872]/8"
                              }`}
                            >
                              {plugin.status === "published" ? "下架" : "上架"}
                            </button>
                            <button
                              onClick={() => setShowDeleteConfirm(plugin)}
                              className="px-2 py-1.5 text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors text-xs"
                            >
                              删除
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedPlugins.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                          没有找到匹配的插件
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Card View */}
          {viewMode === "card" && (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
              {pagedPlugins.map((plugin) => (
                <div
                  key={plugin.id}
                  className="bg-[#efe9de] rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                >
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-lg bg-[#faf9f5] flex items-center justify-center text-lg border border-[#e6dfd8]">
                      {plugin.category === "Agent" ? "🤖" : plugin.category === "Tool" ? "🛠️" : plugin.category === "MCP" ? "🔗" : plugin.category === "Skill" ? "🧩" : "📦"}
                    </div>
                    <div className="flex items-center gap-1">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[plugin.status].className}`}>
                        {STATUS_MAP[plugin.status].label}
                      </span>
                      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[plugin.category]}`}>
                        {plugin.category}
                      </span>
                    </div>
                  </div>
                  <h3 className="text-[#141413] text-base font-medium mb-1">{plugin.name}</h3>
                  <p className="text-[#8e8b82] text-sm mb-3 line-clamp-2">{plugin.description}</p>
                  <div className="flex items-center justify-between text-xs text-[#6c6a64] mb-3">
                    <span>{plugin.author}</span>
                    <span>v{plugin.version}</span>
                  </div>
                  <div className="flex items-center justify-between mb-3">
                    {renderStars(plugin.rating)}
                    <span className="text-[#6c6a64] text-sm">⬇ {formatDownloads(plugin.downloads)}</span>
                  </div>
                  <div className="flex flex-wrap gap-1 mb-4">
                    {plugin.tags.map((tag) => (
                      <span key={tag} className="px-2 py-0.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-full text-xs text-[#6c6a64]">
                        {tag}
                      </span>
                    ))}
                  </div>
                  <div className="flex items-center gap-2 pt-3 border-t border-[#e6dfd8] opacity-0 group-hover:opacity-100 transition-opacity">
                    <button onClick={() => openEditModal(plugin)} className="flex-1 py-1.5 text-xs text-[#6c6a64] hover:text-[#141413] hover:bg-[#faf9f5] rounded-md transition-colors">
                      编辑
                    </button>
                    <button
                      onClick={() => handleToggleStatus(plugin)}
                      className={`flex-1 py-1.5 text-xs rounded-md transition-colors ${
                        plugin.status === "published"
                          ? "text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8"
                          : "text-[#5db872] hover:bg-[#5db872]/8"
                      }`}
                    >
                      {plugin.status === "published" ? "下架" : "上架"}
                    </button>
                    <button onClick={() => setShowDeleteConfirm(plugin)} className="flex-1 py-1.5 text-xs text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors">
                      删除
                    </button>
                  </div>
                </div>
              ))}
              {pagedPlugins.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#8e8b82] text-sm">
                  没有找到匹配的插件
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#6c6a64]">
                共 {filteredPlugins.length} 个插件，第 {currentPage} / {totalPages} 页
              </span>
              <div className="flex items-center gap-1">
                <button
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  上一页
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                  <button
                    key={page}
                    onClick={() => setCurrentPage(page)}
                    className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                      page === currentPage
                        ? "bg-[#cc785c] text-white"
                        : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de]"
                    }`}
                  >
                    {page}
                  </button>
                ))}
                <button
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                >
                  下一页
                </button>
              </div>
            </div>
          )}
        </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6dfd8]">
              <h2
                className="text-[#141413] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                {editingPlugin ? "编辑插件" : "新增插件"}
              </h2>
              <button
                onClick={() => setShowModal(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">插件名称 <span className="text-[#c64545]">*</span></label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="输入插件名称"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">描述</label>
                <div className="border border-[#e6dfd8] rounded-lg overflow-hidden focus-within:border-[#cc785c] focus-within:ring-2 focus-within:ring-[#cc785c]/15 transition-all">
                  <div className="flex items-center gap-0.5 px-2 py-1.5 bg-[#f5f0e8] border-b border-[#e6dfd8]">
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("bold"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors font-bold"
                      title="加粗"
                    >B</button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("italic"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors italic"
                      title="斜体"
                    >I</button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("underline"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors underline"
                      title="下划线"
                    >U</button>
                    <span className="w-px h-4 bg-[#e6dfd8] mx-1" />
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("insertUnorderedList"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors"
                      title="无序列表"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01"/></svg>
                    </button>
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("insertOrderedList"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-sm text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors"
                      title="有序列表"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path d="M10 6h11M10 12h11M10 18h11M4 6h1v4M4 10h2M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"/></svg>
                    </button>
                    <span className="w-px h-4 bg-[#e6dfd8] mx-1" />
                    <button
                      type="button"
                      onMouseDown={(e) => { e.preventDefault(); execRichCommand("removeFormat"); }}
                      className="w-7 h-7 flex items-center justify-center rounded text-xs text-[#6c6a64] hover:bg-[#efe9de] hover:text-[#141413] transition-colors"
                      title="清除格式"
                    >Tx</button>
                  </div>
                  <div
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onBlur={handleEditorBlur}
                    className="min-h-[80px] max-h-[200px] overflow-y-auto px-3 py-2.5 text-sm text-[#141413] bg-[#faf9f5] outline-none empty:before:content-[attr(data-placeholder)] empty:before:text-[#8e8b82]"
                    data-placeholder="简要描述插件功能，支持富文本格式"
                    dangerouslySetInnerHTML={{ __html: formData.description }}
                  />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">作者 <span className="text-[#c64545]">*</span></label>
                  <input
                    type="text"
                    value={formData.author}
                    onChange={(e) => setFormData((f) => ({ ...f, author: e.target.value }))}
                    placeholder="作者/团队名"
                    className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                  />
                </div>
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">版本号</label>
                  <input
                    type="text"
                    value={formData.version}
                    onChange={(e) => setFormData((f) => ({ ...f, version: e.target.value }))}
                    placeholder="1.0.0"
                    className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">分类</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData((f) => ({ ...f, category: e.target.value as Plugin["category"] }))}
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none pr-8 bg-no-repeat"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundPosition: "right 12px center",
                  }}
                >
                  {(["Skill", "Agent", "Tool", "MCP", "Plugin"] as const).map((c) => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              </div>
              <div className="mb-4">
                <label className="block text-sm font-medium mb-1">插件图标</label>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) {
                      setIconFile(file);
                      setIconPreview(URL.createObjectURL(file));
                    }
                  }}
                  className="w-full text-sm border rounded px-3 py-2"
                />
                {iconPreview && (
                  <img src={iconPreview} alt="图标预览" className="w-16 h-16 mt-2 rounded object-cover" />
                )}
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">
                  标签
                  <span className="text-[#8e8b82] text-xs ml-1">（从标签库选择）</span>
                </label>
                <div className="flex flex-wrap gap-1.5 p-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg min-h-[40px]">
                  {tagLibrary.length === 0 && (
                    <span className="text-[#8e8b82] text-xs">加载标签中…</span>
                  )}
                  {tagLibrary.map((tag) => {
                    const selected = formData.tags.includes(tag.name);
                    return (
                      <button
                        key={tag.id}
                        type="button"
                        onClick={() => {
                          setFormData((f) => ({
                            ...f,
                            tags: selected
                              ? f.tags.filter((t) => t !== tag.name)
                              : [...f.tags, tag.name],
                          }));
                        }}
                        className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium transition-all ${
                          selected
                            ? "text-white shadow-sm"
                            : "bg-[#f5f0e8] text-[#6c6a64] hover:bg-[#efe9de]"
                        }`}
                        style={selected ? { backgroundColor: tag.color } : undefined}
                      >
                        <span>{tag.icon}</span>
                        {tag.name}
                        {selected && <span className="ml-0.5 opacity-70">✕</span>}
                      </button>
                    );
                  })}
                </div>
                {formData.tags.length > 0 && (
                  <div className="mt-1 flex items-center gap-1.5">
                    <span className="text-[#8e8b82] text-xs">已选 {formData.tags.length} 个标签</span>
                    <button
                      type="button"
                      onClick={() => setFormData((f) => ({ ...f, tags: [] }))}
                      className="text-xs text-[#cc785c] hover:underline"
                    >
                      清空
                    </button>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">插件压缩包 <span className="text-[#c64545]">*</span></label>
                <input
                  ref={packageInputRef}
                  type="file"
                  accept=".zip,.tar.gz,.tgz"
                  onChange={handlePackageSelect}
                  className="hidden"
                />
                {packageFile ? (
                  <div className="flex items-center gap-3 p-4 bg-[#f5f0e8] border border-[#e6dfd8] rounded-lg">
                    <div className="w-10 h-10 rounded-lg bg-[#cc785c]/12 flex items-center justify-center flex-shrink-0">
                      <svg className="w-5 h-5 text-[#cc785c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[#141413] text-sm truncate">{packageFile.name}</div>
                      <div className="text-[#8e8b82] text-xs">{formatFileSize(packageFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setPackageFile(null)}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 transition-colors"
                      title="移除文件"
                    >✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => packageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setPackageDragOver(true); }}
                    onDragLeave={() => setPackageDragOver(false)}
                    onDrop={handlePackageDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      packageDragOver ? "border-[#cc785c] bg-[#cc785c]/4" : "border-[#e6dfd8] hover:border-[#cc785c]"
                    }`}
                  >
                    <div className="text-3xl mb-1">📦</div>
                    <div className="text-[#8e8b82] text-sm">点击或拖拽上传插件压缩包</div>
                    <div className="text-[#8e8b82] text-xs mt-0.5">支持 .zip / .tar.gz / .tgz，最大 50MB</div>
                  </div>
                )}
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">封面图</label>
                <input
                  ref={coverImageInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg"
                  onChange={handleCoverImageSelect}
                  className="hidden"
                />
                {coverImageFile ? (
                  <div className="flex items-center gap-3 p-4 bg-[#f5f0e8] border border-[#e6dfd8] rounded-lg">
                    <div className="w-16 h-16 rounded-lg overflow-hidden bg-[#efe9de] border border-[#e6dfd8] flex-shrink-0">
                      {coverImagePreview ? (
                        <img src={coverImagePreview} alt="封面预览" className="w-full h-full object-cover" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-2xl">🖼️</div>
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[#141413] text-sm truncate">{coverImageFile.name}</div>
                      <div className="text-[#8e8b82] text-xs">{formatFileSize(coverImageFile.size)}</div>
                    </div>
                    <button
                      type="button"
                      onClick={clearCoverImage}
                      className="w-7 h-7 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 transition-colors"
                      title="移除封面图"
                    >✕</button>
                  </div>
                ) : (
                  <div
                    onClick={() => coverImageInputRef.current?.click()}
                    onDragOver={(e) => { e.preventDefault(); setCoverImageDragOver(true); }}
                    onDragLeave={() => setCoverImageDragOver(false)}
                    onDrop={handleCoverImageDrop}
                    className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors ${
                      coverImageDragOver ? "border-[#cc785c] bg-[#cc785c]/4" : "border-[#e6dfd8] hover:border-[#cc785c]"
                    }`}
                  >
                    <div className="text-3xl mb-1">🖼️</div>
                    <div className="text-[#8e8b82] text-sm">点击或拖拽上传封面图</div>
                    <div className="text-[#8e8b82] text-xs mt-0.5">支持 PNG、JPG，最大 2MB</div>
                  </div>
                )}
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e6dfd8] bg-[#f5f0e8]">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] text-sm rounded-lg hover:bg-[#efe9de] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
              >
                {editingPlugin ? "保存修改" : "创建插件"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation */}
      {showDeleteConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setShowDeleteConfirm(null)}
        >
          <div
            className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#c64545]/12 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#c64545]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L4.082 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-[#141413] text-base font-medium mb-2">确认删除</h3>
              <p className="text-[#6c6a64] text-sm">
                确定要删除插件「{showDeleteConfirm.name}」吗？此操作不可撤销。
              </p>
            </div>
            <div className="flex border-t border-[#e6dfd8]">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 py-3 text-[#6c6a64] text-sm hover:bg-[#f5f0e8] transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="flex-1 py-3 text-[#c64545] text-sm border-l border-[#e6dfd8] hover:bg-[#c64545]/6 transition-colors"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm animate-slide-up ${
              toast.type === "success"
                ? "bg-[#181715] text-[#faf9f5]"
                : "bg-[#c64545] text-white"
            }`}
          >
            {toast.type === "success" ? "✅ " : "❌ "}
            {toast.message}
          </div>
        ))}
      </div>

      <style jsx global>{`
        @keyframes slide-up {
          from { opacity: 0; transform: translateY(12px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-slide-up {
          animation: slide-up 0.3s ease-out;
        }
      `}</style>
  </AdminLayout>
  );
}
