"use client";

import { useMemo } from "react";

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

let engineInstance: any = null;

function getEngine() {
  if (!engineInstance) {
    const CherryEngine = require("cherry-markdown/dist/cherry-markdown.engine.core").default;
    engineInstance = new CherryEngine({
      syntax: {
        table: { enableChart: false },
        mermaid: true,
      },
    });
  }
  return engineInstance;
}

export default function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const html = useMemo(() => {
    if (!content) return "";
    try {
      return getEngine().makeHtml(content);
    } catch {
      return content;
    }
  }, [content]);

  return (
    <div
      className={`markdown-body ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
