"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { apiGet, apiPost } from "@/lib/api-client";
import { type Review } from "@/lib/mock/marketplace";
import type { Plugin } from "@/lib/mock/plugins";
import NavLayout from "@/components/ui/nav-layout";
import { useFavorites } from "@/hooks/useFavorites";
import { useDownloads } from "@/hooks/useDownloads";

export interface PluginDetail {
  pluginId: string;
  readme: string;
  reviews: Review[];
  versionHistory: { version: string; date: string; changelog: string[] }[];
}

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

function renderStars(rating: number, size?: "sm" | "md") {
  const full = Math.floor(rating);
  const half = rating - full >= 0.5;
  const stars = [];
  for (let i = 0; i < full; i++) stars.push("★");
  if (half) stars.push("⭑");
  while (stars.length < 5) stars.push("☆");
  const fontSize = size === "sm" ? "text-sm" : "text-base";
  return (
    <span className={`text-[#e8a55a] tracking-tight ${fontSize}`}>
      {stars.join("")}
      <span className="text-[#6c6a64] ml-1">{rating.toFixed(1)}</span>
    </span>
  );
}

function ReviewStars({ rating }: { rating: number }) {
  const full = Math.floor(rating);
  const stars = [];
  for (let i = 0; i < full; i++) stars.push("★");
  while (stars.length < 5) stars.push("☆");
  return (
    <span className="text-[#e8a55a] text-xs">{stars.join("")}</span>
  );
}

