"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";
import AdminLayout from "@/components/ui/admin-layout";

interface UserData {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
  createdAt: string;
  lastActiveAt: string;
}

function toCamelUser(obj: Record<string, unknown>): UserData {
  return {
    id: obj.id as string,
    name: obj.name as string,
    nickname: (obj.nickname as string) || "",
    email: (obj.email as string) || "",
    phone: (obj.phone as string) || "",
    role: obj.role as UserData["role"],
    status: obj.status as UserData["status"],
    createdAt: (obj.created_at as string) || "",
    lastActiveAt: (obj.last_active_at as string) || "",
  };
}

type RoleFilter = "全部" | "admin" | "editor" | "guest";
type StatusFilter = "全部" | "active" | "disabled";

const ROLE_OPTIONS: { label: string; value: RoleFilter }[] = [
  { label: "全部角色", value: "全部" },
  { label: "管理员", value: "admin" },
  { label: "编辑", value: "editor" },
  { label: "访客", value: "guest" },
];

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "全部状态", value: "全部" },
  { label: "正常", value: "active" },
  { label: "已禁用", value: "disabled" },
];

const ROLE_MAP: Record<UserData["role"], { label: string; className: string; description: string }> = {
  admin: { label: "管理员", className: "bg-[#e8a55a]/12 text-[#d4a017]", description: "拥有全部权限，可管理用户、插件和系统设置" },
  editor: { label: "编辑", className: "bg-[#5db8a6]/12 text-[#5db8a6]", description: "可创建和编辑插件，管理自己的内容" },
  guest: { label: "访客", className: "bg-[#8e8b82]/12 text-[#6c6a64]", description: "仅可浏览和下载插件，无编辑权限" },
};

const STATUS_MAP: Record<UserData["status"], { label: string; className: string }> = {
  active: { label: "正常", className: "bg-[#5db872]/12 text-[#5db872]" },
  disabled: { label: "已禁用", className: "bg-[#c64545]/12 text-[#c64545]" },
};

const ROLE_AVATAR_COLORS: Record<UserData["role"], string> = {
  admin: "bg-[#cc785c]",
  editor: "bg-[#5db8a6]",
  guest: "bg-[#8e8b82]",
};

const ITEMS_PER_PAGE = 8;

type ModalType = "add" | "edit" | "delete" | "resetPassword" | null;

