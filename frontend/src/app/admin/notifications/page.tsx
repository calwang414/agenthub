"use client";

import dynamic from "next/dynamic";
import { useState, useMemo, useCallback, useEffect, useRef } from "react";

const CherryMarkdownEditor = dynamic(
  () => import("@/components/cherry-markdown-editor"),
  { ssr: false }
);
import AdminLayout from "@/components/ui/admin-layout";
import type { Announcement, NotificationRecord } from "@/lib/types";
import { apiGet, apiPost, apiPut, apiDelete } from "@/lib/api-client";

type ActiveTab = "announcements" | "notifications";
type StatusFilter = "全部" | "active" | "disabled";
type TargetType = "all" | "byRole";
type RoleOption = "admin" | "editor" | "guest";

function stripMarkdownText(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|.*\|/g, "")
    .replace(/^>/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function truncateText(text: string, maxLen: number): string {
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "\u2026";
}

const STATUS_OPTIONS: { label: string; value: StatusFilter }[] = [
  { label: "全部状态", value: "全部" },
  { label: "已启用", value: "active" },
  { label: "已禁用", value: "disabled" },
];

const ROLE_OPTIONS: { label: string; value: RoleOption }[] = [
  { label: "管理员", value: "admin" },
  { label: "编辑", value: "editor" },
  { label: "访客", value: "guest" },
];

const PRIORITY_MAP: Record<Announcement["priority"], { label: string; className: string }> = {
  pinned: { label: "置顶", className: "bg-[#cc785c]/12 text-[#cc785c]" },
  normal: { label: "普通", className: "bg-[#8e8b82]/12 text-[#6c6a64]" },
};

const NOTIFY_STATUS_MAP: Record<NotificationRecord["status"], { label: string; className: string }> = {
  sent: { label: "已发送", className: "bg-[#5db872]/12 text-[#5db872]" },
  failed: { label: "失败", className: "bg-[#c64545]/12 text-[#c64545]" },
};

const ITEMS_PER_PAGE = 6;

type ModalType = "add" | "edit" | "delete" | null;

export default function AdminNotificationsPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>("announcements");

  const [announcementSearch, setAnnouncementSearch] = useState("");
  const [announcementStatusFilter, setAnnouncementStatusFilter] = useState<StatusFilter>("全部");
  const [announcementPage, setAnnouncementPage] = useState(1);
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);

  const [modalType, setModalType] = useState<ModalType>(null);
  const [modalAnnouncement, setModalAnnouncement] = useState<Announcement | null>(null);
  const [formTitle, setFormTitle] = useState("");
  const [formContent, setFormContent] = useState("");
  const [formPriority, setFormPriority] = useState<Announcement["priority"]>("normal");
  const [formLinkUrl, setFormLinkUrl] = useState("");
  const [formIsDismissible, setFormIsDismissible] = useState(true);
  const [formPublishEnabled, setFormPublishEnabled] = useState(false);
  const [formPublishAt, setFormPublishAt] = useState("");
  const [formExpireEnabled, setFormExpireEnabled] = useState(false);
  const [formExpireAt, setFormExpireAt] = useState("");

  const [notificationContent, setNotificationContent] = useState("");
  const [notificationTargetType, setNotificationTargetType] = useState<TargetType>("all");
  const [notificationTargetRoles, setNotificationTargetRoles] = useState<Set<RoleOption>>(new Set(["admin", "editor", "guest"]));
  const [notificationRecords, setNotificationRecords] = useState<NotificationRecord[]>([]);

  const [recordSearch, setRecordSearch] = useState("");
  const [recordPage, setRecordPage] = useState(1);

  const [toasts, setToasts] = useState<{ id: number; message: string; type: "success" | "error" }[]>([]);
  const [showSendConfirm, setShowSendConfirm] = useState(false);

  const toastIdRef = useRef(0);

  const addToast = useCallback((message: string, type: "success" | "error" = "success") => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3000);
  }, []);

  const fetchAnnouncements = useCallback(async () => {
    try {
      const data = await apiGet<Announcement[]>("/api/announcements");
      setAnnouncements(data);
    } catch {
      addToast("加载公告数据失败", "error");
    }
  }, [addToast]);

  const fetchNotificationRecords = useCallback(async () => {
    try {
      const data = await apiGet<NotificationRecord[]>("/api/notification-records");
      setNotificationRecords(data);
    } catch {
      addToast("加载通知记录失败", "error");
    }
  }, [addToast]);

  useEffect(() => {
    fetchAnnouncements();
    fetchNotificationRecords();
  }, [fetchAnnouncements, fetchNotificationRecords]);

  const [debouncedAnnouncementSearch, setDebouncedAnnouncementSearch] = useState("");
  const [debouncedRecordSearch, setDebouncedRecordSearch] = useState("");

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedAnnouncementSearch(announcementSearch);
      setAnnouncementPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [announcementSearch]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedRecordSearch(recordSearch);
      setRecordPage(1);
    }, 300);
    return () => clearTimeout(timer);
  }, [recordSearch]);

  const filteredAnnouncements = useMemo(() => {
    let result = announcements;
    if (debouncedAnnouncementSearch.trim()) {
      const q = debouncedAnnouncementSearch.toLowerCase();
      result = result.filter((a) => a.title.toLowerCase().includes(q));
    }
    if (announcementStatusFilter === "active") {
      result = result.filter((a) => a.isActive);
    } else if (announcementStatusFilter === "disabled") {
      result = result.filter((a) => !a.isActive);
    }
    return result.sort((a, b) => {
      if (a.priority === "pinned" && b.priority !== "pinned") return -1;
      if (a.priority !== "pinned" && b.priority === "pinned") return 1;
      return 0;
    });
  }, [announcements, debouncedAnnouncementSearch, announcementStatusFilter]);

  const announcementTotalPages = Math.max(1, Math.ceil(filteredAnnouncements.length / ITEMS_PER_PAGE));
  const pagedAnnouncements = useMemo(() => {
    const start = (announcementPage - 1) * ITEMS_PER_PAGE;
    return filteredAnnouncements.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredAnnouncements, announcementPage]);

  useEffect(() => {
    if (announcementPage > announcementTotalPages) setAnnouncementPage(announcementTotalPages);
  }, [announcementTotalPages, announcementPage]);

  const filteredRecords = useMemo(() => {
    let result = notificationRecords;
    if (debouncedRecordSearch.trim()) {
      const q = debouncedRecordSearch.toLowerCase();
      result = result.filter((r) => {
        return stripMarkdownText(r.content).toLowerCase().includes(q);
      });
    }
    return result;
  }, [notificationRecords, debouncedRecordSearch]);

  const recordTotalPages = Math.max(1, Math.ceil(filteredRecords.length / ITEMS_PER_PAGE));
  const pagedRecords = useMemo(() => {
    const start = (recordPage - 1) * ITEMS_PER_PAGE;
    return filteredRecords.slice(start, start + ITEMS_PER_PAGE);
  }, [filteredRecords, recordPage]);

  useEffect(() => {
    if (recordPage > recordTotalPages) setRecordPage(recordTotalPages);
  }, [recordTotalPages, recordPage]);

  const openAddModal = () => {
    setModalAnnouncement(null);
    setFormTitle("");
    setFormContent("");
    setFormPriority("normal");
    setFormLinkUrl("");
    setFormIsDismissible(true);
    setFormPublishEnabled(false);
    setFormPublishAt("");
    setFormExpireEnabled(false);
    setFormExpireAt("");
    setModalType("add");
  };

  const openEditModal = (a: Announcement) => {
    setModalAnnouncement(a);
    setFormTitle(a.title);
    setFormContent(a.content);
    setFormPriority(a.priority);
    setFormLinkUrl(a.linkUrl);
    setFormIsDismissible(a.isDismissible);
    setFormPublishEnabled(!!a.publishAt);
    setFormPublishAt(a.publishAt || "");
    setFormExpireEnabled(!!a.expireAt);
    setFormExpireAt(a.expireAt || "");
    setModalType("edit");
  };

  const openDeleteConfirm = (a: Announcement) => {
    setModalAnnouncement(a);
    setModalType("delete");
  };

  const handleSaveAnnouncement = async () => {
    if (!formTitle.trim()) {
      addToast("公告标题不能为空", "error");
      return;
    }

    try {
      if (modalType === "edit" && modalAnnouncement) {
        await apiPut(`/api/announcements/${modalAnnouncement.id}`, {
          title: formTitle.trim(),
          content: formContent,
          priority: formPriority,
          linkUrl: formLinkUrl.trim(),
          isDismissible: formIsDismissible,
          publishAt: formPublishEnabled ? formPublishAt : null,
          expireAt: formExpireEnabled ? formExpireAt : null,
        });
        addToast(`公告「${formTitle.trim()}」已更新`, "success");
      } else {
        await apiPost("/api/announcements", {
          title: formTitle.trim(),
          content: formContent,
          priority: formPriority,
          linkUrl: formLinkUrl.trim(),
          isDismissible: formIsDismissible,
          isActive: true,
          publishAt: formPublishEnabled ? formPublishAt : null,
          expireAt: formExpireEnabled ? formExpireAt : null,
        });
        addToast(`公告「${formTitle.trim()}」已创建`, "success");
      }
      fetchAnnouncements();
    } catch (e) {
      addToast(`保存失败: ${String(e)}`, "error");
      return;
    }
    setModalType(null);
  };

  const handleDeleteAnnouncement = async () => {
    if (modalAnnouncement) {
      try {
        await apiDelete(`/api/announcements/${modalAnnouncement.id}`);
        setAnnouncements((prev) => prev.filter((a) => a.id !== modalAnnouncement.id));
        addToast(`公告「${modalAnnouncement.title}」已删除`, "success");
      } catch (e) {
        addToast(`删除失败: ${String(e)}`, "error");
      }
    }
    setModalType(null);
  };

  const handleToggleAnnouncement = async (a: Announcement) => {
    try {
      await apiPut(`/api/announcements/${a.id}`, { isActive: !a.isActive });
      setAnnouncements((prev) =>
        prev.map((item) =>
          item.id === a.id ? { ...item, isActive: !item.isActive } : item
        )
      );
      addToast(`公告「${a.title}」已${a.isActive ? "禁用" : "启用"}`, "success");
    } catch (e) {
      addToast(`操作失败: ${String(e)}`, "error");
    }
  };

  const handleMoveUp = (a: Announcement) => {
    setAnnouncements((prev) => {
      const idx = prev.findIndex((item) => item.id === a.id);
      if (idx <= 0) return prev;
      const updated = [...prev];
      [updated[idx - 1], updated[idx]] = [updated[idx], updated[idx - 1]];
      return updated;
    });
  };

  const handleMoveDown = (a: Announcement) => {
    setAnnouncements((prev) => {
      const idx = prev.findIndex((item) => item.id === a.id);
      if (idx < 0 || idx >= prev.length - 1) return prev;
      const updated = [...prev];
      [updated[idx], updated[idx + 1]] = [updated[idx + 1], updated[idx]];
      return updated;
    });
  };

  const toggleNotifyRole = (role: RoleOption) => {
    setNotificationTargetRoles((prev) => {
      const next = new Set(prev);
      if (next.has(role)) next.delete(role);
      else next.add(role);
      return next;
    });
  };

  const handleSendNotification = () => {
    const text = stripMarkdownText(notificationContent);
    if (!text.trim()) {
      addToast("通知内容不能为空", "error");
      return;
    }
    if (notificationTargetType === "byRole" && notificationTargetRoles.size === 0) {
      addToast("请至少选择一个目标角色", "error");
      return;
    }
    setShowSendConfirm(true);
  };

  const confirmSend = async () => {
    try {
      await apiPost("/api/notification-records", {
        content: notificationContent,
        targetType: notificationTargetType,
        targetRoles: notificationTargetType === "byRole" ? Array.from(notificationTargetRoles) : [],
      });
      fetchNotificationRecords();
      setShowSendConfirm(false);
      setNotificationContent("");
      addToast("通知已成功发送", "success");
    } catch (e) {
      addToast(`发送失败: ${String(e)}`, "error");
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        if (showSendConfirm) setShowSendConfirm(false);
        else if (modalType) setModalType(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [modalType, showSendConfirm]);

  return (
    <AdminLayout title="通知公告">
        <div className="flex-1 flex flex-col min-h-0 p-4 lg:p-8 space-y-4 lg:space-y-6 overflow-hidden">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-[#f5f0e8] rounded-lg p-1 flex-shrink-0 w-fit">
            <button
              onClick={() => setActiveTab("announcements")}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === "announcements"
                  ? "bg-[#faf9f5] text-[#141413] shadow-sm"
                  : "text-[#6c6a64] hover:text-[#141413]"
              }`}
            >
              📢 公告栏管理
            </button>
            <button
              onClick={() => setActiveTab("notifications")}
              className={`px-4 py-2 rounded-md text-sm transition-colors ${
                activeTab === "notifications"
                  ? "bg-[#faf9f5] text-[#141413] shadow-sm"
                  : "text-[#6c6a64] hover:text-[#141413]"
              }`}
            >
              🔔 通知推送
            </button>
          </div>

          {/* Tab: Announcements */}
          {activeTab === "announcements" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4">
              <div className="flex items-center gap-3 flex-wrap flex-shrink-0">
                <div className="flex-1 min-w-[200px] relative">
                  <svg
                    className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]"
                    fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}
                  >
                    <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                  <input
                    type="text"
                    placeholder="搜索公告标题…"
                    value={announcementSearch}
                    onChange={(e) => { setAnnouncementSearch(e.target.value); }}
                    className="w-full pl-10 pr-4 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                  />
                </div>

                <select
                  value={announcementStatusFilter}
                  onChange={(e) => { setAnnouncementStatusFilter(e.target.value as StatusFilter); setAnnouncementPage(1); }}
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
                  新增公告
                </button>
              </div>

              <div className="flex-1 min-h-0 overflow-auto bg-[#faf9f5] border border-[#e6dfd8] rounded-xl">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8] sticky top-0 z-10">
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium w-20">优先级</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">标题</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium w-20">跳转链接</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium w-20 hidden lg:table-cell">可关闭</th>
                      <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium w-20">启用</th>
                      <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium w-36 hidden md:table-cell">发布时间</th>
                      <th className="px-4 py-3 text-right text-xs text-[#6c6a64] font-medium w-44">操作</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pagedAnnouncements.map((a) => (
                      <tr key={a.id} className="border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-1">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${PRIORITY_MAP[a.priority].className}`}>
                              {PRIORITY_MAP[a.priority].label}
                            </span>
                            <button
                              onClick={() => handleMoveUp(a)}
                              className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors text-xs"
                              title="上移"
                            >▲</button>
                            <button
                              onClick={() => handleMoveDown(a)}
                              className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors text-xs"
                              title="下移"
                            >▼</button>
                          </div>
                        </td>
                        <td className="px-4 py-3">
                          <div className="min-w-0">
                            <div className="text-[#141413] text-sm font-medium truncate max-w-[200px]">{a.title}</div>
                            <div className="text-[#8e8b82] text-xs truncate max-w-[200px] mt-0.5">
                              {truncateText(stripMarkdownText(a.content), 50)}
                            </div>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          {a.linkUrl ? (
                            <span className="text-[#cc785c] text-xs">已设置</span>
                          ) : (
                            <span className="text-[#8e8b82] text-xs">—</span>
                          )}
                        </td>
                        <td className="px-4 py-3 text-center hidden lg:table-cell">
                          <span className="text-sm">{a.isDismissible ? "是" : "否"}</span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <button
                            onClick={() => handleToggleAnnouncement(a)}
                            className={`relative w-10 h-5 rounded-full transition-colors ${a.isActive ? "bg-[#5db872]" : "bg-[#c6c2bb]"}`}
                          >
                            <span
                              className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow-sm transition-transform ${a.isActive ? "left-5" : "left-0.5"}`}
                            />
                          </button>
                        </td>
                        <td className="px-4 py-3 text-[#6c6a64] text-sm hidden md:table-cell">
                          {a.publishAt || a.createdAt}
                        </td>
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => openEditModal(a)}
                              className="px-2 py-1.5 text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-md transition-colors text-xs"
                            >编辑</button>
                            <button
                              onClick={() => handleToggleAnnouncement(a)}
                              className={`px-2 py-1.5 rounded-md transition-colors text-xs ${
                                a.isActive
                                  ? "text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8"
                                  : "text-[#5db872] hover:text-[#5db872] hover:bg-[#5db872]/8"
                              }`}
                            >{a.isActive ? "禁用" : "启用"}</button>
                            <button
                              onClick={() => openDeleteConfirm(a)}
                              className="px-2 py-1.5 text-[#8e8b82] hover:text-[#c64545] hover:bg-[#c64545]/8 rounded-md transition-colors text-xs"
                            >删除</button>
                          </div>
                        </td>
                      </tr>
                    ))}
                    {pagedAnnouncements.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                          没有找到匹配的公告
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center justify-between flex-shrink-0">
                <span className="text-sm text-[#6c6a64]">
                  共 {filteredAnnouncements.length} 条公告，第 {announcementPage} / {announcementTotalPages} 页
                </span>
                {announcementTotalPages > 1 && (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => setAnnouncementPage((p) => Math.max(1, p - 1))}
                      disabled={announcementPage === 1}
                      className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >上一页</button>
                    {Array.from({ length: announcementTotalPages }, (_, i) => i + 1).map((page) => (
                      <button
                        key={page}
                        onClick={() => setAnnouncementPage(page)}
                        className={`w-9 h-9 rounded-lg text-sm transition-colors ${
                          page === announcementPage ? "bg-[#cc785c] text-white" : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de]"
                        }`}
                      >{page}</button>
                    ))}
                    <button
                      onClick={() => setAnnouncementPage((p) => Math.min(announcementTotalPages, p + 1))}
                      disabled={announcementPage === announcementTotalPages}
                      className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
                    >下一页</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tab: Notifications */}
          {activeTab === "notifications" && (
            <div className="flex-1 flex flex-col min-h-0 space-y-4 overflow-auto">
              <div className="bg-[#efe9de] rounded-xl p-5 space-y-4 flex-shrink-0">
                <h2
                  className="text-[#141413] tracking-tight"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 400 }}
                  >发送新通知</h2>
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">通知内容</label>
                  <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
                    <CherryMarkdownEditor
                      value={notificationContent}
                      onChange={setNotificationContent}
                      placeholder="输入通知内容，支持 Markdown 格式…"
                      height="250px"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-2">推送目标</label>
                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="targetType" checked={notificationTargetType === "all"} onChange={() => setNotificationTargetType("all")} className="accent-[#cc785c]" />
                      <span className="text-sm text-[#3d3d3a]">全部用户</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" name="targetType" checked={notificationTargetType === "byRole"} onChange={() => setNotificationTargetType("byRole")} className="accent-[#cc785c]" />
                      <span className="text-sm text-[#3d3d3a]">按角色筛选</span>
                    </label>
                  </div>
                  {notificationTargetType === "byRole" && (
                    <div className="flex items-center gap-3 mt-2 ml-6">
                      {ROLE_OPTIONS.map((role) => (
                        <label key={role.value} className="flex items-center gap-1.5 cursor-pointer">
                          <input type="checkbox" checked={notificationTargetRoles.has(role.value)} onChange={() => toggleNotifyRole(role.value)} className="accent-[#cc785c] rounded" />
                          <span className="text-sm text-[#3d3d3a]">{role.label}</span>
                        </label>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex justify-end">
                  <button onClick={handleSendNotification} className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors">
                    发送通知
                  </button>
                </div>
              </div>

              <div className="flex-1 flex flex-col min-h-0 space-y-3">
                <div className="flex items-center justify-between flex-shrink-0">
                  <h2
                    className="text-[#141413] tracking-tight"
                    style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 400 }}
                  >发送记录</h2>
                  <div className="relative w-56">
                    <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8e8b82]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="搜索通知内容…"
                      value={recordSearch}
                      onChange={(e) => { setRecordSearch(e.target.value); }}
                      className="w-full pl-9 pr-3 py-2 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                    />
                  </div>
                </div>

                <div className="flex-1 min-h-0 overflow-auto bg-[#faf9f5] border border-[#e6dfd8] rounded-xl">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[#e6dfd8] bg-[#f5f0e8] sticky top-0 z-10">
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium">内容摘要</th>
                        <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium w-28">推送目标</th>
                        <th className="px-4 py-3 text-left text-xs text-[#6c6a64] font-medium w-40">发送时间</th>
                        <th className="px-4 py-3 text-center text-xs text-[#6c6a64] font-medium w-20">状态</th>
                      </tr>
                    </thead>
                    <tbody>
                      {pagedRecords.map((r) => (
                        <tr key={r.id} className="border-b border-[#ebe6df] hover:bg-[#f5f0e8] transition-colors">
                          <td className="px-4 py-3">
                            <div className="text-[#141413] text-sm max-w-[300px] truncate">
                              {truncateText(stripMarkdownText(r.content), 60)}
                            </div>
                          </td>
                          <td className="px-4 py-3 text-center">
                            <span className="text-[#3d3d3a] text-sm">
                              {r.targetType === "all"
                                ? "全部用户"
                                : r.targetRoles.map((role) => {
                                    const found = ROLE_OPTIONS.find((o) => o.value === role);
                                    return found ? found.label : role;
                                  }).join("、")}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-[#6c6a64] text-sm">{r.sentAt}</td>
                          <td className="px-4 py-3 text-center">
                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${NOTIFY_STATUS_MAP[r.status].className}`}>
                              {NOTIFY_STATUS_MAP[r.status].label}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {pagedRecords.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-4 py-12 text-center text-[#8e8b82] text-sm">
                            {recordSearch ? "没有找到匹配的发送记录" : "暂无发送记录"}
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="flex items-center justify-between flex-shrink-0">
                  <span className="text-sm text-[#6c6a64]">
                    共 {filteredRecords.length} 条记录，第 {recordPage} / {recordTotalPages} 页
                  </span>
                  {recordTotalPages > 1 && (
                    <div className="flex items-center gap-1">
                      <button onClick={() => setRecordPage((p) => Math.max(1, p - 1))} disabled={recordPage === 1}
                        className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">上一页</button>
                      {Array.from({ length: recordTotalPages }, (_, i) => i + 1).map((page) => (
                        <button key={page} onClick={() => setRecordPage(page)}
                          className={`w-9 h-9 rounded-lg text-sm transition-colors ${page === recordPage ? "bg-[#cc785c] text-white" : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de]"}`}
                        >{page}</button>
                      ))}
                      <button onClick={() => setRecordPage((p) => Math.min(recordTotalPages, p + 1))} disabled={recordPage === recordTotalPages}
                        className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed">下一页</button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

      {/* Modal: Add/Edit Announcement */}
      {(modalType === "add" || modalType === "edit") && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setModalType(null)}
        >
          <div
            className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-xl mx-4 max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#e6dfd8]">
              <h2
                className="text-[#141413] tracking-tight"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                {modalType === "add" ? "新增公告" : "编辑公告"}
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
            <div className="px-6 py-5 space-y-4 max-h-[75vh] overflow-y-auto">
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">
                  标题 <span className="text-[#c64545]">*</span>
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="输入公告标题"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">内容</label>
                <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
                  <CherryMarkdownEditor
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="输入公告内容，支持 Markdown 格式…"
                    height="300px"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">跳转链接</label>
                <input
                  type="url"
                  value={formLinkUrl}
                  onChange={(e) => setFormLinkUrl(e.target.value)}
                  placeholder="https://example.com/page（可选）"
                  className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15"
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">优先级</label>
                  <select
                    value={formPriority}
                    onChange={(e) => setFormPriority(e.target.value as Announcement["priority"])}
                    className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] cursor-pointer appearance-none bg-no-repeat"
                    style={{
                      backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%236c6a64' stroke-width='2'%3E%3Cpath d='M6 9l6 6 6-6'/%3E%3C/svg%3E")`,
                      backgroundPosition: "right 12px center",
                    }}
                  >
                    <option value="pinned">置顶</option>
                    <option value="normal">普通</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">允许用户关闭</label>
                  <div className="flex items-center gap-3 h-10">
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={formIsDismissible} onChange={() => setFormIsDismissible(true)} className="accent-[#cc785c]" />
                      <span className="text-sm text-[#3d3d3a]">是</span>
                    </label>
                    <label className="flex items-center gap-2 cursor-pointer">
                      <input type="radio" checked={!formIsDismissible} onChange={() => setFormIsDismissible(false)} className="accent-[#cc785c]" />
                      <span className="text-sm text-[#3d3d3a]">否</span>
                    </label>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formPublishEnabled}
                      onChange={(e) => setFormPublishEnabled(e.target.checked)}
                      className="accent-[#cc785c] rounded"
                    />
                    <span className="text-sm text-[#3d3d3a]">定时发布</span>
                  </label>
                  {formPublishEnabled && (
                    <input
                      type="datetime-local"
                      value={formPublishAt}
                      onChange={(e) => setFormPublishAt(e.target.value)}
                      className="mt-2 w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                    />
                  )}
                </div>
                <div>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={formExpireEnabled}
                      onChange={(e) => setFormExpireEnabled(e.target.checked)}
                      className="accent-[#cc785c] rounded"
                    />
                    <span className="text-sm text-[#3d3d3a]">定时下架</span>
                  </label>
                  {formExpireEnabled && (
                    <input
                      type="datetime-local"
                      value={formExpireAt}
                      onChange={(e) => setFormExpireAt(e.target.value)}
                      className="mt-2 w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 transition-all"
                    />
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 px-6 py-4 border-t border-[#e6dfd8] bg-[#faf9f5]">
              <button
                onClick={() => setModalType(null)}
                className="px-5 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
              >取消</button>
              <button
                onClick={handleSaveAnnouncement}
                className="px-5 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
              >{modalType === "add" ? "创建公告" : "保存修改"}</button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delete Confirm */}
      {modalType === "delete" && modalAnnouncement && (
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
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >确认删除</h3>
              <p className="text-[#6c6a64] text-sm mb-6">
                确定要删除公告「{modalAnnouncement.title}」吗？此操作不可撤销。
              </p>
              <div className="flex gap-3">
                <button
                  onClick={() => setModalType(null)}
                  className="flex-1 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
                >取消</button>
                <button
                  onClick={handleDeleteAnnouncement}
                  className="flex-1 py-2.5 bg-[#c64545] text-white text-sm rounded-lg hover:opacity-90 transition-opacity"
                >确认删除</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Send Confirm */}
      {showSendConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-[#141413]/30 backdrop-blur-sm"
          onClick={() => setShowSendConfirm(false)}
        >
          <div
            className="bg-[#faf9f5] rounded-xl shadow-2xl w-full max-w-sm mx-4 overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="px-6 py-5 text-center">
              <div className="w-12 h-12 rounded-full bg-[#cc785c]/12 flex items-center justify-center mx-auto mb-4">
                <svg className="w-6 h-6 text-[#cc785c]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
                </svg>
              </div>
              <h3
                className="text-[#141413] tracking-tight mb-2"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >确认发送</h3>
              <p className="text-[#6c6a64] text-sm mb-2">
                确定要向{notificationTargetType === "all" ? "全部用户" : Array.from(notificationTargetRoles).map((r) => ROLE_OPTIONS.find((o) => o.value === r)?.label).join("、")}发送此通知吗？
              </p>
              <div className="bg-[#f5f0e8] rounded-lg p-3 mb-5 text-left max-h-20 overflow-y-auto">
                <div className="text-xs text-[#8e8b82] mb-1">通知内容预览</div>
                <div className="text-sm text-[#3d3d3a]">
                  {truncateText(stripMarkdownText(notificationContent), 100)}
                </div>
              </div>
              <div className="flex gap-3">
                <button
                  onClick={() => setShowSendConfirm(false)}
                  className="flex-1 py-2.5 border border-[#e6dfd8] text-sm text-[#3d3d3a] rounded-lg hover:bg-[#efe9de] transition-colors"
                >取消</button>
                <button
                  onClick={confirmSend}
                  className="flex-1 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
                >确认发送</button>
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
              className={`px-4 py-3 rounded-lg shadow-lg text-sm transition-all duration-300 ${
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
    </AdminLayout>
  );
}