export default function PluginDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [plugin, setPlugin] = useState<Plugin | undefined>(undefined);
  const [detail, setDetail] = useState<PluginDetail | undefined>(undefined);
  const [allPlugins, setAllPlugins] = useState<Plugin[]>([]);
  const [versionDrawerOpen, setVersionDrawerOpen] = useState(false);
  const [reviewsExpanded, setReviewsExpanded] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [toasts, setToasts] = useState<{ id: number; message: string }[]>([]);
  const toastIdRef = useRef(0);

  const { isFavorited, toggleFavorite } = useFavorites();
  const { effectiveDownloadCount, addDownload } = useDownloads();

  useEffect(() => {
    apiGet<Plugin[]>("/api/plugins").then(setAllPlugins).catch(() => {});
    apiGet<Plugin>(`/api/plugins/${id}`).then(setPlugin).catch(() => {});
    apiGet<PluginDetail>(`/api/plugins/${id}/detail`).then(setDetail).catch(() => {});
  }, [id]);

  const addToast = useCallback((message: string) => {
    const id = ++toastIdRef.current;
    setToasts((prev) => [...prev, { id, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 2500);
  }, []);

  const handleInstall = useCallback(async () => {
    if (installing || !plugin) return;
    setInstalling(true);
    addToast("正在下载安装包…");
    try {
      await apiPost(`/api/plugins/${plugin.id}/install`, {});
      addDownload({
        pluginId: plugin.id,
        name: plugin.name,
        description: plugin.description,
        category: plugin.category,
        version: plugin.version,
        icon: CATEGORY_ICONS[plugin.category] || "📦",
      });
      setTimeout(() => {
        addToast(`「${plugin.name}」安装成功！已加入下载列表`);
        setInstalling(false);
      }, 1500);
    } catch {
      addToast(`「${plugin.name}」安装失败，请稍后重试`);
      setInstalling(false);
    }
  }, [installing, plugin, addToast, addDownload]);

  const similarPlugins = useMemo(() => {
    if (!plugin) return [];
    return allPlugins
      .filter((p) => p.category === plugin.category && p.id !== plugin.id && p.status === "published")
      .slice(0, 4);
  }, [plugin, allPlugins]);

  if (!plugin || plugin.status !== "published") {
    return (
      <div className="min-h-screen bg-[#faf9f5] flex items-center justify-center">
        <div className="text-center">
          <div className="text-6xl mb-4">🔌</div>
          <h1
            className="text-[#141413] mb-3"
            style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
          >
            插件未找到
          </h1>
          <p className="text-[#6c6a64] mb-6" style={{ fontFamily: "Inter, sans-serif" }}>
            该插件不存在或已下架
          </p>
          <Link
            href="/marketplace"
            className="inline-block px-6 py-2.5 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors"
            style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
          >
            返回插件市场
          </Link>
        </div>
      </div>
    );
  }

  const ratingCount = detail?.reviews.length || 0;
  const avgRating =
    detail && ratingCount > 0
      ? detail.reviews.reduce((sum, r) => sum + r.rating, 0) / ratingCount
      : plugin.rating;

  const currentVersion = detail?.versionHistory[0] || { version: plugin.version, date: plugin.updatedAt, changelog: [] };

  const REVIEWS_PREVIEW = 6;
  const allReviews = detail?.reviews || [];
  const visibleReviews = reviewsExpanded ? allReviews : allReviews.slice(0, REVIEWS_PREVIEW);
  const hasMoreReviews = allReviews.length > REVIEWS_PREVIEW;

  return (
    <NavLayout>
      {/* Header + Code Side by Side */}
      <section style={{ padding: "64px 32px" }}>
        <div className="max-w-[1200px] mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-5 gap-8">
            {/* Left: Plugin Info (3 cols) */}
            <div className="lg:col-span-3">
              <div className="flex items-start gap-5">
                <div className="w-20 h-20 rounded-2xl bg-[#efe9de] flex items-center justify-center text-4xl border border-[#e6dfd8] flex-shrink-0">
                  {CATEGORY_ICONS[plugin.category] || "📦"}
                </div>
                <div className="flex-1 min-w-0">
                  <h1
                    className="text-[#141413] mb-2"
                    style={{
                      fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                      fontSize: "36px",
                      fontWeight: 400,
                      lineHeight: "1.15",
                      letterSpacing: "-0.5px",
                    }}
                  >
                    {plugin.name}
                  </h1>
                  <p
                    className="text-[#6c6a64] mb-4"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "1.55" }}
                  >
                    {plugin.description}
                  </p>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[plugin.category]}`}
                    >
                      {plugin.category}
                    </span>
                    <span className="text-[#8e8b82] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                      {plugin.author}
                    </span>
                    <span className="flex items-center gap-1 text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                      {renderStars(avgRating, "sm")}
                    </span>
                    <span className="text-[#8e8b82] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                      ⬇ {formatDownloads(effectiveDownloadCount(plugin.id, plugin.downloads))} 下载
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1.5 mt-4">
                    {plugin.tags.map((tag) => (
                      <span
                        key={tag}
                        className="px-3 py-1 bg-[#f5f0e8] rounded-full text-xs text-[#3d3d3a]"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              {/* Code Demo */}
              <div className="mt-8">
                <div className="bg-[#181715] rounded-xl overflow-hidden">
                  <div className="flex items-center gap-2 px-4 py-3 bg-[#252320] border-b border-[#3d3d3a]">
                    <div className="flex items-center gap-1.5">
                      <div className="w-3 h-3 rounded-full bg-[#c64545]" />
                      <div className="w-3 h-3 rounded-full bg-[#d4a017]" />
                      <div className="w-3 h-3 rounded-full bg-[#5db872]" />
                    </div>
                    <span className="text-[#a09d96] text-xs ml-3" style={{ fontFamily: "Inter, sans-serif" }}>
                      {plugin.name.toLowerCase().replace(/\s+/g, "-")}.ts
                    </span>
                  </div>
                  <div className="p-6 overflow-x-auto">
                    <pre
                      className="text-sm leading-relaxed"
                      style={{ fontFamily: "'JetBrains Mono', ui-monospace, monospace", color: "#a09d96" }}
                    >
                      <code>{`// ${plugin.name}
// ${plugin.author} · v${plugin.version}

import { AgentHub } from "@agenthub/sdk";

const plugin = new AgentHub.Plugin({
  name: "${plugin.name}",
  version: "${plugin.version}",
  category: "${plugin.category}",
  description: "${plugin.description.slice(0, 60)}...",
});

plugin.register();

