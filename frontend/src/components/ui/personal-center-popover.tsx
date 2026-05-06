"use client";

import { useState, useRef, useEffect, type ReactNode, type ChangeEvent, type FormEvent } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";

const CSS = {
  canvas: "#faf9f5",
  ink: "#141413",
  body: "#3d3d3a",
  muted: "#6c6a64",
  mutedSoft: "#8e8b82",
  hairline: "#e6dfd8",
  hairlineSoft: "#ebe6df",
  surfaceCard: "#efe9de",
  surfaceSoft: "#f5f0e8",
  surfaceDark: "#181715",
  surfaceDarkElevated: "#252320",
  primary: "#cc785c",
  primaryActive: "#a9583e",
  onPrimary: "#ffffff",
  onDark: "#faf9f5",
  onDarkSoft: "#a09d96",
  accentAmber: "#e8a55a",
  success: "#5db872",
};

const bodyFont = `'Inter', 'Rubik', -apple-system, BlinkMacSystemFont, sans-serif`;
const displayFont = `'Cormorant Garamond', 'Tiempos Headline', 'EB Garamond', Georgia, serif`;

interface FavoritePlugin {
  id: string; name: string; description: string; category: string;
  rating: number; collectedAt: string; icon: string;
}

interface DownloadedPlugin {
  id: string; name: string; description: string; category: string;
  version: string; downloadedAt: string; icon: string;
}

interface CommentItem {
  id: string; pluginId: string; pluginName: string;
  content: string; rating: number; createdAt: string;
}

interface MessageItem {
  id: string;
  title: string;
  content: string;
  type: "公告" | "通知";
  isRead: boolean;
  sentAt: string;
}

interface PersonalCenterPopoverProps {
  children: ReactNode;
  showAdmin?: boolean;
  onLogout?: () => void;
}

const mockFavorites: FavoritePlugin[] = [
  { id: "1", name: "智能代码审查", description: "基于 AI 的代码审查工具", category: "Tool", rating: 4.8, collectedAt: "2026-04-20", icon: "🔍" },
  { id: "3", name: "数据分析 Agent", description: "自动分析数据生成可视化报告", category: "Agent", rating: 4.9, collectedAt: "2026-04-18", icon: "📊" },
  { id: "6", name: "语音转文字 Skill", description: "高精度语音识别转录", category: "Skill", rating: 4.7, collectedAt: "2026-04-15", icon: "🎤" },
  { id: "10", name: "代码解释器", description: "逐行解释代码逻辑", category: "Tool", rating: 4.6, collectedAt: "2026-04-12", icon: "📖" },
  { id: "2", name: "多语言翻译助手", description: "支持 50+ 语言实时翻译", category: "Skill", rating: 4.6, collectedAt: "2026-04-10", icon: "🌐" },
  { id: "12", name: "情感分析引擎", description: "实时分析文本情感倾向", category: "Skill", rating: 4.5, collectedAt: "2026-04-05", icon: "💬" },
  { id: "4", name: "GitHub 集成 MCP", description: "连接 GitHub 管理 Issues/PR", category: "MCP", rating: 4.5, collectedAt: "2026-03-28", icon: "🔗" },
  { id: "7", name: "SQL 查询优化器", description: "分析 SQL 提供索引建议", category: "Tool", rating: 4.4, collectedAt: "2026-03-20", icon: "⚡" },
  { id: "9", name: "Slack 通知 MCP", description: "智能体输出推送 Slack", category: "MCP", rating: 4.1, collectedAt: "2026-03-15", icon: "📨" },
  { id: "6_dup", name: "语音转文字 Skill", description: "高精度语音识别", category: "Skill", rating: 4.7, collectedAt: "2026-03-10", icon: "🎤" },
  { id: "1_dup", name: "智能代码审查", description: "AI 代码审查工具", category: "Tool", rating: 4.8, collectedAt: "2026-03-05", icon: "🔍" },
];

