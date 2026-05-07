# Markdown 编辑器集成 实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将现有 contentEditable HTML 编辑器替换为 Cherry Markdown WYSIWYG 编辑器，并在前端页面中以 Markdown 格式渲染描述和公告内容。

**架构：** 使用 cherry-markdown 库提供 WYSIWYG 工具栏编辑器 + Engine 渲染引擎。编辑器通过 next/dynamic 动态导入避SSR，渲染器直接用 Engine API 转换 Markdown → HTML。数据库迁移脚本自动将旧 HTML 转为 Markdown。

**技术栈：** Next.js 15 (App Router) + React 19 + shadcn/ui + Tailwind CSS 4 + cherry-markdown + Supabase PostgreSQL

---

## 文件结构

| 文件 | 类型 | 职责 |
|------|------|------|
| `frontend/package.json` | 修改 | 添加 cherry-markdown 依赖 |
| `frontend/src/components/cherry-markdown-editor.tsx` | 新增 | WYSIWYG Markdown 编辑器封装组件 |
| `frontend/src/components/markdown-renderer.tsx` | 新增 | Markdown → HTML 渲染组件 |
| `frontend/src/app/admin/plugins/page.tsx` | 修改 | 替换 contentEditable → CherryMarkdownEditor |
| `frontend/src/app/admin/notifications/page.tsx` | 修改 | 替换两处 contentEditable → CherryMarkdownEditor |
| `frontend/src/app/marketplace/page.tsx` | 修改 | description 纯文本 → MarkdownRenderer |
| `frontend/src/app/marketplace/[id]/page.tsx` | 修改 | description、readme → MarkdownRenderer |
| `frontend/src/components/announcement-hero.tsx` | 修改 | 公告内容截取适配 Markdown |
| `frontend/supabase/migrations/005_migrate_html_to_markdown.sql` | 新增 | HTML → Markdown 数据迁移 |

---

### 任务 1：安装 cherry-markdown 依赖

**文件：**
- 修改：`frontend/package.json`

- [ ] **步骤 1：安装 cherry-markdown**

```bash
cd /Users/calwang/dev/插件市场_new/frontend && npm install cherry-markdown
```

- [ ] **步骤 2：验证安装**

查看 `package.json` 中 `cherry-markdown` 已出现在 `dependencies` 中。

- [ ] **步骤 3：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/package.json frontend/package-lock.json && git commit -m "chore: 添加 cherry-markdown 依赖"
```

---

### 任务 2：创建 CherryMarkdownEditor 封装组件

**文件：**
- 创建：`frontend/src/components/cherry-markdown-editor.tsx`

- [ ] **步骤 1：创建 CherryMarkdownEditor 组件**

```tsx
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
```

- [ ] **步骤 2：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/components/cherry-markdown-editor.tsx && git commit -m "feat: 添加 CherryMarkdownEditor WYSIWYG Markdown 编辑器组件"
```

---

### 任务 3：创建 MarkdownRenderer 渲染组件

**文件：**
- 创建：`frontend/src/components/markdown-renderer.tsx`

- [ ] **步骤 1：创建 MarkdownRenderer 组件**

```tsx
"use client";

import { useRef, useMemo } from "react";

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
```

- [ ] **步骤 2：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/components/markdown-renderer.tsx && git commit -m "feat: 添加 MarkdownRenderer Markdown 渲染组件"
```

---

### 任务 4：改造管理后台插件页面

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：移除旧的 editorRef、execRichCommand、handleEditorBlur**

删除以下行：
```
第79行:   const editorRef = useRef<HTMLDivElement>(null);
第450-453行: const execRichCommand 函数
第455-459行: const handleEditorBlur 函数
```

在文件顶部（第1行 `"use client";` 之后）添加 import：
```tsx
import dynamic from "next/dynamic";

const CherryMarkdownEditor = dynamic(
  () => import("@/components/cherry-markdown-editor"),
  { ssr: false }
);
```

- [ ] **步骤 2：替换插件新增/编辑弹窗中的编辑器**

找到第1124-1180行的 "描述" 字段区域，将整个 `<div>` 块（从第1124行 `<div><label>描述</label>...` 到第1181行 `</div>` 即编辑器区域结束）替换为：

```tsx
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">描述</label>
                <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
                  <CherryMarkdownEditor
                    value={formData.description}
                    onChange={(md) =>
                      setFormData((f) => ({ ...f, description: md }))
                    }
                    placeholder="简要描述插件功能，支持 Markdown 格式…"
                    height="320px"
                  />
                </div>
              </div>
