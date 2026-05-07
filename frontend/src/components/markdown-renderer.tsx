"use client";

import { useMemo } from "react";
import "cherry-markdown/dist/cherry-markdown.markdown.min.css";

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
      className={`cherry-markdown ${className || ""}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
