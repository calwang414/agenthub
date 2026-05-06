"use client";

import { useState, useMemo, useCallback, useRef, useEffect } from "react";
import Link from "next/link";
import type { Plugin } from "@/lib/mock/plugins";
import { apiGet } from "@/lib/api-client";
import type { Announcement } from "@/lib/mock/notifications";
import NavLayout from "@/components/ui/nav-layout";
import AnnouncementHero from "@/components/announcement-hero";

type CategoryFilter = "全部" | "Skill" | "Agent" | "Tool" | "MCP" | "Plugin";

const CATEGORY_OPTIONS: CategoryFilter[] = ["全部", "Skill", "Agent", "Tool", "MCP", "Plugin"];

const CATEGORY_COLORS: Record<string, string> = {
  Skill: "bg-[#5db8a6]/12 text-[#5db8a6]",
  Agent: "bg-[#cc785c]/12 text-[#cc785c]",
  Tool: "bg-[#e8a55a]/12 text-[#d4a017]",
  MCP: "bg-[#8e8b82]/12 text-[#6c6a64]",
  Plugin: "bg-[#252523]/12 text-[#252523]",
};

const CATEGORY_ICONS: Record<string, string> = {
  Skill: "🧩",
  Agent: "🤖",
  Tool: "🛠️",
  MCP: "🔗",
  Plugin: "📦",
};

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
      {stars.join("")}
      <span className="text-[#6c6a64] ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