```

原代码中需要精确删除的内容包括：
- 第1126行的 `<div className="border ...">` 到第1170行的工具栏按钮
- 第1171-1179行的 contentEditable div

将这些全部替换为上面的 CherryMarkdownEditor。

- [ ] **步骤 3：验证表格视图中 description 截取仍正常**

表格视图第869行 `{plugin.description.slice(0, 40)}…` 和卡片视图第980行 `{plugin.description}` — 这些使用纯文本展示，不需要修改（Markdown 源码也是可读文本）。

- [ ] **步骤 4：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/app/admin/plugins/page.tsx && git commit -m "feat: 插件管理页面编辑器替换为 CherryMarkdownEditor"
```

---

### 任务 5：改造管理后台公告页面

**文件：**
- 修改：`frontend/src/app/admin/notifications/page.tsx`

- [ ] **步骤 1：移除旧的 editor refs、execRichCommand 和 handleBlur 函数**

删除以下代码：
```
第87-88行: const editorRef = useRef<HTMLDivElement>(null);
           const notifyEditorRef = useRef<HTMLDivElement>(null);

第121-124行: const execRichCommand = (command: string, value?: string) => { ... };
第126-129行: const execNotifyRichCommand = (command: string, value?: string) => { ... };
第131-135行: const handleEditorBlur = () => { ... }; 
第137-141行: useEffect(() => { ... }, [modalType, formContent]);
第143-147行: const handleNotifyEditorBlur = () => { ... };
```

在文件顶部（第1行 `"use client";` 之后）添加 import：
```tsx
import dynamic from "next/dynamic";

const CherryMarkdownEditor = dynamic(
  () => import("@/components/cherry-markdown-editor"),
  { ssr: false }
);
```

- [ ] **步骤 2：替换 stripHtmlText 为 stripMarkdownText**

将第13-22行的 `stripHtmlText` 函数替换为：

```tsx
function stripMarkdownText(md: string): string {
  return md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|.*\|/g, "")
    .replace(/^>/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}
```

同时更新所有调用点：
- 第201行 `stripHtmlText(r.content)` → `stripMarkdownText(r.content)`
- 第497行 `stripHtmlText(a.content)` → `stripMarkdownText(a.content)`
- 第696行 `stripHtmlText(r.content)` → `stripMarkdownText(r.content)`
- 第982行 `stripHtmlText(notificationContent)` → `stripMarkdownText(notificationContent)`

- [ ] **步骤 3：替换公告编辑弹窗中的内容编辑器**

找到第790-821行公告编辑弹窗中的 "内容" 字段区域。将整段（从第790行 `<div><label>内容</label>...` 开始到第821行 `</div>` 即 editorRef 的 div 结束）替换为：

```tsx
              <div>
                <label className="block text-sm text-[#3d3d3a] mb-1.5">内容</label>
                <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
                  <CherryMarkdownEditor
                    value={formContent}
                    onChange={setFormContent}
                    placeholder="输入公告内容，支持 Markdown 格式…"
                    height="300px"
                  />
                </div>
              </div>
```

原始删除范围：第790行 `<div>` 到第821行 `</div>`（包含工具栏按钮 `execRichCommand` 和 `contentEditable` editorRef div）。

- [ ] **步骤 4：替换通知推送中的内容编辑器**

找到第596-627行通知推送区域中的 "通知内容" 字段。将整段（从第596行 `<div><label>通知内容</label>...` 开始到第627行 `</div>` 即 notifyEditorRef 的 div 结束）替换为：

```tsx
                <div>
                  <label className="block text-sm text-[#3d3d3a] mb-1.5">通知内容</label>
                  <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
                    <CherryMarkdownEditor
                      value={notificationContent}
                      onChange={setNotificationContent}
                      placeholder="输入通知内容，支持 Markdown 格式…"
                      height="250px"
                    />
                  </div>
                </div>
```

原始删除范围：第596行 `<div>` 到第627行 `</div>`（包含工具栏按钮 `execNotifyRichCommand` 和 `contentEditable` notifyEditorRef div）。

