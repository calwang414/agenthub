"use client";

import NavLayout from "@/components/ui/nav-layout";

export default function ChangelogPage() {
  return (
    <NavLayout>
      <section style={{ padding: "96px 32px" }}>
        <div className="max-w-[720px] mx-auto">
          <h1
            className="text-[#141413] mb-6"
            style={{
              fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
              fontSize: "40px",
              fontWeight: 400,
              lineHeight: "1.15",
              letterSpacing: "-1px",
            }}
          >
            更新日志
          </h1>
          <p
            className="text-[#6c6a64] mb-10"
            style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "1.55" }}
          >
            AgentHub 平台的版本更新记录。
          </p>

          <div className="space-y-8">
            <div className="bg-[#efe9de] rounded-xl p-6">
              <div className="flex items-center gap-3 mb-3">
                <span className="inline-block px-2.5 py-0.5 bg-[#cc785c]/12 text-[#cc785c] rounded-full text-xs font-medium">
                  v2.5
                </span>
                <span className="text-[#8e8b82] text-sm">2026-04-20</span>
              </div>
              <ul className="space-y-2 text-[#3d3d3a] text-sm list-disc list-inside">
                <li>新增插件推荐算法，提升匹配准确率</li>
                <li>优化搜索性能，响应速度提升 40%</li>
                <li>修复若干已知 Bug</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
    </NavLayout>
  );
}
