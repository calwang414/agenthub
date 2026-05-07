"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import AdminLayout from "@/components/ui/admin-layout";
import type { Plugin } from "@/lib/types";
import { apiGet } from "@/lib/api-client";

type LoadState = "loading" | "error" | "loaded";

function formatDownloads(n: number): string {
  if (n >= 10000) {
    const wan = n / 10000;
    return wan % 1 === 0 ? `${wan}w` : `${wan.toFixed(1)}w`;
  }
  return String(n);
}

export default function AdminDashboardPage() {
  const [plugins, setPlugins] = useState<Plugin[]>([]);
  const [loadState, setLoadState] = useState<LoadState>("loading");

  useEffect(() => {
    apiGet<Plugin[]>("/api/plugins")
      .then((data) => {
        setPlugins(data);
        setLoadState("loaded");
      })
      .catch(() => {
        setLoadState("error");
      });
  }, []);

  const totalPlugins = plugins.length;
  const publishedPlugins = plugins.filter((p) => p.status === "published").length;
  const reviewingPlugins = plugins.filter((p) => p.status === "reviewing").length;
  const totalDownloads = plugins.reduce((sum, p) => sum + (p.downloads ?? 0), 0);

  const recentActivities = [...plugins]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 5)
    .map((p) => `${p.name} ${p.version} 已更新`);

  const stats = [
    { label: "插件总数", value: loadState === "loaded" ? totalPlugins : "--", icon: "🔌" },
    { label: "已上架", value: loadState === "loaded" ? publishedPlugins : "--", icon: "✅" },
    { label: "总下载量", value: loadState === "loaded" ? formatDownloads(totalDownloads) : "--", icon: "⬇️" },
    { label: "待审核", value: loadState === "loaded" ? reviewingPlugins : "--", icon: "⏳" },
  ];

  return (
    <AdminLayout title="仪表盘">
      <div className="flex-1 p-8 space-y-6 overflow-auto">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
          {stats.map((stat) => (
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
              {loadState === "loading" && (
                <div className="text-sm text-[#8e8b82]">加载中...</div>
              )}
              {loadState === "error" && (
                <div className="text-sm text-[#8e8b82]">加载失败，请刷新重试</div>
              )}
              {loadState === "loaded" && recentActivities.length === 0 && (
                <div className="text-sm text-[#8e8b82]">暂无活动</div>
              )}
              {loadState === "loaded" &&
                recentActivities.map((item, i) => (
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