console.log("✓ ${plugin.name} is ready.");`}</code>
                    </pre>
                  </div>
                  <div className="flex items-center gap-4 px-4 py-2.5 bg-[#252320] border-t border-[#3d3d3a]">
                    <span className="text-[#5db872] text-xs" style={{ fontFamily: "'JetBrains Mono', monospace" }}>
                      ● Ready
                    </span>
                    <span className="text-[#6c6a64] text-xs ml-auto" style={{ fontFamily: "Inter, sans-serif" }}>
                      {plugin.category} · v{plugin.version}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Version + Actions (2 cols) */}
            <div className="lg:col-span-2">
              <div className="lg:sticky lg:top-24 space-y-5">
                {/* Current Version */}
                <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-5">
                  <div className="text-[#6c6a64] text-xs mb-1 uppercase tracking-wider" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                    当前版本
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className="text-[#141413] font-medium"
                      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "16px" }}
                    >
                      v{currentVersion.version}
                    </span>
                    <span className="text-[#8e8b82] text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                      {currentVersion.date}
                    </span>
                  </div>
                  {detail && detail.versionHistory.length > 1 && (
                    <button
                      onClick={() => setVersionDrawerOpen(true)}
                      className="mt-3 text-[#cc785c] text-sm hover:underline flex items-center gap-1"
                      style={{ fontFamily: "Inter, sans-serif" }}
                    >
                      查看完整版本历史 ({detail.versionHistory.length}) →
                    </button>
                  )}
                </div>

                {/* Actions */}
                <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-5 space-y-3">
                  <button
                    onClick={handleInstall}
                    disabled={installing}
                    className="w-full px-6 py-3 bg-[#cc785c] text-white text-sm rounded-lg hover:bg-[#a9583e] transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    {installing ? "安装中…" : "安装插件"}
                  </button>
                  <button
                    onClick={() => {
                      toggleFavorite({
                        pluginId: plugin.id,
                        name: plugin.name,
                        description: plugin.description,
                        category: plugin.category,
                        rating: plugin.rating,
                        icon: CATEGORY_ICONS[plugin.category] || "📦",
                      });
                      addToast(isFavorited(plugin.id) ? "已取消收藏" : "已收藏！");
                    }}
                    className="w-full px-6 py-3 bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] text-sm rounded-lg hover:bg-[#efe9de] transition-colors flex items-center justify-center gap-2"
                    style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                  >
                    {isFavorited(plugin.id) ? "★ 已收藏" : "☆ 收藏"}
                  </button>
                </div>

                {/* Metadata */}
                <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-5">
                  <div className="text-[#6c6a64] text-xs mb-3 uppercase tracking-wider" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                    信息
                  </div>
                  <div className="space-y-3">
                    {[
                      { label: "分类", value: plugin.category },
                      { label: "作者", value: plugin.author },
                      { label: "创建时间", value: plugin.createdAt },
                      { label: "最后更新", value: plugin.updatedAt },
                    ].map((item) => (
                      <div key={item.label} className="flex items-center justify-between">
                        <span className="text-[#8e8b82] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                          {item.label}
                        </span>
                        <span className="text-[#141413] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                          {item.value}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Cover Images Gallery */}
      {plugin.coverImages && plugin.coverImages.length > 0 && (
        <section className="bg-[#f5f0e8]" style={{ padding: "48px 32px" }}>
          <div className="max-w-[1200px] mx-auto">
            <h2
              className="text-[#141413] mb-6"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 400,
                letterSpacing: "-0.3px",
              }}
            >
              预览截图
            </h2>
            <div className="flex gap-4 overflow-x-auto pb-2">
              {plugin.coverImages.map((img: string, i: number) => {
                const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/agenthub/${img}`;
                return (
                  <div key={i} className="flex-shrink-0">
                    <img
                      src={url}
                      alt={`截图 ${i + 1}`}
                      className="max-w-xs h-48 rounded-lg object-cover border border-[#e6dfd8]"
                    />
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* README / Description */}
      {detail?.readme && (
        <section className="bg-[#f5f0e8]" style={{ padding: "96px 32px" }}>
          <div className="max-w-[1200px] mx-auto">
            <h2
              className="text-[#141413] mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', serif",
                fontSize: "28px",
                fontWeight: 400,
                letterSpacing: "-0.3px",
              }}
            >
              插件介绍
            </h2>
            <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-8">
              {detail.readme.split("\n").map((line, i) => {
                if (line.startsWith("# ")) {
                  return (
                    <h3
                      key={i}
                      className="text-[#141413] mb-4"
                      style={{
                        fontFamily: "'Cormorant Garamond', serif",
                        fontSize: "22px",
                        fontWeight: 400,
                      }}
                    >
                      {line.replace("# ", "")}
                    </h3>
                  );
                }
                if (line.startsWith("## ")) {
                  return (
                    <h4
                      key={i}
                      className="text-[#141413] mt-8 mb-4"
                      style={{
                        fontFamily: "Inter, sans-serif",
                        fontSize: "16px",
                        fontWeight: 500,
                      }}
                    >
                      {line.replace("## ", "")}
                    </h4>
                  );
                }
                if (line.startsWith("- ")) {
                  return (
                    <div key={i} className="flex items-start gap-2 text-[#3d3d3a] text-sm mb-1.5 ml-2" style={{ fontFamily: "Inter, sans-serif" }}>
                      <span className="text-[#cc785c]">•</span>
                      <span>{line.replace("- ", "")}</span>
                    </div>
                  );
                }
                if (line.startsWith("```")) return null;
                if (line.trim() === "") return <div key={i} className="h-3" />;
                return (
                  <p
                    key={i}
                    className={`text-[#3d3d3a] text-sm leading-relaxed mb-1.5 ${line.startsWith("  ") ? "font-mono text-xs bg-[#f5f0e8] rounded px-2 py-0.5" : ""}`}
                    style={{ fontFamily: line.startsWith("  ") ? "'JetBrains Mono', monospace" : "Inter, sans-serif" }}
                  >
                    {line}
                  </p>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* Reviews (Full Width) */}
      {detail?.reviews && detail.reviews.length > 0 && (
        <section style={{ padding: "96px 32px" }}>
          <div className="max-w-[1200px] mx-auto">
            <div className="flex items-center gap-4 mb-8">
              <h2
                className="text-[#141413]"
                style={{
                  fontFamily: "'Cormorant Garamond', serif",
                  fontSize: "28px",
                  fontWeight: 400,
                  letterSpacing: "-0.3px",
                }}
              >
                用户评价
              </h2>
              <span
                className="text-[#141413]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "28px", fontWeight: 400 }}
              >
                {avgRating.toFixed(1)}
              </span>
              {renderStars(avgRating, "sm")}
              <span className="text-[#8e8b82] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                ({ratingCount} 条评价)
              </span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {visibleReviews.map((review) => (
                <div key={review.id} className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-5">
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-9 h-9 rounded-full bg-[#cc785c] flex items-center justify-center text-white text-xs font-medium flex-shrink-0"
                      style={{ fontFamily: "Inter, sans-serif" }}>
                      {review.userAvatar}
                    </div>
                    <div>
                      <div className="text-[#141413] text-sm font-medium" style={{ fontFamily: "Inter, sans-serif" }}>
                        {review.userName}
                      </div>
                      <div className="flex items-center gap-2">
                        <ReviewStars rating={review.rating} />
                        <span className="text-[#8e8b82] text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                          {review.date}
                        </span>
                      </div>
                    </div>
                  </div>
                  <p className="text-[#3d3d3a] text-sm leading-relaxed" style={{ fontFamily: "Inter, sans-serif" }}>
                    {review.content}
                  </p>
                </div>
              ))}
            </div>
            {hasMoreReviews && (
              <div className="mt-6 text-center">
                <button
                  onClick={() => setReviewsExpanded(!reviewsExpanded)}
                  className="px-6 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] text-[#141413] text-sm rounded-lg hover:bg-[#efe9de] transition-colors flex items-center gap-2 mx-auto"
                  style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}
                >
                  {reviewsExpanded ? "收起评价" : `查看全部 ${allReviews.length} 条评价`}
                  <span className={`transition-transform ${reviewsExpanded ? "rotate-180" : ""}`}>▾</span>
                </button>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Similar Plugins */}
      {similarPlugins.length > 0 && (
        <section className="bg-[#f5f0e8]" style={{ padding: "96px 32px" }}>
          <div className="max-w-[1200px] mx-auto">
            <h2
              className="text-[#141413] mb-8"
              style={{
                fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
                fontSize: "28px",
                fontWeight: 400,
                lineHeight: "1.2",
                letterSpacing: "-0.3px",
              }}
            >
              相似插件推荐
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
              {similarPlugins.map((p) => (
                <Link
                  key={p.id}
                  href={`/marketplace/${p.id}`}
                  className="bg-[#efe9de] rounded-xl p-5 hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group block"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-[#faf9f5] flex items-center justify-center text-2xl border border-[#e6dfd8] flex-shrink-0">
                      {CATEGORY_ICONS[p.category] || "📦"}
                    </div>
                    <div className="min-w-0 flex-1">
                      <h3 className="text-[#141413] font-medium truncate" style={{ fontFamily: "Inter, sans-serif", fontSize: "16px" }}>
                        {p.name}
                      </h3>
                      <p className="text-[#6c6a64] text-sm mt-1 line-clamp-1" style={{ fontFamily: "Inter, sans-serif" }}>
                        {p.description}
                      </p>
                      <div className="flex items-center gap-3 mt-2">
                        <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${CATEGORY_COLORS[p.category]}`}>
                          {p.category}
                        </span>
                        {renderStars(p.rating, "sm")}
                      </div>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}

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
            准备开始使用 {plugin.name}？
          </h2>
          <p className="text-white/80 mb-8" style={{ fontFamily: "Inter, sans-serif", fontSize: "16px" }}>
            一键安装到你的智能体中，立即体验强大功能
          </p>
          <button
            onClick={handleInstall}
            disabled={installing}
            className="inline-block px-8 py-3 bg-white text-[#cc785c] rounded-lg font-medium hover:bg-[#faf9f5] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "14px" }}
          >
            {installing ? "安装中…" : "立即安装"}
          </button>
        </div>
      </section>

      {/* Version History Drawer */}
      {versionDrawerOpen && detail?.versionHistory && (
        <div
          className="fixed inset-0 z-50 flex items-end justify-center"
          onClick={() => setVersionDrawerOpen(false)}
        >
          <div className="absolute inset-0 bg-[#141413]/30 backdrop-blur-sm" />
          <div
            className="relative bg-[#faf9f5] rounded-t-2xl w-full max-w-[720px] max-h-[70vh] overflow-y-auto shadow-2xl animate-slide-up-drawer"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="sticky top-0 bg-[#faf9f5] border-b border-[#e6dfd8] px-6 py-4 flex items-center justify-between rounded-t-2xl">
              <h2
                className="text-[#141413]"
                style={{ fontFamily: "'Cormorant Garamond', serif", fontSize: "22px", fontWeight: 400 }}
              >
                版本历史
              </h2>
              <button
                onClick={() => setVersionDrawerOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-[#8e8b82] hover:text-[#141413] hover:bg-[#efe9de] transition-colors"
              >
                ✕
              </button>
            </div>
            <div className="p-6 space-y-4">
              {detail.versionHistory.map((v, i) => (
                <div
                  key={v.version}
                  className={`bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-5 ${
                    i === 0 ? "ring-2 ring-[#cc785c]/20 border-[#cc785c]/40" : ""
                  }`}
                >
                  <div className="flex items-center gap-3 mb-3">
                    <span
                      className="px-3 py-1 bg-[#efe9de] rounded-lg text-sm font-medium text-[#141413]"
                      style={{ fontFamily: "'JetBrains Mono', monospace" }}
                    >
                      v{v.version}
                    </span>
                    {i === 0 && (
                      <span
                        className="px-2 py-0.5 rounded-full text-xs font-medium bg-[#cc785c] text-white"
                        style={{ fontFamily: "Inter, sans-serif" }}
                      >
                        当前
                      </span>
                    )}
                    <span className="text-[#8e8b82] text-xs" style={{ fontFamily: "Inter, sans-serif" }}>
                      {v.date}
                    </span>
                  </div>
                  <ul className="space-y-1.5">
                    {v.changelog.map((item, j) => (
                      <li key={j} className="flex items-start gap-2 text-[#3d3d3a] text-sm" style={{ fontFamily: "Inter, sans-serif" }}>
                        <span className="text-[#cc785c] mt-1">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

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
        .animate-slide-up { animation: slide-up 0.3s ease-out; }
        @keyframes slide-up-drawer {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        .animate-slide-up-drawer { animation: slide-up-drawer 0.3s ease-out; }
      `}</style>
    </NavLayout>
  );
}