function generatePassword(): string {
  const chars = "ABCDEFGHJKMNPQRSTWXYZabcdefhijkmnprstwxyz2345678";
  let pwd = "";
  for (let i = 0; i < 10; i++) {
    pwd += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return pwd;
}

export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [roleFilter, setRoleFilter] = useState<RoleFilter>("全部");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("全部");
  const [currentPage, setCurrentPage] = useState(1);
  const [userList, setUserList] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedUser, setSelectedUser] = useState<UserData | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalUser, setModalUser] = useState<UserData | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [resetPasswordValue, setResetPasswordValue] = useState("");

  const [formData, setFormData] = useState({
    name: "",
    nickname: "",
    email: "",
    phone: "",
    role: "guest" as UserData["role"],
    password: "",
  });

  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchUsers = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await apiGet<Record<string, unknown>[]>("/api/users");
      setUserList(data.map(toCamelUser));
    } catch (e) {
      setError(e instanceof Error ? e.message : "加载用户列表失败");
      addToast("加载用户列表失败", "error");
    } finally {
      setLoading(false);
    }
  }, [addToast]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchUsers();
  }, [fetchUsers]);

  const filteredUsers = useMemo(() => {
    let result = userList;
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (u) => u.name.toLowerCase().includes(q) || u.email.toLowerCase().includes(q)
      );
    }
    if (roleFilter !== "全部") {
      result = result.filter((u) => u.role === roleFilter);
    }
    if (statusFilter !== "全部") {
      result = result.filter((u) => u.status === statusFilter);
    }
    return result;
  }, [userList, search, roleFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredUsers.length / ITEMS_PER_PAGE));
  const pagedUsers = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return filteredUsers.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredUsers, currentPage]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  const stats = useMemo(() => {
    return {
      total: userList.length,
      active: userList.filter((u) => u.status === "active").length,
      admins: userList.filter((u) => u.role === "admin").length,
      disabled: userList.filter((u) => u.status === "disabled").length,
    };
  }, [userList]);

  const toggleSelectAll = () => {
    if (selectedIds.size === pagedUsers.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(pagedUsers.map((u) => u.id)));
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

  const handleSelectUser = (user: UserData) => {
    setSelectedUser(user);
    setDetailOpen(true);
  };

  const handleCloseDetail = () => {
    setDetailOpen(false);
    setSelectedUser(null);
  };

  const handleToggleStatus = useCallback(
    async (user: UserData) => {
      const newStatus = user.status === "active" ? "disabled" : "active";
      try {
        await apiPut(`/api/users/${user.id}`, { status: newStatus });
        setUserList((prev) =>
          prev.map((u) => (u.id === user.id ? { ...u, status: newStatus as UserData["status"] } : u))
        );
        if (selectedUser?.id === user.id) {
          setSelectedUser((prev) =>
            prev ? { ...prev, status: newStatus as UserData["status"] } : null
          );
        }
        addToast(`用户「${user.name}」已${newStatus === "disabled" ? "禁用" : "启用"}`, "success");
      } catch (e) {
        addToast(e instanceof Error ? e.message : "操作失败", "error");
      }
    },
    [addToast, selectedUser]
  );

  const handleDelete = useCallback(
    async (user: UserData) => {
      try {
        await apiDelete(`/api/users/${user.id}`);
        setUserList((prev) => prev.filter((u) => u.id !== user.id));
        setSelectedIds((prev) => {
          const next = new Set(prev);
          next.delete(user.id);
          return next;
        });
        if (selectedUser?.id === user.id) {
          setDetailOpen(false);
          setSelectedUser(null);
        }
        setModalType(null);
        addToast(`用户「${user.name}」已删除`, "success");
      } catch (e) {
        addToast(e instanceof Error ? e.message : "删除失败", "error");
      }
    },
    [addToast, selectedUser]
  );

  const handleBatchDelete = async () => {
    const ids = Array.from(selectedIds);
    const names = userList
      .filter((u) => selectedIds.has(u.id))
      .map((u) => u.name)
      .join("、");

    let failed = 0;
    for (const id of ids) {
      try {
        await apiDelete(`/api/users/${id}`);
      } catch {
        failed++;
      }
    }

    setUserList((prev) => prev.filter((u) => !selectedIds.has(u.id)));
    if (selectedUser && selectedIds.has(selectedUser.id)) {
      setDetailOpen(false);
      setSelectedUser(null);
    }
    setSelectedIds(new Set());

    if (failed > 0) {
      addToast(`已删除 ${ids.length - failed} 个用户，${failed} 个失败`, "error");
    } else {
      addToast(`已批量删除 ${names}`, "success");
    }
  };

  const handleBatchDisable = async () => {
    const ids = Array.from(selectedIds);
    let failed = 0;
    for (const id of ids) {
      try {
        await apiPut(`/api/users/${id}`, { status: "disabled" });
      } catch {
        failed++;
      }
    }

    setUserList((prev) =>
      prev.map((u) => (selectedIds.has(u.id) ? { ...u, status: "disabled" as const } : u))
    );
    if (selectedUser && selectedIds.has(selectedUser.id)) {
      setSelectedUser((prev) => (prev ? { ...prev, status: "disabled" as const } : null));
    }
    setSelectedIds(new Set());

    if (failed > 0) {
      addToast(`已禁用 ${ids.length - failed} 个用户，${failed} 个失败`, "error");
    } else {
      addToast("已批量禁用所选用户", "success");
    }
  };

  const openAddModal = () => {
    setModalUser(null);
    setFormData({ name: "", nickname: "", email: "", phone: "", role: "guest", password: generatePassword() });
    setModalType("add");
  };

  const openEditModal = (user: UserData) => {
    setModalUser(user);
    setFormData({
      name: user.name,
      nickname: user.nickname,
      email: user.email,
      phone: user.phone,
      role: user.role,
      password: "",
    });
    setModalType("edit");
  };

  const openDeleteConfirm = (user: UserData) => {
    setModalUser(user);
    setModalType("delete");
  };

  const openResetPasswordModal = (user: UserData) => {
    setModalUser(user);
    setResetPasswordValue(generatePassword());
    setModalType("resetPassword");
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      addToast("用户名不能为空", "error");
      return;
    }
    if (!formData.email.trim()) {
      addToast("邮箱不能为空", "error");
      return;
    }

    try {
      if (modalType === "edit" && modalUser) {
        await apiPut(`/api/users/${modalUser.id}`, {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
        });
        setUserList((prev) =>
          prev.map((u) =>
            u.id === modalUser.id
              ? {
                  ...u,
                  name: formData.name.trim(),
                  email: formData.email.trim(),
                  phone: formData.phone.trim(),
                  role: formData.role,
                }
              : u
          )
        );
        if (selectedUser?.id === modalUser.id) {
          setSelectedUser((prev) =>
            prev
              ? {
                  ...prev,
                  name: formData.name.trim(),
                  email: formData.email.trim(),
                  phone: formData.phone.trim(),
                  role: formData.role,
                }
              : null
          );
        }
        addToast(`用户「${formData.name.trim()}」已更新`, "success");
      } else {
        await apiPost("/api/users", {
          name: formData.name.trim(),
          email: formData.email.trim(),
          phone: formData.phone.trim(),
          role: formData.role,
          password: formData.password,
        });
        await fetchUsers();
        addToast(`用户「${formData.name.trim()}」已创建`, "success");
      }
      setModalType(null);
    } catch (e) {
      addToast(e instanceof Error ? e.message : "操作失败", "error");
    }
  };

  const handleResetPassword = async () => {
    if (!modalUser) return;
    try {
      await apiPost(`/api/users/${modalUser.id}/reset-password`, {
        password: resetPasswordValue,
      });
      addToast(`已为用户「${modalUser.name}」重置密码，新密码：${resetPasswordValue}`, "success");
    } catch (e) {
      addToast(e instanceof Error ? e.message : "重置密码失败", "error");
    }
    setModalType(null);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (modalType) setModalType(null);
        else if (detailOpen) {
          setDetailOpen(false);
          setSelectedUser(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalType, detailOpen]);

  return (
    <>
      <AdminLayout title="用户管理">
        <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-8 space-y-4 lg:space-y-6 overflow-hidden">
          {/* Stats */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-5 flex-shrink-0">
            {[
              { label: "用户总数", value: stats.total, icon: "👥", color: "text-[#cc785c]" },
              { label: "活跃用户", value: stats.active, icon: "✅", color: "text-[#5db872]" },
              { label: "管理员", value: stats.admins, icon: "🛡️", color: "text-[#5db8a6]" },
              { label: "已禁用", value: stats.disabled, icon: "🚫", color: "text-[#c64545]" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="bg-[#efe9de] rounded-xl p-5 hover:shadow-sm transition-shadow"
              >
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
          <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
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
                placeholder="搜索用户名或邮箱…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-10 pr-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
              />
            </div>

            <select
              value={roleFilter}
              onChange={(e) => { setRoleFilter(e.target.value as RoleFilter); setCurrentPage(1); }}
              className="px-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none pr-8 bg-no-repeat"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                backgroundPosition: "right 12px center",
              }}
            >
              {ROLE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
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

            <button
              onClick={openAddModal}
              className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors flex items-center gap-1.5"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path d="M12 4v16m8-8H4" />
              </svg>
              新增用户
            </button>
          </div>

          {/* Batch actions */}
          {selectedIds.size > 0 && (
            <div className="flex items-center gap-3 px-4 py-3 bg-[#252320] rounded-lg text-sm flex-shrink-0">
              <span className="text-[#faf9f5]">已选择 {selectedIds.size} 项</span>
              <button
                onClick={handleBatchDisable}
                className="px-3 py-1.5 bg-[#d4a017] text-white rounded-md hover:opacity-90 transition-opacity text-xs"
              >
                批量禁用
              </button>
              <button
                onClick={handleBatchDelete}
                className="px-3 py-1.5 bg-[#c64545] text-white rounded-md hover:opacity-90 transition-opacity text-xs"
              >
                批量删除
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="ml-auto px-3 py-1.5 text-[#a09d96] hover:text-[#faf9f5] transition-colors text-xs"
              >
                取消选择
              </button>
            </div>
          )}

          {/* Content: split layout */}
          <div className="flex-1 flex min-h-0 gap-0">
            {/* Left: user table */}
            <div className={`flex-1 flex flex-col min-w-0 transition-all duration-300`}>
              <div className="flex-1 overflow-auto bg-[#faf9f5] border border-[#e6dfd8] rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8] sticky top-0 z-10">
                        <th className="px-4 py-3 text-left w-10">
                          <input
                            type="checkbox"
                            checked={selectedIds.size === pagedUsers.length && pagedUsers.length > 0}
                            onChange={toggleSelectAll}
                            className="w-4 h-4 rounded accent-[#cc785c] cursor-pointer"
                          />
                        </th>
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">用户</th>
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">角色</th>
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">状态</th>
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium hidden lg:table-cell">注册时间</th>
                        <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium">操作</th>
                      </tr>
                    </thead>
                    <tbody>
                      {loading && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                            加载中…
                          </td>
                        </tr>
                      )}

                      {!loading && error && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-[#c64545] text-sm">
                            <div className="flex flex-col items-center gap-2">
                              <span>{error}</span>
                              <button onClick={fetchUsers} className="text-[#cc785c] hover:underline text-xs">重试</button>
                            </div>
                          </td>
                        </tr>
                      )}

                      {!loading && !error && pagedUsers.map((user) => (
                        <tr
                          key={user.id}
                          onClick={() => handleSelectUser(user)}
                          className={`border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors cursor-pointer ${
                            selectedUser?.id === user.id && detailOpen ? "bg-[#f5f0e8]" : ""
                          }`}
                        >
                          <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="checkbox"
                              checked={selectedIds.has(user.id)}
                              onChange={() => toggleSelect(user.id)}
                              className="w-4 h-4 rounded accent-[#cc785c] cursor-pointer"
                            />
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <div className={`w-9 h-9 rounded-full ${ROLE_AVATAR_COLORS[user.role]} flex items-center justify-center flex-shrink-0`}>
                                <span className="text-white text-sm font-medium">{user.name.charAt(0)}</span>
                              </div>
                              <div className="min-w-0">
                                <div className="text-[#141413] text-sm font-medium truncate max-w-[140px]">{user.name}</div>
                                <div className="text-[#8e8b82] text-xs truncate max-w-[180px] hidden sm:block">{user.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${ROLE_MAP[user.role].className}`}>
                              {ROLE_MAP[user.role].label}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${STATUS_MAP[user.status].className}`}>
                              {STATUS_MAP[user.status].label}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm hidden lg:table-cell">{user.createdAt}</td>
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-end gap-1" onClick={(e) => e.stopPropagation()}>
                              <button
                                onClick={() => openEditModal(user)}
                                className="px-2 py-1.5 text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-md transition-colors text-xs"
                              >
                                编辑
                              </button>
                              <button
                                onClick={() => handleToggleStatus(user)}
                                className={`px-2 py-1.5 rounded-md transition-colors text-xs ${
                                  user.status === "active"
                                    ? "text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8"
                                    : "text-[#5db872] hover:text-[#5db872] hover:bg-[#5db872]/8"
                                }`}
                              >
                                {user.status === "active" ? "禁用" : "启用"}
                              </button>
                              <button
                                onClick={() => openDeleteConfirm(user)}
                                className="px-2 py-1.5 text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors text-xs"
                              >
                                删除
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                      {!loading && !error && pagedUsers.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                            没有找到匹配的用户
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              <div className="flex items-center justify-between pt-4 flex-shrink-0">
                <span className="text-sm text-[#6c6a64]">
                  共 {filteredUsers.length} 个用户，第 {currentPage} / {totalPages} 页
                </span>
                {totalPages > 1 && (
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
                )}
              </div>
            </div>

            {/* Right: detail panel - side panel on desktop, overlay on mobile */}
            <div
              className={`overflow-hidden transition-all duration-300 ease-in-out flex-shrink-0 lg:relative ${
                detailOpen && selectedUser
                  ? "fixed inset-0 z-40 lg:static lg:w-80 xl:w-96 lg:ml-5 lg:border lg:border-[#e6dfd8] lg:rounded-xl"
                  : "w-0 ml-0 border-0"
              }`}
            >
              {detailOpen && selectedUser && (
                <>
                  {/* Mobile overlay backdrop */}
                  <div className="absolute inset-0 bg-[#141413]/30 lg:hidden" onClick={handleCloseDetail} />
                  <div className="relative h-full flex flex-col bg-[#faf9f5] lg:bg-[#faf9f5]">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-[#e6dfd8] flex-shrink-0">
                    <h2
                      className="text-[#141413] tracking-tight"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 400 }}
                    >
                      用户详情
                    </h2>
                    <button
                      onClick={handleCloseDetail}
                      className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  <div className="flex-1 overflow-auto p-5 space-y-5">
                    {/* Avatar & Name */}
                    <div className="flex flex-col items-center text-center">
                      <div className={`w-16 h-16 rounded-full ${ROLE_AVATAR_COLORS[selectedUser.role]} flex items-center justify-center mb-3`}>
                        <span className="text-white text-2xl font-medium">{selectedUser.name.charAt(0)}</span>
                      </div>
                      <h3
                        className="text-[#141413] tracking-tight"
                        style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "24px", fontWeight: 400 }}
                      >
                        {selectedUser.name}
                      </h3>
                      <span className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium mt-2 ${ROLE_MAP[selectedUser.role].className}`}>
                        {ROLE_MAP[selectedUser.role].label}
                      </span>
                    </div>

                    {/* Info cards */}
                    <div className="space-y-3">
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">邮箱</div>
                        <div className="text-sm text-[#3d3d3a]">{selectedUser.email}</div>
                      </div>
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">手机号</div>
                        <div className="text-sm text-[#3d3d3a]">{selectedUser.phone}</div>
                      </div>
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">角色权限</div>
                        <div className="text-sm text-[#3d3d3a]">{ROLE_MAP[selectedUser.role].description}</div>
                      </div>
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">账户状态</div>
                        <div className="flex items-center gap-2">
                          <span className={`inline-block w-2 h-2 rounded-full ${selectedUser.status === "active" ? "bg-[#5db872]" : "bg-[#c64545]"}`} />
                          <span className="text-sm text-[#3d3d3a]">{STATUS_MAP[selectedUser.status].label}</span>
                        </div>
                      </div>
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">注册时间</div>
                        <div className="text-sm text-[#3d3d3a]">{selectedUser.createdAt}</div>
                      </div>
                      <div className="bg-[#f5f0e8] rounded-lg p-3">
                        <div className="text-xs text-[#8e8b82] mb-0.5">最近活跃</div>
                        <div className="text-sm text-[#3d3d3a]">{selectedUser.lastActiveAt}</div>
                      </div>
                    </div>

                    {/* Quick actions */}
                    <div className="space-y-2 pt-2 border-t border-[#e6dfd8]">
                      <button
                        onClick={() => openEditModal(selectedUser)}
                        className="w-full py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
                      >
                        编辑用户
                      </button>
                      <button
                        onClick={() => handleToggleStatus(selectedUser)}
                        className={`w-full py-2.5 text-sm rounded-lg border transition-colors ${
                          selectedUser.status === "active"
                            ? "border-[#c64545] text-[#c64545] hover:bg-[#c64545]/8"
                            : "border-[#5db872] text-[#5db872] hover:bg-[#5db872]/8"
                        }`}
                      >
                        {selectedUser.status === "active" ? "禁用用户" : "启用用户"}
                      </button>
                      <button
                        onClick={() => openResetPasswordModal(selectedUser)}
                        className="w-full py-2.5 border border-[#e6dfd8] text-[#3d3d3a] text-sm rounded-lg hover:bg-[#efe9de] transition-colors"
                      >
                        重置密码
                      </button>
                    </div>
                    </div>
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </AdminLayout>

      {/* Modal: Add/Edit User */}
      {(modalType === "add" || modalType === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setModalType(null)}
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
                {modalType === "add" ? "新增用户" : "编辑用户"}
              </h2>
              <button
                onClick={() => setModalType(null)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="px-6 py-5 space-y-4">
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">
                  用户名 <span className="text-[#c64545]">*</span>
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData((f) => ({ ...f, name: e.target.value }))}
                  placeholder="输入用户名"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">
                  邮箱 <span className="text-[#c64545]">*</span>
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData((f) => ({ ...f, email: e.target.value }))}
                  placeholder="输入邮箱"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">手机号</label>
                <input
                  type="text"
                  value={formData.phone}
                  onChange={(e) => setFormData((f) => ({ ...f, phone: e.target.value }))}
                  placeholder="输入手机号"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">角色</label>
                <select
                  value={formData.role}
                  onChange={(e) => setFormData((f) => ({ ...f, role: e.target.value as UserData["role"] }))}
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none bg-no-repeat"
                  style={{
                    backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                    backgroundPosition: "right 12px center",
                  }}
                >
                  <option value="admin">管理员</option>
                  <option value="editor">编辑</option>
                  <option value="guest">访客</option>
                </select>
              </div>
              {modalType === "add" && (
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">初始密码</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={formData.password}
                      onChange={(e) => setFormData((f) => ({ ...f, password: e.target.value }))}
                      className="flex-1 px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 font-mono"
                      readOnly
                    />
                    <button
                      onClick={() => setFormData((f) => ({ ...f, password: generatePassword() }))}
                      className="px-3 py-2.5 border border-[#e6dfd8] text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors flex-shrink-0"
                    >
                      重新生成
                    </button>
                  </div>
                  <p className="text-xs text-[#8e8b82] mt-1.5">系统自动生成的初始密码，用户首次登录后可修改</p>
                </div>
              )}
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e6dfd8] bg-[#faf9f5]">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
              >
                取消
              </button>
              <button
                onClick={handleSave}
                className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
              >
                {modalType === "add" ? "创建用户" : "保存修改"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm */}
      {modalType === "delete" && modalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setModalType(null)}
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
              <h3
                className="text-[#141413] tracking-tight mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 400 }}
              >
                确认删除
              </h3>
              <p className="text-[#6c6a64] text-sm mb-6">
                确定要删除用户「{modalUser.name}」吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={() => handleDelete(modalUser)}
                  className="flex-1 py-2.5 bg-[#c64545] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                >
                  确认删除
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Reset Password */}
      {modalType === "resetPassword" && modalUser && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#e8a55a]/12 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#d4a017]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                </svg>
              </div>
              <h3
                className="text-[#141413] tracking-tight mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "20px", fontWeight: 400 }}
              >
                重置密码
              </h3>
              <p className="text-[#6c6a64] text-sm mb-4">
                确定要为用户「{modalUser.name}」重置密码吗？重置后用户将收到一个新的随机密码。
              </p>
              <div className="bg-[#f5f0e8] rounded-lg p-3 mb-5">
                <div className="text-xs text-[#8e8b82] mb-1">新密码</div>
                <div className="flex items-center gap-2">
                  <span className="text-[#141413] text-sm font-mono tracking-wide">{resetPasswordValue}</span>
                  <button
                    onClick={() => setResetPasswordValue(generatePassword())}
                    className="text-xs text-[#cc785c] hover:text-[#a9583e] transition-colors flex-shrink-0"
                  >
                    换一个
                  </button>
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
                >
                  取消
                </button>
                <button
                  onClick={handleResetPassword}
                  className="flex-1 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
                >
                  确认重置
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast container */}
      {toasts.length > 0 && (
        <div className="fixed bottom-6 right-6 z-[100] space-y-2">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className={`px-4 py-3 rounded-lg shadow-lg text-sm transition-all duration-300 animate-in slide-in-from-right ${
                toast.type === "success"
                  ? "bg-[#181715] text-[#faf9f5]"
                  : "bg-[#c64545] text-white"
              }`}
            >
              {toast.type === "success" ? (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-[#5db872] flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M5 13l4 4L19 7" />
                  </svg>
                  {toast.message}
                </span>
              ) : (
                <span className="flex items-center gap-2">
                  <svg className="w-4 h-4 text-white flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {toast.message}
                </span>
              )}
            </div>
          ))}
        </div>
      )}
    </>
  );
}