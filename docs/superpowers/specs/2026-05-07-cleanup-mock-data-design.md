# 清理 Mock 数据和类型迁移

**日期：** 2026-05-07
**状态：** 已确认

## 目标

删除所有 mock 运行时数据，将类型定义从 `@/lib/mock/` 迁移到 `@/lib/types.ts`，清理 `@/lib/mock/` 整个目录。

## 方案 A：类型迁移 + 目录删除

### 操作清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新建 | `frontend/src/lib/types.ts` | 汇集所有类型定义 |
| 删除 | `frontend/src/lib/mock/` 全部 8 个文件 | 类型已迁走，mock 数据无运行时引用 |
| 修改 | 8 个源码文件 | 11 处 `import type` 路径更新 |

### 迁移的类型定义

| 类型 | 来源文件 | 引用方数量 |
|------|---------|-----------|
| `Plugin` | mock/plugins.ts | 4 |
| `Tag` | mock/tags.ts | 2 |
| `Category` | mock/categories.ts | 1 |
| `Announcement` | mock/notifications.ts | 4 |
| `NotificationRecord` | mock/notifications.ts | 1 |
| `Review` | mock/marketplace.ts | 1 |
| `VersionEntry` | mock/marketplace.ts | 0 |
| `DeveloperInfo` | mock/marketplace.ts | 0 |
| `PluginDetail` | mock/marketplace.ts | 0 |
| `MockUser` | mock/users.ts | 0 |
| `MockProduct` | mock/products.ts | 0 |

### import 路径变更

| 文件 | 旧路径 | 新路径 |
|------|--------|--------|
| `admin/page.tsx` | `@/lib/mock/plugins` | `@/lib/types` |
| `admin/plugins/page.tsx` | `@/lib/mock/plugins`, `@/lib/mock/tags` | `@/lib/types` |
| `admin/tags/page.tsx` | `@/lib/mock/tags` | `@/lib/types` |
| `admin/notifications/page.tsx` | `@/lib/mock/notifications` | `@/lib/types` |
| `marketplace/page.tsx` | `@/lib/mock/plugins`, `@/lib/mock/notifications` | `@/lib/types` |
| `marketplace/[id]/page.tsx` | `@/lib/mock/marketplace`, `@/lib/mock/plugins` | `@/lib/types` |
| `announcement-banner.tsx` | `@/lib/mock/notifications` | `@/lib/types` |
| `announcement-hero.tsx` | `@/lib/mock/notifications` | `@/lib/types` |

### 未纳入范围

- 不修改类型定义本身（interface 字段不变）
- 不动 `docs/` 下的历史文档引用
- 不动 `.gitignore` 或构建配置
