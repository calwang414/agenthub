"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import type { Tag } from "@/lib/mock/tags";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import AdminLayout from "@/components/ui/admin-layout";

type ViewMode = "table" | "card";
type StatusFilter = "全部" | "enabled" | "disabled";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "全部", value: "全部" },
  { label: "已启用", value: "enabled" },
  { label: "已禁用", value: "disabled" },
];

const STATUS_MAP: Record<Tag["status"], { label: string; className: string }> = {
  enabled: { label: "已启用", className: "bg-[#5db872]/12 text-[#5db872]" },
  disabled: { label: "已禁用", className: "bg-[#8e8b82]/12 text-[#8e8b82]" },
};

const COLOR_OPTIONS = [
  { label: "珊瑚", value: "#cc785c" },
  { label: "青绿", value: "#5db8a6" },
  { label: "琥珀", value: "#e8a55a" },
  { label: "蓝色", value: "#5b8bd4" },
  { label: "紫色", value: "#9b7ec4" },
  { label: "绿色", value: "#5db872" },
  { label: "粉色", value: "#d47a9a" },
  { label: "橙色", value: "#e09b5e" },
  { label: "靛蓝", value: "#6c7db8" },
  { label: "玫红", value: "#c47a6a" },
  { label: "灰蓝", value: "#7c8a9a" },
  { label: "草绿", value: "#8aab5e" },
];

const ICON_OPTIONS = ["⚡", "🔍", "💬", "🔄", "📈", "📄", "🚀", "🔒", "🎯", "🧩", "🔮", "💡", "🌟", "🌐", "📝", "🔥"];

const ITEMS_PER_PAGE = 6;

