"use client";

import { useState, useEffect, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import PersonalCenterPopover from "@/components/ui/personal-center-popover";

const ALL_NAV_ITEMS = [
  { label: "仪表盘", href: "/admin", icon: "📊", adminOnly: false },
  { label: "插件管理", href: "/admin/plugins", icon: "🔌", adminOnly: false },
  { label: "分类管理", href: "/admin/categories", icon: "📂", adminOnly: false },
  { label: "标签管理", href: "/admin/tags", icon: "📌", adminOnly: false },
  { label: "用户管理", href: "/admin/users", icon: "👥", adminOnly: true },
  { label: "通知公告", href: "/admin/notifications", icon: "📢", adminOnly: true },
];

function Unauthorized({ message }: { message: string }) {
  return (
    <div className="flex items-center justify-center h-screen bg-[#faf9f5]">
      <div className="text-center max-w-md px-6">
        <div className="text-5xl mb-4">🔒</div>
        <h2
          className="text-[#141413] mb-3"
          style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
        >
          暂无访问权限
        </h2>
        <p className="text-[#6c6a64] text-sm mb-6" style={{ fontFamily: "'Inter', sans-serif" }}>
          {message}
        </p>
        <a
          href="/marketplace"
          className="inline-block px-6 py-2.5 bg-[#cc785c] text-white rounded-lg hover:bg-[#a9583e] transition-colors text-sm"
          style={{ fontFamily: "'Inter', sans-serif", fontWeight: 500 }}
        >
          返回市场首页
        </a>
      </div>
    </div>
  );
}

export default function AdminLayout({ title, children }: { title: string; children: ReactNode }) {
  const { user, isLoggedIn, isLoading, isAdmin, logout } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

  useEffect(() => {
    if (!isLoading && !isLoggedIn) {
      router.replace(`/login?redirect=${encodeURIComponent(pathname)}`);
    }
  }, [isLoading, isLoggedIn, pathname, router]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-screen bg-[#faf9f5]">
        <div className="text-[#6c6a64] text-sm" style={{ fontFamily: "'Inter', sans-serif" }}>
          加载中...
        </div>
      </div>
    );
  }

  if (!isLoggedIn) {
    return <Unauthorized message="请先登录后再访问管理后台" />;
  }

  const currentPathNeedsAdmin = ALL_NAV_ITEMS.find((item) => item.href === pathname)?.adminOnly ?? false;
  if (currentPathNeedsAdmin && !isAdmin) {
    return <Unauthorized message="此页面仅管理员可访问，请联系管理员获取权限" />;
  }

  const filteredNavItems = isAdmin
    ? ALL_NAV_ITEMS
    : ALL_NAV_ITEMS.filter((item) => !item.adminOnly);

  const userInitial = user?.name?.charAt(0) ?? "?";

  return (
    <div className="flex h-screen overflow-hidden bg-[#faf9f5]">
      <aside
        className={`flex-shrink-0 bg-[#181715] flex flex-col transition-all duration-300 ${
          sidebarCollapsed ? "w-16" : "w-56"
        }`}
      >
        <div className="flex items-center gap-3 px-5 h-16 border-b border-[#252320]">
          <div className="w-8 h-8 rounded-lg bg-[#cc785c] flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
            A
          </div>
          {!sidebarCollapsed && (
            <span
              className="text-[#faf9f5] tracking-tight text-sm"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
            >
              AgentHub
            </span>
          )}
        </div>

        <nav className="flex-1 px-3 pt-4 space-y-1">
          {filteredNavItems.map((item) => {
            const active = pathname === item.href;
            return (
              <a
                key={item.href}
                href={item.href}
                onClick={(e) => {
                  e.preventDefault();
                  window.location.href = item.href;
                }}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-colors ${
                  active
                    ? "bg-[#252320] text-[#faf9f5]"
                    : "text-[#a09d96] hover:text-[#faf9f5] hover:bg-[#1f1e1b]"
                }`}
              >
                <span className="text-base flex-shrink-0">{item.icon}</span>
                {!sidebarCollapsed && <span>{item.label}</span>}
              </a>
            );
          })}
        </nav>

        <div className="px-3 pb-4">
          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="w-full flex items-center justify-center py-2 text-[#a09d96] hover:text-[#faf9f5] transition-colors text-sm"
          >
            {sidebarCollapsed ? "→" : "← 收起菜单"}
          </button>
        </div>

        <div className="px-3 pb-4 border-t border-[#252320] pt-3">
          {sidebarCollapsed ? (
            <div className="w-9 h-9 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium mx-auto">
              {userInitial}
            </div>
          ) : (
            <div className="flex items-center gap-3 px-2">
              <div className="w-8 h-8 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium flex-shrink-0">
                {userInitial}
              </div>
              <div className="min-w-0">
                <div className="text-[#faf9f5] text-sm truncate">{user?.name}</div>
                <div className="text-[#a09d96] text-xs truncate">{user?.email}</div>
              </div>
            </div>
          )}
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0 overflow-auto">
        <header className="h-16 bg-[#faf9f5] border-b border-[#e6dfd8] flex items-center justify-between px-8 flex-shrink-0">
          <h1
            className="text-[#141413] tracking-tight"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
          >
            {title}
          </h1>
          <div className="flex items-center gap-4">
            <PersonalCenterPopover onLogout={logout}>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-7 h-7 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0) ?? "?"}
                </div>
              </div>
            </PersonalCenterPopover>
            <a href="/marketplace" className="text-[#6c6a64] hover:text-[#141413] text-sm transition-colors">
              返回市场
            </a>
          </div>
        </header>

        {children}
      </div>
    </div>
  );
}