export default function MarketplacePage() {
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("全部");
  const [currentPage, setCurrentPage] = useState(1);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastIdRef = useRef(0);
  const heroRef = useRef<HTMLDivElement>(null);

  const [allPlugins, setAllPlugins] = useState<Plugin[]>([]);
  const [allCollections, setAllCollections] = useState<{ id: string; title: string; description: string; pluginIds: string[] }[]>([]);
  const [allAnnouncements, setAllAnnouncements] = useState<Announcement[]>([]);

  useEffect(() => {
    apiGet<Plugin[]>("/api/plugins").then(setAllPlugins).catch(() => {});
    apiGet<{ id: string; title: string; description: string; pluginIds: string[] }[]>("/api/featured-collections").then(setAllCollections).catch(() => {});
    apiGet<Announcement[]>("/api/announcements").then(setAllAnnouncements).catch(() => {});
  }, []);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const publishedPlugins = useMemo(
    () => allPlugins,
    [allPlugins]
  );

  const topDownloads = useMemo(
    () =>
      [...publishedPlugins].sort((a, b) => b.downloads - a.downloads).slice(0, 10),
    [publishedPlugins]
  );

  const collectionPlugins = useMemo(() => {
    return allCollections.map((col) => ({
      ...col,
      plugins: col.pluginIds
        .map((id) => publishedPlugins.find((p) => p.id === id))
        .filter(Boolean) as Plugin[],
    }));
  }, [publishedPlugins, allCollections]);

  const displayedPlugins = useMemo(() => {
    let result = publishedPlugins;

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

    return result;
  }, [publishedPlugins, search, categoryFilter]);

  const ITEMS_PER_PAGE = 9;
  const totalPages = Math.max(1, Math.ceil(displayedPlugins.length / ITEMS_PER_PAGE));
  const pagedPlugins = useMemo(() => {
    const start = (currentPage - 1) * ITEMS_PER_PAGE;
    return displayedPlugins.slice(start, start + ITEMS_PER_PAGE);
  }, [displayedPlugins, currentPage]);

  useEffect(() => {
    if (currentPage > totalPages) setCurrentPage(totalPages);
  }, [totalPages, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, categoryFilter]);

  const [dismissedIds, setDismissedIds] = useState<Set<string>>(new Set());

  const activeAnnouncements = useMemo(() => {
    const now = new Date();
    const nowStr = now.toISOString().slice(0, 16).replace("T", " ");
    return allAnnouncements
      .filter((a) => {
        if (!a.isActive) return false;
        if (a.publishAt && a.publishAt > nowStr) return false;
        if (a.expireAt && a.expireAt <= nowStr) return false;
        return true;
      })
      .sort((a) => (a.priority === "pinned" ? -1 : 1));
  }, [allAnnouncements]);

  const visibleAnnouncements = useMemo(
    () => activeAnnouncements.filter((a) => !dismissedIds.has(a.id)),
    [activeAnnouncements, dismissedIds]
  );

  return (
    <NavLayout>
      {/* Hero */}
      <section
        ref={heroRef}
        style={{ padding: "96px 32px" }}
      >
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-stretch">
            {/* Left: Announcements */}
            {visibleAnnouncements.length > 0 && (
              <AnnouncementHero
                announcements={visibleAnnouncements}
                onDismiss={(id) => setDismissedIds((prev) => new Set(prev).add(id))}
              />
            )}

            {/* Right: Hero Content */}
            <div className={`flex items-center ${visibleAnnouncements.length > 0 ? "" : "lg:col-span-2 text-center"}`}>
              <div className={visibleAnnouncements.length > 0 ? "" : "mx-auto"} style={{ maxWidth: visibleAnnouncements.length > 0 ? "none" : "720px" }}>
                <span
                  className="inline-block px-3 py-1 rounded-full text-white text-xs font-semibold tracking-wider uppercase mb-6"
                  style={{
                    backgroundColor: "#cc785c",
                    fontFamily: "Inter, sans-serif",
                    fontSize: "12px",
                    fontWeight: 500,
                    letterSpacing: "1.5px",
                  }}
                >
                  AI 插件市场
                </span>
                <h1
                  className="text-[#141413] mb-5"
                  style={{
                    fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                    fontSize: "48px",
                    fontWeight: 400,
                    lineHeight: "1.05",
                    letterSpacing: "-1.5px",
                  }}
                >
                  发现强大的
                  <br />
                  AI 智能体插件
                </h1>
                <p
                  className="text-[#6c6a64] mb-8"
                  style={{
                    fontFamily: "Inter, sans-serif",
                    fontSize: "16px",
                    lineHeight: "1.55",
                  }}
                >
                  搜索数千款精心打造的插件，为你的智能体赋予代码审查、数据分析、多语言翻译等超能力
                </p>
                <div>
                  <div className="flex border border-[#e6dfd8] rounded-lg overflow-hidden max-w-[480px] w-full bg-white">
                    <svg
                      className="w-5 h-5 text-[#8e8b82] ml-4 self-center flex-shrink-0"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                      strokeWidth={2}
                    >
                      <path d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    <input
                      type="text"
                      placeholder="搜索 Skill、Agent、MCP…"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                      className="flex-1 border-none px-3 py-3 text-sm text-[#141413] placeholder-[#8e8b82] outline-none bg-transparent"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    />
                    <button className="px-6 py-3 bg-[#cc785c] text-white text-sm font-medium hover:bg-[#a9583e] transition-colors"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      搜索
                    </button>
                  </div>
                </div>

                {/* Stats */}
                <div className={`flex items-center gap-12 mt-10 ${visibleAnnouncements.length > 0 ? "" : "justify-center"}`}>
                  <div className="text-center">
                    <div
                      className="text-[#141413]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
                    >
                      {publishedPlugins.length}+
                    </div>
                    <div className="text-[#8e8b82] text-xs mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                      精选插件
                    </div>
                  </div>
                  <div className="w-px h-8 bg-[#e6dfd8]" />
                  <div className="text-center">
                    <div
                      className="text-[#141413]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
                    >
                      {formatDownloads(publishedPlugins.reduce((s, p) => s + p.downloads, 0))}
                    </div>
                    <div className="text-[#8e8b82] text-xs mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                      总下载量
                    </div>
                  </div>
                  <div className="w-px h-8 bg-[#e6dfd8]" />
                  <div className="text-center">
                    <div
                      className="text-[#141413]"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
                    >
                      {(publishedPlugins.reduce((s, p) => s + p.rating, 0) / Math.max(publishedPlugins.length, 1)).toFixed(1)}
                    </div>
                    <div className="text-[#8e8b82] text-xs mt-1" style={{ fontFamily: "Inter, sans-serif" }}>
                      平均评分
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Category Tabs */}
      <section className="bg-[#faf9f5] border-b border-[#ebe6df]" style={{ padding: "0 32px" }}>
        <div className="max-w-[1200px] mx-auto flex items-center justify-center gap-5 overflow-x-auto pb-2">
          {CATEGORY_OPTIONS.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategoryFilter(cat)}
              className={`px-5 py-2.5 rounded-lg transition-colors whitespace-nowrap flex-shrink-0 ${
                categoryFilter === cat
                  ? "bg-[#efe9de] text-[#141413]"
                  : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#f5f0e8]"
              }`}
              style={{ fontFamily: "Inter, sans-serif", fontSize: "28px", fontWeight: 500 }}
            >
              {cat === "全部" ? "全部" : `${CATEGORY_ICONS[cat] || ""} ${cat}`}
            </button>
          ))}
        </div>
      </section>

      {/* Plugins Grid */}
      <section style={{ padding: "96px 32px" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="flex items-start gap-4">
            {/* Left Arrow */}
            {totalPages > 1 ? (
              <button
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="flex-shrink-0 w-12 h-12 mt-[180px] rounded-full bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] hover:border-[#cc785c] transition-all flex items-center justify-center text-2xl disabled:opacity-20 disabled:cursor-not-allowed"
              >
                ‹
              </button>
            ) : (
              <div className="flex-shrink-0 w-12" />
            )}

            <div className="flex-1 min-w-0">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {pagedPlugins.map((plugin) => (
              <Link
                key={plugin.id}
                href={`/marketplace/${plugin.id}`}
                className="bg-[#efe9de] rounded-xl p-8 hover:shadow-md hover:-translate-y-1 transition-all duration-200 group block"
              >
                <div className="flex items-start gap-4 mb-4">
                  <div className="w-12 h-12 rounded-xl bg-[#faf9f5] flex items-center justify-center text-2xl border border-[#e6dfd8] flex-shrink-0">
                    {CATEGORY_ICONS[plugin.category] || "📦"}
                  </div>
                  <div className="min-w-0">
                    <h3
                      className="text-[#141413] mb-1"
                      style={{ fontFamily: "Inter, sans-serif", fontSize: "18px", fontWeight: 500 }}
                    >
                      {plugin.name}
                    </h3>
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[plugin.category]}`}
                    >
                      {plugin.category}
                    </span>
                  </div>
                </div>
                <p
                  className="text-[#6c6a64] mb-5 line-clamp-2"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: "1.55" }}
                >
                  {plugin.description}
                </p>
                <div className="flex items-center justify-between">
                  {renderStars(plugin.rating)}
                  <span className="text-[#8e8b82] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                    ⬇ {formatDownloads(plugin.downloads)}
                  </span>
                </div>
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {plugin.tags.slice(0, 3).map((tag) => (
                    <span
                      key={tag}
                      className="px-2.5 py-0.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-full text-xs text-[#6c6a64]"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </Link>
            ))}
            {pagedPlugins.length === 0 && (
              <div className="col-span-full py-16 text-center">
                <div className="text-4xl mb-3">🔍</div>
                <div className="text-[#6c6a64] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                  没有找到匹配的插件
                </div>
              </div>
            )}
          </div>
            </div>

            {/* Right Arrow */}
            {totalPages > 1 ? (
              <button
                onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="flex-shrink-0 w-12 h-12 mt-[180px] rounded-full bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] hover:border-[#cc785c] transition-all flex items-center justify-center text-2xl disabled:opacity-20 disabled:cursor-not-allowed"
              >
                ›
              </button>
            ) : (
              <div className="flex-shrink-0 w-12" />
            )}
          </div>
        </div>
      </section>

      {/* Ranking + Collections */}
      <section style={{ padding: "96px 32px" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
            {/* Download Ranking */}
            <div className="lg:col-span-1">
              <h2
                className="text-[#141413] mb-6"
                style={{
                  fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                  fontSize: "28px",
                  fontWeight: 400,
                  lineHeight: "1.2",
                  letterSpacing: "-0.3px",
                }}
              >
                下载排行榜
              </h2>
              <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl overflow-hidden">
                {topDownloads.map((plugin, index) => (
                  <Link
                    key={plugin.id}
                    href={`/marketplace/${plugin.id}`}
                    className={`flex items-center gap-3 px-4 py-3 hover:bg-[#f5f0e8] transition-colors block ${
                      index < topDownloads.length - 1 ? "border-b border-[#ebe6df]" : ""
                    }`}
                  >
                    <div
                      className="w-7 h-7 flex items-center justify-center flex-shrink-0"
                      style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "18px", fontWeight: 400 }}
                    >
                      {index < 3 ? (
                        <span className={index === 0 ? "text-[#cc785c]" : index === 1 ? "text-[#d4a017]" : "text-[#5db8a6]"}>
                          {index + 1}
                        </span>
                      ) : (
                        <span className="text-[#8e8b82]">{index + 1}</span>
                      )}
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-[#efe9de] flex items-center justify-center text-base flex-shrink-0">
                      {CATEGORY_ICONS[plugin.category] || "📦"}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div
                        className="text-[#141413] text-xs font-medium truncate"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {plugin.name}
                      </div>
                      <div className="text-[#8e8b82] text-xs truncate" style={{ fontFamily: "Inter, sans-serif" }}>
                        {plugin.author}
                      </div>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <div className="text-[#e8a55a] text-xs">★ {plugin.rating.toFixed(1)}</div>
                      <div className="text-[#8e8b82] text-xs mt-0.5" style={{ fontFamily: "Inter, sans-serif" }}>
                        {formatDownloads(plugin.downloads)}
                      </div>
                    </div>
                  </Link>
                ))}
              </div>
            </div>

            {/* Featured Collections */}
            <div className="lg:col-span-2">
              <h2
                className="text-[#141413] mb-6"
                style={{
                  fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                  fontSize: "28px",
                  fontWeight: 400,
                  lineHeight: "1.2",
                  letterSpacing: "-0.3px",
                }}
              >
                精选专题合集
              </h2>
              <div className="space-y-6">
                {collectionPlugins.map((col) => (
                  <div key={col.id}>
                    <div className="flex items-center gap-2 mb-3">
                      <h3
                        className="text-[#141413]"
                        style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", fontWeight: 500 }}
                      >
                        {col.title}
                      </h3>
                      <span
                        className="text-[#8e8b82] text-xs"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {col.description}
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      {col.plugins.map((plugin) => (
                        <Link
                          key={plugin.id}
                          href={`/marketplace/${plugin.id}`}
                          className="bg-[#efe9de] rounded-lg p-3 hover:shadow-sm hover:-translate-y-0.5 transition-all duration-200 group block"
                        >
                          <div className="flex items-center gap-2 mb-2">
                            <div className="w-7 h-7 rounded-md bg-[#faf9f5] flex items-center justify-center text-sm border border-[#e6dfd8] flex-shrink-0">
                              {CATEGORY_ICONS[plugin.category] || "📦"}
                            </div>
                            <div className="min-w-0">
                              <div
                                className="text-[#141413] text-xs font-medium truncate"
                                style={{ fontFamily: "Inter, sans-serif" }}
                              >
                                {plugin.name}
                              </div>
                              <span
                                className={`inline-block px-1.5 py-0.5 rounded-full text-xs font-medium mt-0.5 ${CATEGORY_COLORS[plugin.category]}`}
                                style={{ fontSize: "10px" }}
                              >
                                {plugin.category}
                              </span>
                            </div>
                          </div>
                          <div className="flex items-center justify-between">
                            <span className="text-[#e8a55a] text-xs">★ {plugin.rating.toFixed(1)}</span>
                            <span className="text-[#8e8b82] text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                              ⬇ {formatDownloads(plugin.downloads)}
                            </span>
                          </div>
                        </Link>
                      ))}
                </div>
              </div>
            ))}
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Coral Band */}
      <section className="bg-[#cc785c]" style={{ padding: "64px 32px" }}>
        <div className="max-w-[1200px] mx-auto text-center">
          <h2
            className="text-white mb-4"
            style={{
              fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
              fontSize: "28px",
              fontWeight: 400,
              lineHeight: "1.2",
              letterSpacing: "-0.3px",
            }}
          >
            还没有找到合适的插件？
          </h2>
          <p
            className="text-white/80 mb-8"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "1.55" }}
          >
            前往管理后台创建和发布你自己的插件，加入 AgentHub 开发者社区
          </p>
          <Link
            href="/admin/plugins"
            className="inline-block px-8 py-3 bg-white text-[#cc785c] rounded-lg font-medium hover:bg-[#faf9f5] transition-colors"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
          >
            前往管理后台
          </Link>
        </div>
      </section>

      {/* Toasts */}
      <div className="fixed bottom-6 right-6 z-[60] flex flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="px-4 py-3 rounded-lg shadow-lg text-sm animate-slide-up bg-[#181715] text-[#faf9f5]"
            style={{ fontFamily: "Inter, sans-serif" }}
          >
            ✅ {toast.message}
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
    </NavLayout>
  );
}
