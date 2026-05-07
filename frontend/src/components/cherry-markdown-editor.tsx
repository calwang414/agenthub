"use client";

import { useEffect, useRef, useCallback } from "react";
import type Cherry from "cherry-markdown";
import "cherry-markdown/dist/cherry-markdown.min.css";

interface CherryMarkdownEditorProps {
  value: string;
  onChange: (md: string) => void;
  placeholder?: string;
  height?: string;
}

export default function CherryMarkdownEditor({
  value,
  onChange,
  placeholder = "请输入内容…",
  height = "400px",
}: CherryMarkdownEditorProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const cherryRef = useRef<Cherry | null>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initCherry = useCallback(async () => {
    if (!containerRef.current) return;

    const CherryClass = (await import("cherry-markdown")).default;

    const cherryOptions: Record<string, unknown> = {
      el: containerRef.current,
      editor: {
        defaultModel: "editOnly",
        height: height,
        placeholder: placeholder,
      },
      toolbars: {
        toolbar: [
          "bold",
          "italic",
          "strikethrough",
          "|",
          "header",
          "|",
          "quote",
          "|",
          "ol",
          "ul",
          "|",
          "link",
          "image",
          "table",
          "code",
          "|",
          "graph",
          "formula",
          "|",
          "undo",
          "redo",
        ],
        toolbarRight: ["fullScreen"],
      },
      engine: {
        syntax: {
          table: { enableChart: true },
          mermaid: true,
        },
      },
      callback: {
        afterChange: (text: string) => {
          onChangeRef.current(text);
        },
      },
    };

    cherryRef.current = new CherryClass(cherryOptions as any);
  }, [height, placeholder]);

  useEffect(() => {
    initCherry();

    return () => {
      if (cherryRef.current) {
        cherryRef.current.destroy();
        cherryRef.current = null;
      }
    };
  }, [initCherry]);

  useEffect(() => {
    if (cherryRef.current && value !== undefined) {
      const currentMarkdown = cherryRef.current.getMarkdown();
      if (currentMarkdown !== value) {
        cherryRef.current.setMarkdown(value);
      }
    }
  }, [value]);

  return (
    <div
      ref={containerRef}
      id="cherry-editor-container"
      style={{ width: "100%", minHeight: height }}
    />
  );
}
