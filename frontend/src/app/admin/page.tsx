"use client";

import Link from "next/link";
import AdminLayout from "@/components/ui/admin-layout";

export default function AdminDashboardPage() {
  return (
    <AdminLayout title="仪表盘">
      <div className="flex-1 p-8 space-y-6 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {[
            { label: "插件总数", value: 12, icon: "🔌" },
            { label: "已上架", value: 9, icon: "✅" },
            { label: "总下载量", value: "15.4w", icon: "⬇️" },
            { label: "待审核", value: 2, icon: "⏳" },
          ].map((stat) => (
            <div key={stat.label} className="bg-[#efe9de] rounded-xl p-5">
              <div className="flex items-center justify-between">
                <span className="text-2xl">{stat.icon}</span>
                <span
                  className="text-3xl tracking-tight tabular-nums text-[#cc785c]"
                  style={{ fontFamily: "'Cormorant Garamond', serif", fontWeight: 400 }}
                >
                  {stat.value}
                </span>
              </div>
              <div className="text-[#6c6a64] text-sm mt-2">{stat.label}</div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-[#efe9de] rounded-xl p-6">
            <h3 className="text-[#141413] text-base font-medium mb-4">最近活动</h3>
            <div className="space-y-3">
              {[
                "智能代码审查 v2.1.0 已更新",
                "PPT 自动生成器 提交审核",
                "语音转文字 Skill 下载量突破 3w",
                "新增 MCP 分类上线",
              ].map((item, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-[#3d3d3a]">
                  <div className="w-2 h-2 rounded-full bg-[#cc785c] flex-shrink-0" />
                  {item}
                </div>
              ))}
            </div>
          </div>
          <div className="bg-[#efe9de] rounded-xl p-6">
            <h3 className="text-[#141413] text-base font-medium mb-4">快捷操作</h3>
            <div className="space-y-2">
              <Link
                href="/admin/plugins"
                prefetch={false}
                className="block w-full px-4 py-3 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] hover:bg-[#f5f0e8] transition-colors text-center"
              >
                🔌 管理插件
              </Link>
              <Link
                href="/admin/categories"
                prefetch={false}
                className="block w-full px-4 py-3 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] hover:bg-[#f5f0e8] transition-colors text-center"
              >
                📂 管理分类
              </Link>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  );
}
