"use client";

export function Pagination({
  currentPage,
  totalPages,
  totalItems,
  onChange,
}: {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  onChange: (page: number) => void;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between pt-4 flex-shrink-0">
      <span className="text-sm text-[#6c6a64]">
        共 {totalItems} 项，第 {currentPage} / {totalPages} 页
      </span>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onChange(Math.max(1, currentPage - 1))}
          disabled={currentPage === 1}
          className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          上一页
        </button>
        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
          <button
            key={page}
            onClick={() => onChange(page)}
            className={`w-9 h-9 rounded-lg text-sm transition-colors ${
              page === currentPage
                ? "bg-[#cc785c] text-white"
                : "text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de]"
            }`}
          >
            {page}
          </button>
        ))}
        <button
          onClick={() => onChange(Math.min(totalPages, currentPage + 1))}
          disabled={currentPage === totalPages}
          className="px-3 py-2 text-sm text-[#6c6a64] hover:text-[#141413] hover:bg-[#efe9de] rounded-lg transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
        >
          下一页
        </button>
      </div>
    </div>
  );
}