const mockDownloads: DownloadedPlugin[] = [
  { id: "2", name: "多语言翻译助手", description: "支持 50+ 语言实时翻译", category: "Skill", version: "1.5.2", downloadedAt: "2026-04-22", icon: "🌐" },
  { id: "6", name: "语音转文字 Skill", description: "高精度语音识别转录", category: "Skill", version: "2.3.0", downloadedAt: "2026-04-18", icon: "🎤" },
  { id: "1", name: "智能代码审查", description: "基于 AI 的代码审查工具", category: "Tool", version: "2.1.0", downloadedAt: "2026-04-14", icon: "🔍" },
  { id: "10", name: "代码解释器", description: "逐行解释代码逻辑", category: "Tool", version: "2.0.1", downloadedAt: "2026-04-10", icon: "📖" },
  { id: "3", name: "数据分析 Agent", description: "自动分析生成可视化报告", category: "Agent", version: "3.0.0", downloadedAt: "2026-04-05", icon: "📊" },
  { id: "4", name: "GitHub 集成 MCP", description: "连接 GitHub 管理 Issues/PR", category: "MCP", version: "1.0.0", downloadedAt: "2026-03-30", icon: "🔗" },
  { id: "12", name: "情感分析引擎", description: "实时分析文本情感", category: "Skill", version: "3.1.0", downloadedAt: "2026-03-22", icon: "💬" },
  { id: "7", name: "SQL 查询优化器", description: "分析 SQL 提供索引建议", category: "Tool", version: "1.8.0", downloadedAt: "2026-03-15", icon: "⚡" },
];

const mockComments: CommentItem[] = [
  { id: "1", pluginId: "1", pluginName: "智能代码审查", content: "这个插件非常好用，代码审查准确率很高，帮我发现了不少潜在问题！", rating: 5, createdAt: "2026-04-25" },
  { id: "2", pluginId: "3", pluginName: "数据分析 Agent", content: "数据分析功能强大，可视化报表生成速度很快，团队用了一个月效率明显提升", rating: 5, createdAt: "2026-04-20" },
  { id: "3", pluginId: "6", pluginName: "语音转文字 Skill", content: "识别精度很高，会议记录用它完全够用，就是偶尔对专业术语识别不太准", rating: 4, createdAt: "2026-04-18" },
  { id: "4", pluginId: "2", pluginName: "多语言翻译助手", content: "日常翻译很顺手，支持的语言够多，但在技术文档翻译上还有提升空间", rating: 4, createdAt: "2026-04-15" },
  { id: "5", pluginId: "10", pluginName: "代码解释器", content: "对初学者很友好，逐行解释很清晰。希望能支持更多编程语言", rating: 4, createdAt: "2026-04-10" },
  { id: "6", pluginId: "7", pluginName: "SQL 查询优化器", content: "索引建议很实用，几次查询优化后数据库性能明显提升了", rating: 5, createdAt: "2026-04-05" },
  { id: "7", pluginId: "12", pluginName: "情感分析引擎", content: "情感识别准确率不错，中文支持很好，API 调用也很方便", rating: 4, createdAt: "2026-03-28" },
  { id: "8", pluginId: "4", pluginName: "GitHub 集成 MCP", content: "集成很方便，PR 管理省了不少时间，推荐给大家", rating: 4, createdAt: "2026-03-22" },
];

const mockMessages: MessageItem[] = [
  { id: "m1", title: "AI 插件市场正式上线", content: "尊敬的开发者，AI 智能体插件市场现已正式上线！欢迎各位开发者入驻并发布你的优秀插件。上线首月注册即享 30 天免费试用 Pro 版功能。", type: "公告", isRead: false, sentAt: "2026-04-01" },
  { id: "m2", title: "v2.5 版本发布公告", content: "平台已升级至 v2.5 版本，本次更新包含：新增插件推荐算法、优化搜索性能提升 40%、修复若干已知 Bug。", type: "公告", isRead: false, sentAt: "2026-04-20" },
  { id: "m3", title: "新插件审核规则调整", content: "自 2026 年 5 月 1 日起，所有新提交的插件需通过安全扫描后方可上架。请各位开发者确保插件代码符合安全规范。", type: "公告", isRead: true, sentAt: "2026-04-25" },
  { id: "m4", title: "五一假期服务保障通知", content: "五一劳动节期间平台将正常运营，技术支持响应时间可能略有延长，敬请谅解。", type: "公告", isRead: true, sentAt: "2026-04-28" },
  { id: "m5", title: "欢迎加入 AI 插件市场", content: "欢迎加入 AI 智能体插件市场！请完善你的开发者资料，即可开始发布插件。", type: "通知", isRead: false, sentAt: "2026-04-27" },
  { id: "m6", title: "热门插件上架提醒", content: "新的热门插件「代码审查 Agent」已上架，赶快去试试吧！点此查看详情。", type: "通知", isRead: false, sentAt: "2026-04-18" },
  { id: "m7", title: "插件审核通过", content: "尊敬的开发者，你的插件已通过审核，现已上架！用户可以在市场中搜索并下载你的插件。", type: "通知", isRead: true, sentAt: "2026-04-15" },
  { id: "m8", title: "系统维护预告", content: "平台计划于 5 月 10 日凌晨 2:00-4:00 进行系统升级维护，届时服务可能短暂中断，请提前做好准备。", type: "通知", isRead: true, sentAt: "2026-04-10" },
];