- [ ] **步骤 5：移除 confirmSend 中清空 notifyEditorRef 的代码**

第368-370行：
```tsx
      if (notifyEditorRef.current) {
        notifyEditorRef.current.innerHTML = "";
      }
```

替换为：
```tsx
      setNotificationContent("");
```

- [ ] **步骤 6：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/app/admin/notifications/page.tsx && git commit -m "feat: 公告管理页面编辑器替换为 CherryMarkdownEditor"
```

---

### 任务 6：改造插件市场首页

**文件：**
- 修改：`frontend/src/app/marketplace/page.tsx`

- [ ] **步骤 1：添加 MarkdownRenderer import**

在文件顶部第8行 `import AnnouncementHero` 之后添加：
```tsx
import MarkdownRenderer from "@/components/markdown-renderer";
```

- [ ] **步骤 2：替换插件卡片中的 description 纯文本**

第371-376行，当前代码：
```tsx
                <p
                  className="text-[#6c6a64] mb-5 line-clamp-2"
                  style={{ fontFamily: "Inter, sans-serif", fontSize: "14px", lineHeight: "1.55" }}
                >
                  {plugin.description}
                </p>
```

替换为：
```tsx
                <div className="text-[#6c6a64] mb-5 line-clamp-2" style={{ fontSize: "14px", lineHeight: "1.55" }}>
                  <MarkdownRenderer content={plugin.description} className="text-[#6c6a64] text-sm" />
                </div>
```

- [ ] **步骤 3：替换排行榜中 description 纯文本（已不显示，跳过）**

排行榜只显示 `name` 和 `author`，不影响。

- [ ] **步骤 4：替换精选合集中 description**

第515行附近，`{col.description}` 是纯文本合集描述，不需要渲染 Markdown（合集描述是结构化文本，不是 Markdown）。

- [ ] **步骤 5：替换相似插件区域 description**

第573-574行：
```tsx
                      <p className="text-[#6c6a64] text-sm mt-1 line-clamp-1" style={{ fontFamily: "Inter, sans-serif" }}>
                        {p.description}
                      </p>
```

替换为：
```tsx
                      <div className="text-[#6c6a64] text-sm mt-1 line-clamp-1">
                        <MarkdownRenderer content={p.description} />
                      </div>
```

- [ ] **步骤 6：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/app/marketplace/page.tsx && git commit -m "feat: 插件市场首页 description 改用 MarkdownRenderer 渲染"
```

---

### 任务 7：改造插件详情页

**文件：**
- 修改：`frontend/src/app/marketplace/[id]/page.tsx`

- [ ] **步骤 1：添加 MarkdownRenderer import**

在第9行 `import { useFavorites }` 之后添加：
```tsx
import MarkdownRenderer from "@/components/markdown-renderer";
```

- [ ] **步骤 2：替换插件描述区域**

第194-199行，当前代码：
```tsx
                  <p
                    className="text-[#6c6a64] mb-4"
                    style={{ fontFamily: "Inter, sans-serif", fontSize: "16px", lineHeight: "1.55" }}
                  >
                    {plugin.description}
                  </p>
```

替换为：
```tsx
                  <div className="text-[#6c6a64] mb-4" style={{ fontSize: "16px", lineHeight: "1.55" }}>
                    <MarkdownRenderer content={plugin.description} />
                  </div>
```

- [ ] **步骤 3：替换 README / 插件介绍区域的手动 Markdown 解析**

第417-468行，当前使用 `.split("\n").map()` 手写解析 Markdown 行（`# `, `## `, `- `, ` ``` ` 等）。将整个 README 渲染部分替换为 MarkdownRenderer：

```tsx
            <div className="bg-[#faf9f5] border border-[#e6dfd8] rounded-xl p-8">
              <MarkdownRenderer content={detail.readme} />
            </div>
```

删除原始的 `.split("\n").map()` 渲染逻辑（第417-467行）。

- [ ] **步骤 4：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/app/marketplace/[id]/page.tsx && git commit -m "feat: 插件详情页 description 和 readme 改用 MarkdownRenderer 渲染"
```

---

### 任务 8：适配公告 Hero 组件

