"use client";

import { useEffect, useRef, useCallback } from "react";

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
  const cherryRef = useRef<any>(null);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const initCherry = useCallback(async () => {
    if (!containerRef.current) return;

    const Cherry = (await import("cherry-markdown")).default;

    cherryRef.current = new Cherry({
      id: containerRef.current,
      value: value || "",
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
    });
  }, [value, height, placeholder]);

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