const perPage = 5;

function StarRating({ rating }: { rating: number }) {
  return (
    <div style={{ display: "flex", gap: "2px", alignItems: "center" }}>
      {[1, 2, 3, 4, 5].map((s) => (
        <span key={s} style={{ fontSize: "12px", color: s <= rating ? CSS.accentAmber : CSS.hairline, lineHeight: 1 }}>★</span>
      ))}
    </div>
  );
}

function Pagination({ page, total, onChange }: { page: number; total: number; onChange: (p: number) => void }) {
  if (total <= 1) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", marginTop: "12px" }}>
      <button disabled={page === 0} onClick={() => onChange(page - 1)}
        style={{ background: CSS.canvas, border: `1px solid ${CSS.hairline}`, borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: bodyFont, fontSize: "12px", color: CSS.ink, opacity: page === 0 ? 0.4 : 1 }}>
        ‹
      </button>
      <span style={{ fontFamily: bodyFont, fontSize: "12px", color: CSS.muted }}>{page + 1} / {total}</span>
      <button disabled={page >= total - 1} onClick={() => onChange(page + 1)}
        style={{ background: CSS.canvas, border: `1px solid ${CSS.hairline}`, borderRadius: "6px", width: "28px", height: "28px", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontFamily: bodyFont, fontSize: "12px", color: CSS.ink, opacity: page >= total - 1 ? 0.4 : 1 }}>
        ›
      </button>
    </div>
  );
}