**文件：**
- 修改：`frontend/src/components/announcement-hero.tsx`

- [ ] **步骤 1：修改公告内容截取逻辑**

第107行，当前代码使用 `replace(/<[^>]+>/g, " ")` 去除 HTML 标签。由于内容现在是 Markdown 格式，需要改为去除 Markdown 语法：

```tsx
            dangerouslySetInnerHTML={{ __html: item.content.replace(/<[^>]+>/g, " ").slice(0, 120) + (item.content.length > 120 ? "…" : "") }}
```

替换为带 Markdown 清洗的纯文本截取。先在组件顶部添加清洗函数（第5行 import 之后）：

```tsx
function stripMarkdownPreview(md: string, maxLen: number): string {
  const text = md
    .replace(/#{1,6}\s+/g, "")
    .replace(/\*\*(.+?)\*\*/g, "$1")
    .replace(/\*(.+?)\*/g, "$1")
    .replace(/~~(.+?)~~/g, "$1")
    .replace(/`{1,3}[^`]*`{1,3}/g, "")
    .replace(/\[(.+?)\]\(.*?\)/g, "$1")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/^\s*\d+\.\s+/gm, "")
    .replace(/\|.*\|/g, "")
    .replace(/^>/gm, "")
    .replace(/```[\s\S]*?```/g, "")
    .replace(/&[a-z]+;/g, "")
    .replace(/\s+/g, " ")
    .trim();
  if (text.length <= maxLen) return text;
  return text.slice(0, maxLen) + "…";
}
```

然后将第104-108行的 `<div>` 修改为：

```tsx
          <div
            className="text-[#6c6a64] text-sm leading-relaxed flex-1"
            style={{ fontFamily: "Inter, sans-serif", lineHeight: "1.55" }}
          >
            {stripMarkdownPreview(item.content, 120)}
          </div>
```

不再使用 `dangerouslySetInnerHTML`，改用纯文本渲染。

- [ ] **步骤 2：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/src/components/announcement-hero.tsx && git commit -m "feat: 公告 Hero 组件适配 Markdown 内容截取"
```

---

### 任务 9：编写数据库迁移脚本

**文件：**
- 创建：`frontend/supabase/migrations/005_migrate_html_to_markdown.sql`

- [ ] **步骤 1：创建迁移 SQL**

