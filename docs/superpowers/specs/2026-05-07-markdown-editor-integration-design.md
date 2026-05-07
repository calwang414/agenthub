# Markdown 编辑器集成 — 设计规格

**日期**：2026-05-07
**状态**：已批准

## 1. 概述

将现有基于 `contentEditable` 的 HTML 编辑器替换为 Cherry Markdown WYSIWYG 编辑器，同时在插件市场前端页面中将描述内容以 Markdown 格式渲染显示。

### 涉及范围
- 插件管理后台新增/编辑页：`src/app/admin/plugins/page.tsx`
- 公告管理后台新增/编辑页：`src/app/admin/notifications/page.tsx`
- 插件市场首页：`src/app/marketplace/page.tsx`
- 插件详情页：`src/app/marketplace/[id]/page.tsx`
- 公告 Hero 组件：`src/components/announcement-hero.tsx`

## 2. 方案选型

**选定方案**：Cherry Markdown（腾讯开源）

理由：
- 开箱即用的 WYSIWYG 工具栏模式
- 原生支持 mermaid 流程图、表格、链接、代码高亮、公式
- 中文文档完善，社区活跃（3k+ stars）
- 编辑器和渲染器使用同一套引擎，输出一致性好

## 3. 整体架构

```
数据库层：
  agenthub_plugins.description (TEXT)  → 存储 Markdown 字符串
  agenthub_announcements.content (TEXT) → 存储 Markdown 字符串

组件层：
  CherryMarkdownEditor (components/cherry-markdown-editor.tsx)
    ├─ 插件新增/编辑页 (admin/plugins/page.tsx)
    └─ 公告新增/编辑页 (admin/notifications/page.tsx)

  MarkdownRenderer (components/markdown-renderer.tsx)
    ├─ 插件市场首页 (marketplace/page.tsx)
    ├─ 插件详情页 (marketplace/[id]/page.tsx)
    └─ 公告 Hero 组件 (announcement-hero.tsx)

库依赖：
  cherry-markdown → WYSIWYG 编辑器 + Engine 渲染
```

## 4. 组件设计

### 4.1 CherryMarkdownEditor

**文件**：`src/components/cherry-markdown-editor.tsx`

**Props**：
```typescript
interface CherryMarkdownEditorProps {
  value: string;                  // Markdown 内容
  onChange: (md: string) => void; // 内容变化回调
  placeholder?: string;
  height?: string;                // 默认 "400px"
}
```

**实现要点**：
- `next/dynamic` 动态导入，`ssr: false`（依赖 DOM API）
- 挂载时初始化 Cherry 实例，卸载时销毁
- WYSIWYG 工具栏模式
- 工具栏按钮：加粗、斜体、删除线、标题、链接、图片、表格、代码块、引用、列表、公式、流程图(mermaid)、撤销、重做
- 图片上传对接项目已有上传 API

### 4.2 MarkdownRenderer

**文件**：`src/components/markdown-renderer.tsx`

**Props**：
```typescript
interface MarkdownRendererProps {
  content: string;
  className?: string;
}
```

**实现要点**：
- 使用 cherry-markdown 内置 Engine API 渲染 Markdown → HTML
- 与编辑器共用渲染引擎，输出一致
- mermaid 流程图开箱即用
- XSS 防护：sanitize 输出

### 4.3 渲染子方案

选用 **cherry-markdown Engine**（方案 B）而非 react-markdown，确保编辑器预览和前端渲染效果100%一致，且 mermaid 无需额外集成。

## 5. 数据迁移

### 5.1 迁移脚本

**文件**：`supabase/migrations/003_migrate_to_markdown.sql`

**策略**：编写 PL/pgSQL 函数，转换常见 HTML 标签为 Markdown 语法。

**转换映射**：

| HTML | Markdown |
|------|----------|
| `<strong>/<b>` | `**text**` |
| `<em>/<i>` | `*text*` |
| `<a href="url">` | `[text](url)` |
| `<h1>~<h6>` | `# ~ ######` |
| `<ul><li>` | `- item` |
| `<ol><li>` | `1. item` |
| `<code>` | `` `code` `` |
| `<pre><code>` | ` ``` ` 代码块 |
| `<br>` | 换行 |
| `<p>` | 段落换行 |
| 其它标签 | 保留文本内容，去除标签 |

**迁移范围**：
- `agenthub_plugins.description`
- `agenthub_announcements.content`

**含回滚**：迁移脚本包含 down 版本。

### 5.2 API 层

**无变更**。API 层透传 TEXT 字段，读写逻辑不变。

## 6. 涉及文件清单

### 新增文件
| 文件 | 说明 |
|------|------|
| `src/components/cherry-markdown-editor.tsx` | Cherry Markdown 编辑器封装组件 |
| `src/components/markdown-renderer.tsx` | Markdown → HTML 渲染组件 |
| `supabase/migrations/003_migrate_to_markdown.sql` | HTML → Markdown 数据迁移脚本 |

### 修改文件
| 文件 | 变更内容 |
|------|----------|
| `package.json` | 添加 `cherry-markdown` 依赖 |
| `src/app/admin/plugins/page.tsx` | `contentEditable` div → `CherryMarkdownEditor`；读取 `innerHTML` → 读取 Markdown |
| `src/app/admin/notifications/page.tsx` | 两处 `contentEditable` div → `CherryMarkdownEditor` |
| `src/app/marketplace/page.tsx` | description 纯文本 → `MarkdownRenderer` 渲染 |
| `src/app/marketplace/[id]/page.tsx` | description 纯文本 → `MarkdownRenderer` 渲染 |
| `src/components/announcement-hero.tsx` | 截取文本逻辑适配 Markdown（strip markdown 语法取前120字符） |

## 7. 实现顺序

1. 安装 `cherry-markdown` 依赖
2. 编写并执行数据库迁移脚本
3. 创建 `CherryMarkdownEditor` 组件
4. 创建 `MarkdownRenderer` 组件
5. 改造管理后台插件页面
6. 改造管理后台公告页面
7. 改造插件市场首页和详情页
8. 适配公告 Hero 组件
9. 验证

## 8. 风险与约束

- **Cherry Markdown 依赖 DOM**：必须通过 `next/dynamic` 动态导入，禁用 SSR
- **旧 HTML 数据迁移**：正则替换可能无法覆盖所有边界情况，需人工抽检
- **Mermaid 渲染**：需确保 Cherry Markdown 的 mermaid 在客户端正常渲染
- **XSS 安全**：MarkdownRenderer 渲染前需 sanitize HTML 输出
