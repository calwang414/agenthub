"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/lib/auth-context";
import PersonalCenterPopover from "@/components/ui/personal-center-popover";

export default function NavLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoggedIn, isEditor, logout } = useAuth();
  const pathname = usePathname();

  return (
    <div className="min-h-screen bg-[#faf9f5] flex flex-col">
      <nav className="sticky top-0 z-50 h-16 flex items-center justify-between px-8 bg-[#181715] flex-shrink-0">
        <div className="flex items-center gap-6">
          <Link href="/marketplace" className="flex items-center gap-3 group">
            <div className="w-8 h-8 rounded-lg bg-[#cc785c] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span
              className="text-[#faf9f5] tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
            >
              AgentHub
            </span>
          </Link>
          <Link
            href="/marketplace"
            className="text-[#a09d96] hover:text-[#faf9f5] transition-colors text-sm"
            style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
          >
            AI 插件市场
          </Link>
        </div>

        <div className="flex items-center gap-4">
          {isLoggedIn ? (
            <PersonalCenterPopover showAdmin={!!isEditor} onLogout={logout}>
              <div className="flex items-center gap-2 cursor-pointer">
                <div className="w-8 h-8 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium">
                  {user?.name?.charAt(0) ?? "?"}
                </div>
                <span
                  className="text-[#faf9f5] text-sm hidden sm:inline"
                  style={{ fontFamily: "Inter, sans-serif" }}
                >
                  {user?.name}
                </span>
              </div>
            </PersonalCenterPopover>
          ) : (
            <>
              <Link
                href="/login"
                className="text-[#a09d96] hover:text-[#faf9f5] transition-colors text-sm"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
              >
                登录
              </Link>
              <Link
                href="/register"
                className="px-5 py-2 bg-[#cc785c] text-white rounded-lg hover:bg-[#a9583e] transition-colors text-sm"
                style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
              >
                注册
              </Link>
            </>
          )}
        </div>
      </nav>

      <main className="flex-1">{children}</main>

      <footer className="bg-[#181715]" style={{ padding: "64px 32px" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-8 h-8 rounded-lg bg-[#cc785c] flex items-center justify-center text-white font-bold text-sm">
              A
            </div>
            <span
              className="text-[#faf9f5] tracking-tight"
              style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px" }}
            >
              AgentHub
            </span>
          </div>
          <div
              className="mt-8 pt-8 border-t border-[#252320] text-[#6c6a64] text-xs text-center"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            © 2026 AgentHub. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