export default function PersonalCenterPopover({
  children,
  showAdmin = false,
  onLogout,
}: PersonalCenterPopoverProps) {
  const { user, profile, logout: authLogout, refreshProfile } = useAuth();
  const [popoverOpen, setPopoverOpen] = useState(false);
  const [modalType, setModalType] = useState<"edit" | "favorites" | "downloads" | "comments" | "messages" | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const userInitial = profile?.name?.charAt(0) ?? "?";
  const roleLabel = profile?.role === "admin" ? "管理员" : profile?.role === "editor" ? "编辑" : "访客";
  const [editName, setEditName] = useState(profile?.name || user?.email?.split("@")[0] || "");
  const [editPassword, setEditPassword] = useState("");
  const [editConfirmPassword, setEditConfirmPassword] = useState("");
  const [toastMsg, setToastMsg] = useState("");
  const [toastVisible, setToastVisible] = useState(false);

  const [favPage, setFavPage] = useState(0);
  const [downloadPage, setDownloadPage] = useState(0);
  const [commentPage, setCommentPage] = useState(0);
  const [messagePage, setMessagePage] = useState(0);

  const favPages = Math.ceil(mockFavorites.length / perPage);
  const downloadPages = Math.ceil(mockDownloads.length / perPage);
  const commentPages = Math.ceil(mockComments.length / perPage);
  const messagePages = Math.ceil(mockMessages.length / perPage);
  const unreadCount = mockMessages.filter((m) => !m.isRead).length;

  const showToast = (msg: string) => {
    setToastMsg(msg);
    setToastVisible(true);
    setTimeout(() => setToastVisible(false), 2500);
  };

  useEffect(() => {
    if (!popoverOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setPopoverOpen(false);
      }
    }
    function handleEsc(e: KeyboardEvent) {
      if (e.key === "Escape") setPopoverOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleEsc);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleEsc);
    };
  }, [popoverOpen]);

  const openModal = (type: "edit" | "favorites" | "downloads" | "comments" | "messages") => {
    setPopoverOpen(false);
    setModalType(type);
    if (type === "edit") {
      setEditName(profile?.name || user?.email?.split("@")[0] || "");
      setEditPassword("");
      setEditConfirmPassword("");
    }
    setFavPage(0);
    setDownloadPage(0);
    setCommentPage(0);
    setMessagePage(0);
  };

  const closeModal = () => setModalType(null);

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    if (!editName.trim()) return showToast("昵称不能为空");
    if (editPassword && editPassword.length < 6) return showToast("密码至少需要 6 位字符");
    if (editPassword && editPassword !== editConfirmPassword) return showToast("两次输入的密码不一致");

    try {
      const body: Record<string, string> = { nickname: editName.trim() };
      if (editPassword) body.password = editPassword;
      const res = await fetch(`/api/users/${user?.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || "保存失败");

      await refreshProfile();

      setModalType(null);
      showToast("个人资料已更新");
    } catch {
      showToast("保存失败，请稍后重试");
    }
  };

  const handleItemClick = (type: string) => {
    if (type === "admin") {
      setPopoverOpen(false);
      return;
    }
    if (type === "logout") {
      setPopoverOpen(false);
      onLogout?.();
      return;
    }
    openModal(type as "edit" | "favorites" | "downloads" | "comments" | "messages");
  };

  const menuItems = [
    { icon: "📋", label: "编辑资料", type: "edit" as const },
    { icon: "📬", label: "消息中心", type: "messages" as const, badge: `${unreadCount}` },
    { icon: "⭐", label: "我的收藏", type: "favorites" as const, badge: `${mockFavorites.length}` },
    { icon: "📥", label: "我的下载", type: "downloads" as const, badge: `${mockDownloads.length}` },
    { icon: "💬", label: "我的评论", type: "comments" as const, badge: `${mockComments.length}` },
  ];

  const extraItems = [];
  if (showAdmin) {
    extraItems.push({ icon: "⚙️", label: "管理后台", type: "admin" as const });
  }
  if (onLogout) {
    extraItems.push({ icon: "🚪", label: "退出登录", type: "logout" as const });
  }

  const paginatedFavorites = mockFavorites.slice(favPage * perPage, (favPage + 1) * perPage);
  const paginatedDownloads = mockDownloads.slice(downloadPage * perPage, (downloadPage + 1) * perPage);
  const paginatedComments = mockComments.slice(commentPage * perPage, (commentPage + 1) * perPage);
  const paginatedMessages = mockMessages.slice(messagePage * perPage, (messagePage + 1) * perPage);

  const modalTitle = modalType === "edit" ? "编辑个人资料"
    : modalType === "messages" ? `消息中心（${unreadCount} 条未读）`
    : modalType === "favorites" ? `我的收藏（${mockFavorites.length}）`
    : modalType === "downloads" ? `已下载插件（${mockDownloads.length}）`
    : modalType === "comments" ? `我的评论（${mockComments.length}）`
    : "";

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600&family=Inter:wght@400;500;600&display=swap');

        @keyframes pc-popover-in {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes pc-modal-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes pc-modal-slide {
          from { opacity: 0; transform: translate(-50%, -48%); }
          to { opacity: 1; transform: translate(-50%, -50%); }
        }
      `}</style>

      <div ref={containerRef} style={{ position: "relative", display: "inline-flex" }}>
        <span onClick={() => setPopoverOpen(!popoverOpen)} style={{ cursor: "pointer" }}>
          {children}
        </span>

        {popoverOpen && (
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "absolute", top: "calc(100% + 8px)", right: 0,
              background: CSS.canvas, borderRadius: "12px",
              boxShadow: "0 8px 40px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06)",
              border: `1px solid ${CSS.hairline}`, minWidth: "220px", zIndex: 1000,
              animation: "pc-popover-in 0.12s ease", overflow: "hidden",
            }}
          >
            <div style={{
              padding: "14px 16px 12px", borderBottom: `1px solid ${CSS.hairline}`,
              display: "flex", alignItems: "center", gap: "10px",
            }}>
              <div style={{
                width: "36px", height: "36px", borderRadius: "50%",
                backgroundColor: CSS.primary, color: CSS.onPrimary,
                display: "flex", alignItems: "center", justifyContent: "center",
                fontFamily: displayFont, fontSize: "16px", fontWeight: 500, flexShrink: 0,
              }}>
                {userInitial}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontFamily: bodyFont, fontSize: "14px", fontWeight: 600, color: CSS.ink, lineHeight: 1.3 }}>
                  {profile?.name || user?.email?.split("@")[0]}
                </div>
                <div style={{
                  fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, lineHeight: 1.4,
                  whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis",
                }}>
                  @{profile?.name || user?.email?.split("@")[0]} · {roleLabel}
                </div>
              </div>
            </div>

            <div style={{ padding: "4px" }}>
              {menuItems.map((item) => (
                <button
                  key={item.type}
                  onClick={() => handleItemClick(item.type)}
                  style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
                    fontFamily: bodyFont, fontSize: "13px", color: CSS.ink,
                    background: "none", border: "none", textAlign: "left" as const, width: "100%",
                    transition: "background 0.1s",
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = CSS.surfaceSoft; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                >
                  <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                  <span style={{ flex: 1 }}>{item.label}</span>
                  {item.badge && Number(item.badge) > 0 && (
                    <span style={{
                      backgroundColor: item.type === "messages" ? CSS.primary : CSS.surfaceCard,
                      color: item.type === "messages" ? CSS.onPrimary : CSS.muted,
                      borderRadius: "9999px", padding: "1px 7px",
                      fontSize: "11px", fontWeight: 500, fontFamily: bodyFont,
                    }}>{item.badge}</span>
                  )}
                </button>
              ))}
              {extraItems.length > 0 && (
                <div style={{ borderTop: `1px solid ${CSS.hairlineSoft}`, margin: "2px 4px" }} />
              )}
              {extraItems.map((item) => (
                item.type === "admin" ? (
                  <Link
                    key={item.type}
                    href="/admin"
                    prefetch={false}
                    onClick={() => setPopoverOpen(false)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
                      fontFamily: bodyFont, fontSize: "13px", color: CSS.ink,
                      background: "none", border: "none", textAlign: "left" as const, width: "100%",
                      textDecoration: "none", transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = CSS.surfaceSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </Link>
                ) : (
                  <button
                    key={item.type}
                    onClick={() => handleItemClick(item.type)}
                    style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      padding: "9px 12px", borderRadius: "8px", cursor: "pointer",
                      fontFamily: bodyFont, fontSize: "13px", color: CSS.ink,
                      background: "none", border: "none", textAlign: "left" as const, width: "100%",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = CSS.surfaceSoft; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; }}
                  >
                    <span style={{ fontSize: "14px", width: "18px", textAlign: "center", flexShrink: 0 }}>{item.icon}</span>
                    <span style={{ flex: 1 }}>{item.label}</span>
                  </button>
                )
              ))}
            </div>
          </div>
        )}
      </div>

      {modalType && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 5000,
          animation: "pc-modal-in 0.15s ease",
        }}>
          <div onClick={closeModal} style={{
            position: "absolute", inset: 0,
            background: "rgba(20,20,19,0.5)", backdropFilter: "blur(2px)",
          }} />
          <div style={{
            position: "absolute", top: "50%", left: "50%",
            transform: "translate(-50%, -50%)",
            background: CSS.canvas, borderRadius: "12px",
            width: "90%", maxWidth: modalType === "edit" ? "400px" : modalType === "messages" ? "600px" : "560px",
            maxHeight: "80vh", overflow: "auto",
            boxShadow: "0 8px 40px rgba(0,0,0,0.15)",
            animation: "pc-modal-slide 0.15s ease",
          }}>
            <div style={{
              display: "flex", justifyContent: "space-between", alignItems: "center",
              padding: "16px 20px", borderBottom: `1px solid ${CSS.hairline}`,
              position: "sticky", top: 0, background: CSS.canvas, zIndex: 1,
              borderTopLeftRadius: "12px", borderTopRightRadius: "12px",
            }}>
              <h3 style={{
                margin: 0, fontSize: "18px", fontWeight: 400,
                fontFamily: displayFont, color: CSS.ink, letterSpacing: "-0.3px",
              }}>{modalTitle}</h3>
              <button onClick={closeModal} style={{
                background: "none", border: "none", fontSize: "18px",
                color: CSS.muted, cursor: "pointer", padding: "2px 6px",
                borderRadius: "4px", lineHeight: 1, outline: "none",
              }}>✕</button>
            </div>

            <div style={{ padding: modalType === "edit" ? "20px" : "0" }}>
              {modalType === "edit" && (
                <form onSubmit={handleSaveProfile} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "16px", paddingBottom: "14px", borderBottom: `1px solid ${CSS.hairlineSoft}` }}>
                    <div style={{
                      width: "52px", height: "52px", borderRadius: "50%",
                      backgroundColor: CSS.primary, color: CSS.onPrimary,
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: displayFont, fontSize: "22px", fontWeight: 500, flexShrink: 0,
                    }}>
                      {userInitial}
                    </div>
                    <div>
                      <div style={{ fontFamily: displayFont, fontSize: "18px", fontWeight: 400, color: CSS.ink, letterSpacing: "-0.3px" }}>{profile?.name || user?.email?.split("@")[0]}</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "12px", color: CSS.mutedSoft, marginTop: "2px" }}>
                        @{profile?.name || user?.email?.split("@")[0]} · {user?.email} · {roleLabel} · {user?.created_at ? new Date(user.created_at).toLocaleDateString("zh-CN") : ""} 加入
                      </div>
                    </div>
                  </div>

                  <div>
                    <label style={{ display: "block", fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.ink, marginBottom: "4px" }}>昵称</label>
                    <input value={editName} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                      placeholder="输入昵称"
                      style={{ width: "100%", height: "36px", background: CSS.canvas, border: `1px solid ${CSS.hairline}`, borderRadius: "8px", padding: "8px 12px", fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, outline: "none" }} />
                  </div>

                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>用户名</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, fontWeight: 500 }}>{profile?.name || user?.email?.split("@")[0]}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>邮箱</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, fontWeight: 500 }}>{user?.email}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>手机号</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, fontWeight: 500 }}>{profile?.phone || "未设置"}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>角色</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, fontWeight: 500 }}>{roleLabel}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>注册时间</div>
                      <div style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, fontWeight: 500 }}>{user?.created_at ? new Date(user.created_at).toLocaleDateString("zh-CN") : ""}</div>
                    </div>
                    <div style={{ padding: "8px 12px", background: CSS.surfaceSoft, borderRadius: "8px" }}>
                      <div style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, marginBottom: "2px" }}>账号状态</div>
                      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                        <span style={{ width: "7px", height: "7px", borderRadius: "50%", backgroundColor: CSS.success }} />
                        <span style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.success, fontWeight: 500 }}>正常</span>
                      </div>
                    </div>
                  </div>

                  <div style={{ borderTop: `1px solid ${CSS.hairlineSoft}`, paddingTop: "4px" }} />
                  <div>
                    <label style={{ display: "block", fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.ink, marginBottom: "4px" }}>新密码</label>
                    <input type="password" value={editPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditPassword(e.target.value)}
                      placeholder="留空则不修改密码"
                      style={{ width: "100%", height: "36px", background: CSS.canvas, border: `1px solid ${CSS.hairline}`, borderRadius: "8px", padding: "8px 12px", fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, outline: "none" }} />
                  </div>
                  <div>
                    <label style={{ display: "block", fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.ink, marginBottom: "4px" }}>确认新密码</label>
                    <input type="password" value={editConfirmPassword} onChange={(e: ChangeEvent<HTMLInputElement>) => setEditConfirmPassword(e.target.value)}
                      placeholder="再次输入新密码"
                      style={{ width: "100%", height: "36px", background: CSS.canvas, border: `1px solid ${CSS.hairline}`, borderRadius: "8px", padding: "8px 12px", fontFamily: bodyFont, fontSize: "13px", color: CSS.ink, outline: "none" }} />
                  </div>
                  <div style={{ display: "flex", gap: "8px", justifyContent: "flex-end", marginTop: "4px" }}>
                    <button type="button" onClick={closeModal}
                      style={{ background: CSS.canvas, color: CSS.ink, border: `1px solid ${CSS.hairline}`, borderRadius: "8px", padding: "8px 16px", fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, cursor: "pointer", height: "36px" }}>
                      取消
                    </button>
                    <button type="submit"
                      style={{ background: CSS.primary, color: CSS.onPrimary, border: "none", borderRadius: "8px", padding: "8px 16px", fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, cursor: "pointer", height: "36px" }}>
                      保存修改
                    </button>
                  </div>
                </form>
              )}

              {modalType === "favorites" && (
                <>
                  {paginatedFavorites.map((f) => (
                    <div key={f.id} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 20px", borderBottom: `1px solid ${CSS.hairlineSoft}`,
                    }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: CSS.surfaceCard, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{f.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.ink }}>{f.name}</div>
                        <div style={{ fontFamily: bodyFont, fontSize: "12px", color: CSS.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{f.description}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <StarRating rating={f.rating} />
                        <span style={{ display: "inline-block", background: CSS.surfaceCard, color: CSS.muted, fontFamily: bodyFont, fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "9999px" }}>{f.category}</span>
                        <span style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, whiteSpace: "nowrap" }}>{f.collectedAt}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "8px 0" }}>
                    <Pagination page={favPage} total={favPages} onChange={setFavPage} />
                  </div>
                </>
              )}

              {modalType === "downloads" && (
                <>
                  {paginatedDownloads.map((d) => (
                    <div key={d.id} style={{
                      display: "flex", alignItems: "center", gap: "10px",
                      padding: "10px 20px", borderBottom: `1px solid ${CSS.hairlineSoft}`,
                    }}>
                      <div style={{ width: "34px", height: "34px", borderRadius: "8px", background: CSS.surfaceCard, display: "flex", alignItems: "center", justifyContent: "center", fontSize: "15px", flexShrink: 0 }}>{d.icon}</div>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.ink }}>{d.name}</div>
                        <div style={{ fontFamily: bodyFont, fontSize: "12px", color: CSS.muted, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{d.description}</div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                        <span style={{ display: "inline-block", background: CSS.surfaceCard, color: CSS.muted, fontFamily: bodyFont, fontSize: "10px", fontWeight: 500, padding: "2px 7px", borderRadius: "9999px" }}>{d.category}</span>
                        <span style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, whiteSpace: "nowrap" }}>{d.downloadedAt}</span>
                      </div>
                    </div>
                  ))}
                  <div style={{ padding: "8px 0" }}>
                    <Pagination page={downloadPage} total={downloadPages} onChange={setDownloadPage} />
                  </div>
                </>
              )}

              {modalType === "comments" && (
                <>
                  {paginatedComments.map((c) => (
                    <div key={c.id} style={{
                      padding: "10px 20px", borderBottom: `1px solid ${CSS.hairlineSoft}`,
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <span style={{ fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: CSS.primary }}>{c.pluginName}</span>
                        <span style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, whiteSpace: "nowrap" }}>{c.createdAt}</span>
                      </div>
                      <div style={{ marginBottom: "4px" }}><StarRating rating={c.rating} /></div>
                      <p style={{ fontFamily: bodyFont, fontSize: "13px", color: CSS.body, lineHeight: 1.55, margin: 0 }}>{c.content}</p>
                    </div>
                  ))}
                  <div style={{ padding: "8px 0" }}>
                    <Pagination page={commentPage} total={commentPages} onChange={setCommentPage} />
                  </div>
                </>
              )}

              {modalType === "messages" && (
                <>
                  {paginatedMessages.map((m) => (
                    <div key={m.id} style={{
                      padding: "12px 20px", borderBottom: `1px solid ${CSS.hairlineSoft}`,
                      background: m.isRead ? CSS.canvas : CSS.surfaceSoft,
                      transition: "background 0.1s",
                    }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {!m.isRead && (
                            <span style={{ width: "6px", height: "6px", borderRadius: "50%", backgroundColor: CSS.primary, flexShrink: 0 }} />
                          )}
                          <span style={{ fontFamily: bodyFont, fontSize: "13px", fontWeight: 500, color: m.isRead ? CSS.ink : CSS.ink }}>{m.title}</span>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                          <span style={{
                            display: "inline-block", fontFamily: bodyFont, fontSize: "10px", fontWeight: 500,
                            padding: "1px 6px", borderRadius: "9999px",
                            background: m.type === "公告" ? `${CSS.primary}14` : `${CSS.accentAmber}14`,
                            color: m.type === "公告" ? CSS.primary : "#a08030",
                          }}>{m.type}</span>
                          <span style={{ fontFamily: bodyFont, fontSize: "11px", color: CSS.mutedSoft, whiteSpace: "nowrap" }}>{m.sentAt}</span>
                        </div>
                      </div>
                      <p style={{ fontFamily: bodyFont, fontSize: "12px", color: CSS.muted, lineHeight: 1.5, margin: 0 }}>{m.content}</p>
                    </div>
                  ))}
                  <div style={{ padding: "8px 0" }}>
                    <Pagination page={messagePage} total={messagePages} onChange={setMessagePage} />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {toastVisible && (
        <div style={{
          position: "fixed", bottom: "32px", left: "50%",
          transform: "translateX(-50%)",
          background: CSS.surfaceDark, color: CSS.onDark,
          padding: "10px 22px", borderRadius: "8px",
          fontSize: "13px", fontFamily: bodyFont, fontWeight: 500,
          zIndex: 6000, boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
          animation: "pc-modal-in 0.3s ease",
        }}>{toastMsg}</div>
      )}
    </>
  );
}
