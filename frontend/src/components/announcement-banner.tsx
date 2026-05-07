"use client";

import { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import type { Announcement } from "@/lib/types";

interface Props {
  announcements: Announcement[];
  onDismiss: (id: string) => void;
}

export default function AnnouncementBanner({ announcements, onDismiss }: Props) {
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
    <div className="bg-[#f5f0e8] border-b border-[#e6dfd8] relative overflow-hidden">
      <div className="max-w-[1200px] mx-auto px-8">
        <div className="relative h-10 flex items-center">
          <div
            key={item.id}
            className="flex items-center justify-between w-full animate-fade-in"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className={`flex-shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${
                  item.priority === "pinned"
                    ? "bg-[#cc785c] text-white"
                    : "bg-[#efe9de] text-[#6c6a64]"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
              >
                {item.priority === "pinned" ? "置顶" : "公告"}
              </span>
              <Link
                href={item.linkUrl || "#"}
                className={`text-sm text-[#3d3d3a] truncate hover:text-[#141413] transition-colors ${
                  !item.linkUrl ? "cursor-default" : "hover:underline"
                }`}
                style={{ fontFamily: "Inter, sans-serif" }}
                onClick={(e) => { if (!item.linkUrl) e.preventDefault(); }}
              >
                {item.title}
              </Link>
            </div>
            <div className="flex items-center gap-1 flex-shrink-0 ml-3">
              {item.isDismissible && (
                <button
                  onClick={() => onDismiss(item.id)}
                  className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#e8e0d2] transition-colors"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {len > 1 && (
            <div className="flex items-center gap-1 ml-3 flex-shrink-0">
              <button
                onClick={goPrev}
                className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#e8e0d2] transition-colors text-xs"
              >
                ‹
              </button>
              <span className="text-[#8e8b82] text-xs tabular-nums" style={{ fontFamily: "Inter, sans-serif" }}>
                {current + 1}/{len}
              </span>
              <button
                onClick={goNext}
                className="w-5 h-5 flex items-center justify-center rounded text-[#8e8b82] hover:text-[#141413] hover:bg-[#e8e0d2] transition-colors text-xs"
              >
                ›
              </button>
            </div>
          )}
        </div>
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
