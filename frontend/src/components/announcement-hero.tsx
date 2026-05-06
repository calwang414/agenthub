"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Announcement } from "@/lib/mock/notifications";

interface Props {
  announcements: Announcement[];
  onDismiss: (id: string) => void;
}

export default function AnnouncementHero({ announcements, onDismiss }: Props) {
  const [current, setCurrent] = useState(0);
  const len = announcements.length;

  const goNext = useCallback(() => {
    setCurrent((prev) => (prev + 1) % len);
  }, [len]);

  const goPrev = useCallback(() => {
    setCurrent((prev) => (prev - 1 + len) % len);
  }, [len]);

  useEffect(() => {
    if (len <= 1) return;
    const timer = setInterval(goNext, 4000);
    return () => clearInterval(timer);
  }, [goNext, len]);

  useEffect(() => {
    if (current >= len) setCurrent(0);
  }, [current, len]);

  if (len === 0) return null;

  const item = announcements[current];

  return (
    <div className="bg-[#f5f0e8] rounded-xl border border-[#e6dfd8] relative h-full">
      {/* Big Left Arrow */}
      {len > 1 && (
        <button
          onClick={goPrev}
          className="absolute left-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] hover:text-[#141413] hover:bg-white hover:border-[#cc785c] transition-all flex items-center justify-center shadow-sm"
          style={{ fontSize: "28px", lineHeight: 1 }}
        >
          ‹
        </button>
      )}

      {/* Big Right Arrow */}
      {len > 1 && (
        <button
          onClick={goNext}
          className="absolute right-3 top-1/2 -translate-y-1/2 z-10 w-12 h-12 rounded-full bg-[#faf9f5] border border-[#e6dfd8] text-[#6c6a64] hover:text-[#141413] hover:bg-white hover:border-[#cc785c] transition-all flex items-center justify-center shadow-sm"
          style={{ fontSize: "28px", lineHeight: 1 }}
        >
          ›
        </button>
      )}

      <div className="p-8 h-full flex flex-col">
        <div key={item.id} className="animate-fade-in flex-1 flex flex-col">
          <div className="flex items-center gap-2 mb-4">
            <span
              className={`flex-shrink-0 px-2.5 py-0.5 rounded-full text-xs font-medium ${
                item.priority === "pinned"
                  ? "bg-[#cc785c] text-white"
                  : "bg-[#efe9de] text-[#6c6a64]"
              }`}
              style={{ fontFamily: "Inter, sans-serif" }}
            >
              {item.priority === "pinned" ? "置顶" : "公告"}
            </span>
            {item.isDismissible && (
              <button
                onClick={() => onDismiss(item.id)}
                className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#e8e0d2] transition-colors"
              >
                ✕
              </button>
            )}
          </div>

          <Link
            href={item.linkUrl || "#"}
            className={`text-[#141413] mb-3 block ${
              !item.linkUrl ? "cursor-default" : "hover:underline"
            }`}
            style={{
              fontFamily: "'Cormorant Garamond', 'Times New Roman', serif",
              fontSize: "24px",
              fontWeight: 400,
              lineHeight: "1.2",
              letterSpacing: "-0.3px",
            }}
            onClick={(e) => { if (!item.linkUrl) e.preventDefault(); }}
          >
            {item.title}
          </Link>

          <div
            className="text-[#6c6a64] text-sm leading-relaxed flex-1"
            style={{ fontFamily: "Inter, sans-serif", lineHeight: "1.55" }}
            dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]+>/g, " ").slice(0, 120) + (item.content.length > 120 ? "…" : "") }}
          />

          {item.linkUrl && (
            <div className="mt-4 pt-4 border-t border-[#e6dfd8]">
              <span className="text-[#cc785c] text-sm" style={{ fontFamily: "Inter, sans-serif", fontWeight: 500 }}>
                查看详情 →
              </span>
            </div>
          )}
        </div>

        {len > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-4 pt-4 border-t border-[#e6dfd8]">
            {Array.from({ length: len }, (_, i) => (
              <button
                key={i}
                onClick={() => setCurrent(i)}
                className={`w-2 h-2 rounded-full transition-all ${
                  i === current ? "bg-[#cc785c] w-5" : "bg-[#d1cdc4]"
                }`}
              />
            ))}
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes fade-in {
          from { opacity: 0; transform: translateY(4px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fade-in 0.35s ease-out;
        }
      `}</style>
    </div>
  );
}