export default function AdminTagsPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [tagList, setTagList] = useState<Tag[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Tag | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [searchDebounced, setSearchDebounced] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    color: "#cc785c",
    icon: "⚡",
    description: "",
    sortOrder: "",
  });

  const toastIdRef = useRef(0);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchTags = useCallback(async () => {
    try {
      const data = await apiGet<Tag[]>("/api/tags");
      setTagList(data);
    } catch {
      addToast("加载标签数据失败", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filteredTags = useMemo(() => {
    let result = tagList;
    if (searchDebounced.trim()) {
      const q = searchDebounced.toLowerCase();
      result = result.filter(
        (t) =>
          t.name.toLowerCase().includes(q) ||
          t.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "全部") {
      result = result.filter((t) => t.status === statusFilter);
    }
    return result;
  }, [tagList, searchDebounced, statusFilter]);

  const sortedTags = useMemo(() => {
    return [...filteredTags].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [filteredTags]);

  const totalPages = Math.max(1, Math.ceil(sortedTags.length / ITEMS_PER_PAGE));
  const pagedTags = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedTags.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedTags, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, statusFilter]);

  const handleToggleStatus = useCallback(
    async (tag: Tag) => {
      const newStatus = tag.status === "enabled" ? "disabled" : "enabled";
      try {
        await apiPut(`/api/tags/${tag.id}`, { status: newStatus });
        setTagList((prev) =>
          prev.map((t) =>
            t.id === tag.id ? { ...t, status: newStatus as Tag["status"] } : t
          )
        );
        addToast(
          `标签「${tag.name}」已${tag.status === "enabled" ? "禁用" : "启用"}`,
          "success"
        );
      } catch (e) {
        addToast(`操作失败: ${String(e)}`, "error");
      }
    },
    [addToast]
  );

  const handleMoveUp = useCallback(
    async (tag: Tag, index: number) => {
      if (index === 0) return;
      const sorted = [...tagList].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((t) => t.id === tag.id);
      if (idx <= 0) return;
      const prevItem = sorted[idx - 1];
      const tmpOrder = tag.sortOrder;
      try {
        await apiPut(`/api/tags/${tag.id}`, { sortOrder: prevItem.sortOrder });
        await apiPut(`/api/tags/${prevItem.id}`, { sortOrder: tmpOrder });
        setTagList((prev) => {
          const newList = [...prev];
          const currentItem = newList.find((t) => t.id === tag.id)!;
          const targetItem = newList.find((t) => t.id === prevItem.id)!;
          currentItem.sortOrder = prevItem.sortOrder;
          targetItem.sortOrder = tmpOrder;
          return newList;
        });
      } catch (e) {
        addToast(`排序失败: ${String(e)}`, "error");
      }
    },
    [tagList, addToast]
  );

  const handleMoveDown = useCallback(
    async (tag: Tag, index: number) => {
      const sorted = [...tagList].sort((a, b) => a.sortOrder - b.sortOrder);
      const idx = sorted.findIndex((t) => t.id === tag.id);
      if (idx < 0 || idx >= sorted.length - 1) return;
      const nextItem = sorted[idx + 1];
      const tmpOrder = tag.sortOrder;
      try {
        await apiPut(`/api/tags/${tag.id}`, { sortOrder: nextItem.sortOrder });
        await apiPut(`/api/tags/${nextItem.id}`, { sortOrder: tmpOrder });
        setTagList((prev) => {
          const newList = [...prev];
          const currentItem = newList.find((t) => t.id === tag.id)!;
          const targetItem = newList.find((t) => t.id === nextItem.id)!;
          currentItem.sortOrder = nextItem.sortOrder;
          targetItem.sortOrder = tmpOrder;
          return newList;
        });
      } catch (e) {
        addToast(`排序失败: ${String(e)}`, "error");
      }
    },
    [tagList, addToast]
  );

  const handleDelete = useCallback(
    async (tag: Tag) => {
      try {
        await apiDelete(`/api/tags/${tag.id}`);
        setTagList((prev) => prev.filter((t) => t.id !== tag.id));
        setShowDeleteConfirm(null);
        addToast(`标签「${tag.name}」已删除`, "success");
      } catch (e) {
        addToast(`删除失败: ${String(e)}`, "error");
      }
    },
    [addToast]
  );

  const openAddModal = () => {
    setEditingTag(null);
    setFormData({ name: "", color: "#cc785c", icon: "⚡", description: "", sortOrder: String(tagList.length + 1) });
    setShowModal(true);
  };

  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setFormData({
      name: tag.name,
      color: tag.color,
      icon: tag.icon,
      description: tag.description,
      sortOrder: String(tag.sortOrder),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("标签名称不能为空", "error");
      return;
    }
    if (!formData.icon.trim()) {
      addToast("请选择标签图标", "error");
      return;
    }
    const sortOrder = parseInt(formData.sortOrder, 10);
    if (isNaN(sortOrder) || sortOrder < 1) {
      addToast("排序权重必须为正整数", "error");
      return;
    }

    try {
      if (editingTag) {
        await apiPut(`/api/tags/${editingTag.id}`, {
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon.trim(),
          description: formData.description.trim(),
          sortOrder,
        });
        addToast(`标签「${formData.name.trim()}」已更新`, "success");
      } else {
        await apiPost("/api/tags", {
          name: formData.name.trim(),
          color: formData.color,
          icon: formData.icon.trim(),
          description: formData.description.trim(),
          sortOrder,
          status: "enabled",
        });
        addToast(`标签「${formData.name.trim()}」已创建`, "success");
      }
      fetchTags();
    } catch (e) {
      addToast(`保存失败: ${String(e)}`, "error");
      return;
    }
    setShowModal(false);
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
    <AdminLayout title="标签管理">
        <div className="flex-1 p-8 space-y-6 overflow-auto">
          {/* Toolbar */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex-1 min-w-[200px] relative">
              <svg
                className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={2}
              >
                <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              <input
                type="text"
                placeholder="搜索标签名称或描述…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
              />
            </div>

            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
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
              新增标签
            </button>
          </div>

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8]">
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">颜色</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">图标</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">标签名称</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden md:table-cell">描述</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium hidden lg:table-cell">插件数</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden lg:table-cell">创建时间</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium">排序</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium">状态</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedTags.map((tag) => {
                      const sortedIdx = sortedTags.findIndex((t) => t.id === tag.id);
                      return (
                        <tr
                          key={tag.id}
                          className="border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div
                              className="w-5 h-5 rounded"
                              style={{ backgroundColor: tag.color }}
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="w-9 h-9 rounded-lg bg-[#efe9de] flex items-center justify-center flex-shrink-0 text-lg">
                              {tag.icon}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <div className="text-[#141413] text-sm font-medium truncate max-w-[120px]">{tag.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm hidden md:table-cell max-w-[220px] truncate">
                            {tag.description}
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#cc785c]/12 text-[#cc785c]">
                              {tag.pluginCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm hidden lg:table-cell">{tag.createdAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => handleMoveUp(tag, sortedIdx)}
                                disabled={sortedIdx === 0}
                                className="w-6 h-5 flex items-center justify-center text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上移"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <span className="text-xs text-[#6c6a64] tabular-nums">{tag.sortOrder}</span>
                              <button
                                onClick={() => handleMoveDown(tag, sortedIdx)}
                                disabled={sortedIdx === sortedTags.length - 1}
                                className="w-6 h-5 flex items-center justify-center text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="下移"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M19 9l-7 7-7-7" />
                                </svg>
                              </button>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <button
                              onClick={() => handleToggleStatus(tag)}
                              className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none"
                              style={{
                                backgroundColor: tag.status === "enabled" ? "#5db872" : "#e6dfd8",
                              }}
                              title={tag.status === "enabled" ? "点击禁用" : "点击启用"}
                            >
                              <span
                                className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                  tag.status === "enabled" ? "translate-x-[18px]" : "translate-x-[4px]"
                                }`}
                              />
                            </button>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(tag)}
                                className="px-2 py-1.5 text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-md transition-colors text-xs"
                                title="编辑"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(tag)}
                                className="px-2 py-1.5 text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors text-xs"
                                title="删除"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {pagedTags.length === 0 && (
                      <tr>
                        <td colSpan={9} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                          没有找到匹配的标签
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
              {pagedTags.map((tag) => {
                const sortedIdx = sortedTags.findIndex((t) => t.id === tag.id);
                return (
                  <div
                    key={tag.id}
                    className="bg-[#efe9de] rounded-xl overflow-hidden hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div className="h-1.5" style={{ backgroundColor: tag.color }} />
                    <div className="p-5">
                      <div className="flex items-start justify-between mb-3">
                        <div className="w-12 h-12 rounded-xl bg-[#faf9f5] flex items-center justify-center text-2xl border border-[#e6dfd8]">
                          {tag.icon}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[tag.status].className}`}>
                            {STATUS_MAP[tag.status].label}
                          </span>
                          <button
                            onClick={() => handleToggleStatus(tag)}
                            className="relative inline-flex items-center h-5 w-9 rounded-full transition-colors focus:outline-none"
                            style={{
                              backgroundColor: tag.status === "enabled" ? "#5db872" : "#e6dfd8",
                            }}
                            title={tag.status === "enabled" ? "点击禁用" : "点击启用"}
                          >
                            <span
                              className={`inline-block w-3.5 h-3.5 rounded-full bg-white shadow-sm transition-transform ${
                                tag.status === "enabled" ? "translate-x-[18px]" : "translate-x-[4px]"
                              }`}
                            />
                          </button>
                        </div>
                      </div>
                      <h3 className="text-[#141413] text-base font-medium mb-1">{tag.name}</h3>
                      <p className="text-[#8e8b82] text-sm mb-3 line-clamp-2">{tag.description}</p>
                      <div className="flex items-center justify-between text-xs text-[#6c6a64] mb-3">
                        <span className="inline-flex items-center gap-1">
                          <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#cc785c]/12 text-[#cc785c]">
                            {tag.pluginCount} 插件
                          </span>
                        </span>
                        <span>排序: {tag.sortOrder}</span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-[#6c6a64] mb-3">
                        <span>{tag.createdAt}</span>
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => handleMoveUp(tag, sortedIdx)}
                            disabled={sortedIdx === 0}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#faf9f5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="上移"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M5 15l7-7 7 7" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleMoveDown(tag, sortedIdx)}
                            disabled={sortedIdx === sortedTags.length - 1}
                            className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#faf9f5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                            title="下移"
                          >
                            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                              <path d="M19 9l-7 7-7-7" />
                            </svg>
                          </button>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 pt-3 border-t border-[#e6dfd8] opacity-0 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEditModal(tag)}
                          className="flex-1 py-1.5 text-xs text-[#6c6a64] hover:text-[#141413] hover:bg-[#faf9f5] rounded-md transition-colors"
                        >
                          编辑
                        </button>
                        <button
                          onClick={() => setShowDeleteConfirm(tag)}
                          className="flex-1 py-1.5 text-xs text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors"
                        >
                          删除
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
              {pagedTags.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#8e8b82] text-sm">
                  没有找到匹配的标签
                </div>
              )}
            </div>
          )}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2">
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
              >
                ‹
              </button>
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                <button
                  key={page}
                  onClick={() => setCurrentPage(page)}
                  className={`w-9 h-9 text-sm rounded-lg transition-colors ${
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
                ›
              </button>
            </div>
          )}
        </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[12vh]">
          <div className="absolute inset-0 bg-[#141413]/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#faf9f5] rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e6dfd8]">
              <h2
                className="text-[#141413] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                {editingTag ? "编辑标签" : "新增标签"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">标签名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="输入标签名称"
                  className="w-full px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">标签颜色</label>
                <div className="grid grid-cols-6 gap-2">
                  {COLOR_OPTIONS.map((c) => (
                    <button
                      key={c.value}
                      onClick={() => setFormData((f) => ({ ...f, color: c.value }))}
                      className={`h-10 rounded-lg border-2 transition-all flex items-center justify-center ${
                        formData.color === c.value
                          ? "border-[#141413] ring-2 ring-offset-1 ring-[#cc785c]/30"
                          : "border-transparent hover:border-[#6c6a64]/30"
                      }`}
                      style={{ backgroundColor: c.value }}
                      title={c.label}
                    >
                      {formData.color === c.value && (
                        <svg className="w-4 h-4 text-white drop-shadow-sm" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">标签图标</label>
                <div className="grid grid-cols-8 gap-2 mb-2">
                  {ICON_OPTIONS.map((icon) => (
                    <button
                      key={icon}
                      onClick={() => setFormData((f) => ({ ...f, icon }))}
                      className={`w-10 h-10 flex items-center justify-center text-lg rounded-lg border transition-colors ${
                        formData.icon === icon
                          ? "border-[#cc785c] bg-[#cc785c]/8"
                          : "border-[#e6dfd8] bg-[#faf9f5] hover:border-[#cc785c]"
                      }`}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">描述</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
                  placeholder="输入标签描述"
                  rows={3}
                  className="w-full px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all resize-none"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">排序权重</label>
                <input
                  type="number"
                  value={formData.sortOrder}
                  onChange={(e) => setFormData((f) => ({ ...f, sortOrder: e.target.value }))}
                  min={1}
                  placeholder="数字越小越靠前"
                  className="w-full px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                />
              </div>
            </div>
            <div className="px-6 py-4 border-t border-[#e6dfd8] flex justify-end gap-3">
              <button
                onClick={() => setShowModal(false)}
                className="px-5 py-2.5 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
              >
                {editingTag ? "保存修改" : "创建标签"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirm Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[20vh]">
          <div className="absolute inset-0 bg-[#141413]/30" onClick={() => setShowDeleteConfirm(null)} />
          <div className="relative bg-[#faf9f5] rounded-xl shadow-xl w-full max-w-md mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e6dfd8]">
              <h2
                className="text-[#141413] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                确认删除
              </h2>
            </div>
            <div className="px-6 py-5">
              <p className="text-[#3d3d3a] text-sm">
                确定要删除标签「<span className="text-[#141413] font-medium">{showDeleteConfirm.name}</span>」吗？此操作不可撤销。
              </p>
            </div>
            <div className="px-6 py-4 border-t border-[#e6dfd8] flex justify-end gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="px-5 py-2.5 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors"
              >
                取消
              </button>
              <button
                onClick={() => handleDelete(showDeleteConfirm)}
                className="px-5 py-2.5 bg-[#c64545] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
              >
                确认删除
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toast notifications */}
      <div className="fixed top-4 right-4 z-[60] space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`px-4 py-3 rounded-lg shadow-lg text-sm transition-all ${
              toast.type === "success"
                ? "bg-[#5db872] text-white"
                : "bg-[#c64545] text-white"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
  </AdminLayout>
  );
}
