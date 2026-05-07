# 清理 Mock 数据实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将类型定义从 `@/lib/mock/` 迁移到 `@/lib/types.ts`，删除整个 mock 目录

**架构：** 新建 `types.ts` 汇集所有类型定义，更新 8 个文件中 11 处 import type 路径，最后删除 mock 目录

**技术栈：** TypeScript, Next.js

---

### 任务 1：新建 types.ts + 迁移所有类型定义

**文件：**
- 创建：`frontend/src/lib/types.ts`
- 修改：8 个源码文件中的 import 路径

- [ ] **步骤 1：创建 types.ts，汇集所有类型定义**

```typescript
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "Skill" | "Agent" | "Tool" | "MCP" | "Plugin";
  downloads: number;
  rating: number;
  status: "published" | "draft" | "reviewing";
  tags: string[];
  icon?: string;
  packageFile?: string;
  coverImages?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "pinned" | "normal";
  linkUrl: string;
  isDismissible: boolean;
  isActive: boolean;
  publishAt: string | null;
  expireAt: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  content: string;
  targetType: "all" | "byRole";
  targetRoles: ("admin" | "editor" | "guest")[];
  sentAt: string;
  status: "sent" | "failed";
}

export interface Review {
  id: string;
  userName: string;
  userAvatar: string;
  rating: number;
  content: string;
  date: string;
}

export interface VersionEntry {
  version: string;
  date: string;
  changelog: string[];
}

export interface DeveloperInfo {
  name: string;
  description: string;
  website: string;
}

export interface PluginDetail {
  pluginId: string;
  readme: string;
  installSteps: string[];
  dependencies: string[];
  reviews: Review[];
  versionHistory: VersionEntry[];
  developer: DeveloperInfo;
  docs: { label: string; url: string }[];
}

export interface MockUser {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
  createdAt: string;
  lastActiveAt: string;
}

export interface MockProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  status: "active" | "draft" | "archived";
}
```

- [ ] **步骤 2：更新 8 个源码文件中的 import 路径**

将以下文件中的 `import type { ... } from "@/lib/mock/..."` 替换为 `import type { ... } from "@/lib/types"`：

| 文件 | 旧路径 | 新路径 |
|------|--------|--------|
| `frontend/src/app/admin/page.tsx:6` | `@/lib/mock/plugins` | `@/lib/types` |
| `frontend/src/app/admin/plugins/page.tsx:4` | `@/lib/mock/plugins` | `@/lib/types` |
| `frontend/src/app/admin/plugins/page.tsx:5` | `@/lib/mock/tags` | `@/lib/types` |
| `frontend/src/app/admin/tags/page.tsx:4` | `@/lib/mock/tags` | `@/lib/types` |
| `frontend/src/app/admin/notifications/page.tsx:5` | `@/lib/mock/notifications` | `@/lib/types` |
| `frontend/src/app/marketplace/page.tsx:5` | `@/lib/mock/plugins` | `@/lib/types` |
| `frontend/src/app/marketplace/page.tsx:7` | `@/lib/mock/notifications` | `@/lib/types` |
| `frontend/src/app/marketplace/[id]/page.tsx:7` | `@/lib/mock/marketplace` | `@/lib/types` |
| `frontend/src/app/marketplace/[id]/page.tsx:8` | `@/lib/mock/plugins` | `@/lib/types` |
| `frontend/src/components/announcement-banner.tsx:5` | `@/lib/mock/notifications` | `@/lib/types` |
| `frontend/src/components/announcement-hero.tsx:5` | `@/lib/mock/notifications` | `@/lib/types` |

- [ ] **步骤 3：验证构建通过**

运行：`cd /Users/calwang/dev/插件市场_new/.worktrees/cleanup-mock/frontend && npx next build 2>&1 | tail -20`
预期：构建成功，无类型错误

- [ ] **步骤 4：删除 mock 目录**

```bash
rm -rf frontend/src/lib/mock
```

- [ ] **步骤 5：再次验证构建通过**

运行：`cd /Users/calwang/dev/插件市场_new/.worktrees/cleanup-mock/frontend && npx next build 2>&1 | tail -20`
预期：构建成功，mock 目录已消失仍无类型错误

- [ ] **步骤 6：Commit**

```bash
git add frontend/src/lib/types.ts
git add frontend/src/app/admin/page.tsx frontend/src/app/admin/plugins/page.tsx frontend/src/app/admin/tags/page.tsx frontend/src/app/admin/notifications/page.tsx
git add frontend/src/app/marketplace/page.tsx frontend/src/app/marketplace/\[id\]/page.tsx
git add frontend/src/components/announcement-banner.tsx frontend/src/components/announcement-hero.tsx
git add frontend/src/lib/mock/
git commit -m "refactor: 类型定义从 @/lib/mock/ 迁移到 @/lib/types.ts，删除 mock 数据目录"
```
