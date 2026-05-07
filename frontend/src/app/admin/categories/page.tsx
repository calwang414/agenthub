"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import AdminLayout from "@/components/ui/admin-layout";

interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

type ViewMode = "table" | "card";
type StatusFilter = "全部" | "enabled" | "disabled";

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "全部", value: "全部" },
  { label: "已启用", value: "enabled" },
  { label: "已禁用", value: "disabled" },
];

const STATUS_MAP: Record<Category["status"], { label: string; className: string }> = {
  enabled: { label: "已启用", className: "bg-[#5db872]/12 text-[#5db872]" },
  disabled: { label: "已禁用", className: "bg-[#8e8b82]/12 text-[#8e8b82]" },
};

const ITEMS_PER_PAGE = 6;

export default function AdminCategoriesPage() {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [viewMode, setViewMode] = useState<ViewMode>("table");
  const [currentPage, setCurrentPage] = useState(1);
  const [categoryList, setCategoryList] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState<Category | null>(null);
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [searchDebounced, setSearchDebounced] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    icon: "📦",
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

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toISOString().slice(0, 10);
    } catch {
      return dateStr;
    }
  };

  const fetchCategories = useCallback(async () => {
    try {
      setIsLoading(true);
      const data = await apiGet<Category[]>("/api/categories");
      setCategoryList(data);
    } catch (e) {
      addToast("获取分类列表失败: " + String(e), "error");
    } finally {
      setIsLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setSearchDebounced(search);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [search]);

  const filteredCategories = useMemo(() => {
    let result = categoryList;
    if (searchDebounced.trim()) {
      const q = searchDebounced.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.description.toLowerCase().includes(q)
      );
    }
    if (statusFilter !== "全部") {
      result = result.filter((c) => c.status === statusFilter);
    }
    return result;
  }, [categoryList, searchDebounced, statusFilter]);

  const sortedCategories = useMemo(() => {
    return [...filteredCategories].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [filteredCategories]);

  const totalPages = Math.max(1, Math.ceil(sortedCategories.length / ITEMS_PER_PAGE));
  const pagedCategories = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return sortedCategories.slice(start, start + ITEMS_PER_PAGE);
  }, [sortedCategories, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchDebounced, statusFilter]);

  const handleMoveUp = useCallback(
    async (category: Category, index: number) => {
      if (index === 0) return;
      try {
        const sorted = [...categoryList].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex((c) => c.id === category.id);
        if (idx <= 0) return;
        const prevItem = sorted[idx - 1];
        await apiPut(`/api/categories/${category.id}`, { sortOrder: prevItem.sortOrder });
        await apiPut(`/api/categories/${prevItem.id}`, { sortOrder: category.sortOrder });
        fetchCategories();
      } catch (e) {
        addToast("排序失败: " + String(e), "error");
      }
    },
    [categoryList, addToast, fetchCategories]
  );

  const handleMoveDown = useCallback(
    async (category: Category, index: number) => {
      try {
        const sorted = [...categoryList].sort((a, b) => a.sortOrder - b.sortOrder);
        const idx = sorted.findIndex((c) => c.id === category.id);
        if (idx < 0 || idx >= sorted.length - 1) return;
        const nextItem = sorted[idx + 1];
        await apiPut(`/api/categories/${category.id}`, { sortOrder: nextItem.sortOrder });
        await apiPut(`/api/categories/${nextItem.id}`, { sortOrder: category.sortOrder });
        fetchCategories();
      } catch (e) {
        addToast("排序失败: " + String(e), "error");
      }
    },
    [categoryList, addToast, fetchCategories]
  );

  const handleDelete = useCallback(
    async (category: Category) => {
      try {
        await apiDelete(`/api/categories/${category.id}`);
        setShowDeleteConfirm(null);
        addToast(`分类「${category.name}」已删除`, "success");
        fetchCategories();
      } catch (e) {
        addToast("删除失败: " + String(e), "error");
      }
    },
    [addToast, fetchCategories]
  );

  const openAddModal = () => {
    setEditingCategory(null);
    setFormData({ name: "", icon: "📦", description: "", sortOrder: String(categoryList.length + 1) });
    setShowModal(true);
  };

  const openEditModal = (category: Category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name,
      icon: category.icon,
      description: category.description,
      sortOrder: String(category.sortOrder),
    });
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("分类名称不能为空", "error");
      return;
    }
    if (!formData.icon.trim()) {
      addToast("请选择分类图标", "error");
      return;
    }
    const sortOrder = parseInt(formData.sortOrder, 10);
    if (isNaN(sortOrder) || sortOrder < 1) {
      addToast("排序权重必须为正整数", "error");
      return;
    }

    try {
      if (editingCategory) {
        await apiPut<Category>(`/api/categories/${editingCategory.id}`, {
          name: formData.name.trim(),
          icon: formData.icon.trim(),
          description: formData.description.trim(),
          sortOrder,
        });
        addToast(`分类「${formData.name.trim()}」已更新`, "success");
      } else {
        await apiPost<Category>("/api/categories", {
          name: formData.name.trim(),
          icon: formData.icon.trim(),
          description: formData.description.trim(),
          sortOrder,
        });
        addToast(`分类「${formData.name.trim()}」已创建`, "success");
      }
      setShowModal(false);
      fetchCategories();
    } catch (e) {
      addToast("操作失败: " + String(e), "error");
    }
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

  const ICON_OPTIONS = ["🧩", "🤖", "🛠️", "🔗", "📦", "🎯", "⚡", "🔮", "💡", "🚀", "🎨", "📊", "🔒", "🌐", "📝", "🎵"];

  return (
    <AdminLayout title="分类管理">
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
                placeholder="搜索分类名称或描述…"
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
              新增分类
            </button>
          </div>

          {/* Table View */}
          {viewMode === "table" && (
            <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl overflow-hidden">
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8]">
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">图标</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">分类名称</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden md:table-cell">描述</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium hidden lg:table-cell">插件数</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden lg:table-cell">创建时间</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium">排序</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">状态</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {isLoading ? (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                          加载中…
                        </td>
                      </tr>
                    ) : pagedCategories.map((category) => {
                      const sortedIdx = sortedCategories.findIndex((c) => c.id === category.id);
                      return (
                        <tr
                          key={category.id}
                          className="border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors"
                        >
                          <td className="px-4 py-3">
                            <div className="w-9 h-9 rounded-lg bg-[#efe9de] flex items-center justify-center flex-shrink-0 text-lg">
                              {category.icon}
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <div className="min-w-0">
                              <div className="text-[#141413] text-sm font-medium truncate max-w-[160px]">{category.name}</div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm hidden md:table-cell max-w-[220px] truncate">
                            {category.description}
                          </td>
                          <td className="px-4 py-3 text-center hidden lg:table-cell">
                            <span className="inline-block px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#cc785c]/12 text-[#cc785c]">
                              {category.pluginCount}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm hidden lg:table-cell">{formatDate(category.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div className="flex flex-col items-center gap-0.5">
                              <button
                                onClick={() => handleMoveUp(category, sortedIdx)}
                                disabled={sortedIdx === 0}
                                className="w-6 h-5 flex items-center justify-center text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] rounded transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                                title="上移"
                              >
                                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path d="M5 15l7-7 7 7" />
                                </svg>
                              </button>
                              <span className="text-xs text-[#6c6a64] tabular-nums">{category.sortOrder}</span>
                              <button
                                onClick={() => handleMoveDown(category, sortedIdx)}
                                disabled={sortedIdx === sortedCategories.length - 1}
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
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[category.status].className}`}>
                              {STATUS_MAP[category.status].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1">
                              <button
                                onClick={() => openEditModal(category)}
                                className="px-2 py-1.5 text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-md transition-colors text-xs"
                                title="编辑"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => setShowDeleteConfirm(category)}
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
                    {!isLoading && pagedCategories.length === 0 && (
                      <tr>
                        <td colSpan={8} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                          没有找到匹配的分类
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
              {isLoading ? (
                <div className="col-span-full py-12 text-center text-[#8e8b82] text-sm">
                  加载中…
                </div>
              ) : pagedCategories.map((category) => {
                const sortedIdx = sortedCategories.findIndex((c) => c.id === category.id);
                return (
                  <div
                    key={category.id}
                    className="bg-[#efe9de] rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group"
                  >
                    <div className="flex items-start justify-between mb-3">
                      <div className="w-12 h-12 rounded-xl bg-[#faf9f5] flex items-center justify-center text-2xl border border-[#e6dfd8]">
                        {category.icon}
                      </div>
                      <div className="flex items-center gap-1">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[category.status].className}`}>
                          {STATUS_MAP[category.status].label}
                        </span>
                      </div>
                    </div>
                    <h3 className="text-[#141413] text-base font-medium mb-1">{category.name}</h3>
                    <p className="text-[#8e8b82] text-sm mb-3 line-clamp-2">{category.description}</p>
                    <div className="flex items-center justify-between text-xs text-[#6c6a64] mb-3">
                      <span className="inline-flex items-center gap-1">
                        <span className="inline-block px-2 py-0.5 rounded-full text-xs font-medium bg-[#cc785c]/12 text-[#cc785c]">
                          {category.pluginCount} 插件
                        </span>
                      </span>
                      <span>排序: {category.sortOrder}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs text-[#6c6a64] mb-3">
                      <span>{formatDate(category.createdAt)}</span>
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleMoveUp(category, sortedIdx)}
                          disabled={sortedIdx === 0}
                          className="w-6 h-6 flex items-center justify-center rounded hover:bg-[#faf9f5] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                          title="上移"
                        >
                          <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleMoveDown(category, sortedIdx)}
                          disabled={sortedIdx === sortedCategories.length - 1}
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
                        onClick={() => openEditModal(category)}
                        className="flex-1 py-1.5 text-xs text-[#6c6a64] hover:text-[#141413] hover:bg-[#faf9f5] rounded-md transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        onClick={() => setShowDeleteConfirm(category)}
                        className="flex-1 py-1.5 text-xs text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </div>
                );
              })}
              {!isLoading && pagedCategories.length === 0 && (
                <div className="col-span-full py-12 text-center text-[#8e8b82] text-sm">
                  没有找到匹配的分类
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
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]">
          <div className="absolute inset-0 bg-[#141413]/30" onClick={() => setShowModal(false)} />
          <div className="relative bg-[#faf9f5] rounded-xl shadow-xl w-full max-w-lg mx-4 overflow-hidden">
            <div className="px-6 py-5 border-b border-[#e6dfd8]">
              <h2
                className="text-[#141413] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                {editingCategory ? "编辑分类" : "新增分类"}
              </h2>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">分类名称 *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="输入分类名称"
                  className="w-full px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                />
              </div>
              <div>
                <label className="block text-sm text-[#6c6a64] mb-1.5">分类图标</label>
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
                  placeholder="输入分类描述"
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
                {editingCategory ? "保存修改" : "创建分类"}
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
                确定要删除分类「<span className="text-[#141413] font-medium">{showDeleteConfirm.name}</span>」吗？此操作不可撤销。
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
            className={`px-4 py-3 rounded-lg shadow-lg text-sm transition-all animate-in slide-in-from-right ${
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
