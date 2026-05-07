# 合并 Plugin 两张表设计文档

## 背景

当前项目中有两张 plugin 相关表：

- `agenthub_plugins` — 插件主表（14 个字段）
- `agenthub_plugin_details` — 插件详情表（10 个字段），通过 `plugin_id` 外键 1:1 关联

存在两个问题：

1. `agenthub_plugin_details` 中 9 个业务字段中 6 个已废弃（前端不展示、管理端不可编辑），仅 `readme`、`reviews`、`version_history` 3 个字段实际使用
2. 管理端新增/编辑表单缺少 `readme` 等字段，且没有任何 API 支持写入 `agenthub_plugin_details` 表

## 目标

- 将仍在使用中的 detail 字段合并到 `agenthub_plugins` 主表
- 删除已废弃的字段和 `agenthub_plugin_details` 表
- 补齐管理端表单的编辑能力（readme、changelog、版本历史自动记录）
- 描述字段改用普通 textarea，readme 使用 Markdown 编辑器

## 数据库变更

### `agenthub_plugins` 新增字段

| 字段 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| `readme` | TEXT | `''` | 插件详细介绍（Markdown） |
| `reviews` | JSONB | `'[]'::jsonb` | 用户评价数组 |
| `version_history` | JSONB | `'[]'::jsonb` | 版本历史数组，结构 `[{version, date, changelog}]` |
| `changelog` | TEXT | `''` | 当前版本变更说明 |

### 数据迁移

从 `agenthub_plugin_details` 将现有 `readme`、`reviews`、`version_history` 数据迁移到对应 `agenthub_plugins` 行。

### 删除

- `agenthub_plugin_details` 整表及其 RLS policies
- 废弃字段：`install_steps`、`dependencies`、`developer_name`、`developer_description`、`developer_website`、`docs`

## TypeScript 类型变更

### `Plugin` 接口（`types.ts`）

新增字段：

```typescript
export interface Plugin {
  // ... 现有字段 ...
  readme: string;
  reviews: Review[];
  versionHistory: VersionEntry[];
  changelog: string;
}
```

### 删除的类型

- `PluginDetail` 接口
- `DeveloperInfo` 接口
- `Review` 和 `VersionEntry` 类型如有独立引用则保留，从 `PluginDetail` 中解耦

## API 变更

### 修改的端点

| 端点 | 变更 |
|------|------|
| `GET /api/plugins` | `.select()` 排除 `readme`、`reviews`、`version_history`、`changelog`，列表保持轻量 |
| `GET /api/plugins/[id]` | 返回全量字段，替代原 `GET /api/plugins/[id]/detail` |
| `PUT /api/plugins/[id]` | 支持写入 `readme`、`reviews`、`version_history`、`changelog` |
| `POST /api/plugins` | 支持写入 `readme`、`changelog` 初始值 |
| `POST /api/plugins/upload` | 同上 |

### 删除的端点

- `GET /api/plugins/[id]/detail` — 其功能由 `GET /api/plugins/[id]` 替代

## 管理端表单变更

### 字段控件调整

| 字段 | 原控件 | 新控件 |
|------|--------|--------|
| `description` | CherryMarkdownEditor | **textarea**（普通文本域） |
| `readme` | （不存在） | **CherryMarkdownEditor**（Markdown 编辑器） |
| `changelog` | （不存在） | **textarea**（变更说明） |

### 新增 formData 字段

```
readme: ""
changelog: ""
```

### 版本历史自动记录逻辑

在 `handleSave` 编辑模式中：

```
当 formData.version !== editingPlugin.version 时:
  1. 构造旧版本条目: {
       version: editingPlugin.version,
       date: new Date().toISOString(),
       changelog: editingPlugin.changelog || ""
     }
  2. 将该条目插入 versionHistory 数组头部
  3. 旧 changelog 已归档，新 changelog 由 formData.changelog 写入
```

## 前端市场页面变更

`marketplace/[id]/page.tsx`：

- 数据源从 `GET /api/plugins/[id]/detail` 改为 `GET /api/plugins/[id]`
- 移除本地 `PluginDetail` 接口，使用全局 `Plugin` 类型
- `detail?.readme` → `plugin?.readme`
- `detail?.reviews` → `plugin?.reviews`
- `detail?.versionHistory` → `plugin?.versionHistory`

## 种子数据变更

`002_seed_data.sql`：

- 将 detail 数据中的 `readme`、`reviews`、`version_history` 合并到插件 INSERT 语句中
- 移除 `agenthub_plugin_details` 的 INSERT 语句

## 影响范围总览

```
数据库:  新建 migration 文件 1 个
        修改 002_seed_data.sql 1 个
类型:    修改 types.ts 1 个
API:     修改 5 个，删除 1 个
管理端:   修改 admin/plugins/page.tsx 1 个
市场页:   修改 marketplace/[id]/page.tsx 1 个
```