```sql
-- 005_migrate_html_to_markdown.sql
-- 将 agenthub_plugins.description 和 agenthub_announcements.content 
-- 中的 HTML 内容转换为 Markdown 格式

BEGIN;

-- 辅助函数：HTML → Markdown 基本转换
CREATE OR REPLACE FUNCTION html_to_markdown(html TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    IF html IS NULL OR html = '' THEN
        RETURN '';
    END IF;

    result := html;

    -- 替换常见 HTML 标签为 Markdown 语法
    result := regexp_replace(result, '<br\s*/?>', E'\n', 'gi');
    result := regexp_replace(result, '</p>\s*<p[^>]*>', E'\n\n', 'gi');
    result := regexp_replace(result, '</?(p|div)[^>]*>', '', 'gi');

    -- 标题
    result := regexp_replace(result, '<h1[^>]*>(.*?)</h1>', E'# \\1\n\n', 'gi');
    result := regexp_replace(result, '<h2[^>]*>(.*?)</h2>', E'## \\1\n\n', 'gi');
    result := regexp_replace(result, '<h3[^>]*>(.*?)</h3>', E'### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h4[^>]*>(.*?)</h4>', E'#### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h5[^>]*>(.*?)</h5>', E'##### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h6[^>]*>(.*?)</h6>', E'###### \\1\n\n', 'gi');

    -- 加粗和斜体
    result := regexp_replace(result, '<strong[^>]*>(.*?)</strong>', '**\\1**', 'gi');
    result := regexp_replace(result, '<b[^>]*>(.*?)</b>', '**\\1**', 'gi');
    result := regexp_replace(result, '<em[^>]*>(.*?)</em>', '*\\1*', 'gi');
    result := regexp_replace(result, '<i[^>]*>(.*?)</i>', '*\\1*', 'gi');

    -- 链接
    result := regexp_replace(result, '<a[^>]*href="(.*?)"[^>]*>(.*?)</a>', '[\\2](\\1)', 'gi');

    -- 列表
    result := regexp_replace(result, '</li>\s*<li[^>]*>', E'\n- ', 'gi');
    result := regexp_replace(result, '<li[^>]*>(.*?)</li>', E'- \\1', 'gi');
    result := regexp_replace(result, '</?(ul|ol)[^>]*>', E'\n', 'gi');

    -- 代码
    result := regexp_replace(result, '<code[^>]*>(.*?)</code>', '`\\1`', 'gi');
    result := regexp_replace(result, '<pre[^>]*><code[^>]*>(.*?)</code></pre>', E'\n```\n\\1\n```\n', 'gi');

    -- 删除线和下划线
    result := regexp_replace(result, '<del[^>]*>(.*?)</del>', '~~\\1~~', 'gi');
    result := regexp_replace(result, '<s[^>]*>(.*?)</s>', '~~\\1~~', 'gi');
    result := regexp_replace(result, '<u[^>]*>(.*?)</u>', '\\1', 'gi');

    -- 去除其他 HTML 标签（保留内容）
    result := regexp_replace(result, '<[^>]+>', '', 'gi');

    -- HTML 实体解码
    result := regexp_replace(result, '&amp;', '&', 'gi');
    result := regexp_replace(result, '&lt;', '<', 'gi');
    result := regexp_replace(result, '&gt;', '>', 'gi');
    result := regexp_replace(result, '&quot;', '"', 'gi');
    result := regexp_replace(result, '&#39;', '''', 'gi');
    result := regexp_replace(result, '&nbsp;', ' ', 'gi');

    -- 清理多余空白行
    result := regexp_replace(result, E'\n{3,}', E'\n\n', 'g');
    result := trim(result);

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 迁移插件描述
UPDATE agenthub_plugins
SET description = html_to_markdown(description)
WHERE description LIKE '%<%>%';

-- 迁移公告内容
UPDATE agenthub_announcements
SET content = html_to_markdown(content)
WHERE content LIKE '%<%>%';

-- 清理辅助函数
DROP FUNCTION IF EXISTS html_to_markdown;

COMMIT;

-- ==================== DOWN ====================
-- 回滚：如果需要在 Supabase 中手动回滚，以下 SQL 作为参考

-- BEGIN;
-- ROLLBACK 无法直接回滚已执行的 UPDATE，需要从备份恢复
-- ROLLBACK;
```

- [ ] **步骤 2：Commit**

```bash
cd /Users/calwang/dev/插件市场_new && git add frontend/supabase/migrations/005_migrate_html_to_markdown.sql && git commit -m "chore: 添加 HTML → Markdown 数据迁移脚本"
```

---

### 任务 10：验证

**文件：** 无新增，全面验证。

- [ ] **步骤 1：TypeScript 编译检查**

```bash
cd /Users/calwang/dev/插件市场_new/frontend && npx tsc --noEmit 2>&1 | head -50
```

预期：无类型错误（如有 cherry-markdown 类型缺失警告可忽略）。

- [ ] **步骤 2：Next.js 构建检查**

```bash
cd /Users/calwang/dev/插件市场_new/frontend && npm run build 2>&1 | tail -30
```

预期：构建成功。

- [ ] **步骤 3：检查是否有未跟踪文件**

```bash
cd /Users/calwang/dev/插件市场_new && git status
```

- [ ] **步骤 4：如有遗留问题，修复后 commit**

---

## 自检

**1. 规格覆盖度：**
- ✅ 安装 cherry-markdown → 任务 1
- ✅ CherryMarkdownEditor 组件 → 任务 2
- ✅ MarkdownRenderer 组件 → 任务 3
- ✅ 改造管理后台插件页面 → 任务 4
- ✅ 改造管理后台公告页面 → 任务 5
- ✅ 改造插件市场首页 → 任务 6
- ✅ 改造插件详情页 → 任务 7
- ✅ 适配公告 Hero 组件 → 任务 8
- ✅ 数据库迁移脚本 → 任务 9
- ✅ 验证 → 任务 10

**2. 占位符扫描：** 无 TODO、TBD 或 "后续实现"。所有步骤均有具体代码。

**3. 类型一致性：** CherryMarkdownEditor 接口 value/onChange 在各调用处保持一致；MarkdownRenderer content/className 在各调用处一致。
