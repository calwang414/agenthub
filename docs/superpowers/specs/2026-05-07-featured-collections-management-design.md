# 插件管理 - 加入/取消精选合集 设计规格

## 需求概述

在插件管理列表页（`/admin/plugins`）的操作按钮中，增加"加入精选"和"取消精选"功能。用户可以将插件加入精选专题合集，或从合集中移除。

## 核心约束

- 一个插件可以同时属于多个精选专题合集
- "取消精选"支持批量多选移除
- 插件行上需展示已加入的合集标签

## 设计决策

### 方案：单一同步端点

采用 `POST /api/featured-collections/plugins/featured-update` 端点，统一处理"加入精选"和"取消精选"两个操作。前端发送最终期望的合集 ID 列表，后端比对后执行增删。

## 数据模型

### 现有表：`agenthub_featured_collections`

| 字段 | 类型 | 说明 |
|------|------|------|
| id | UUID | 主键 |
| title | TEXT | 合集名称 |
| description | TEXT | 合集描述 |
| plugin_ids | JSONB | UUID 数组，该合集包含的插件 |

### 新增类型

```typescript
// lib/types.ts
export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  pluginIds: string[];
}
```

## API 设计

### `POST /api/featured-collections/plugins/featured-update`

请求体：
```json
{
  "pluginId": "uuid",
  "collectionIds": ["uuid1", "uuid2"]
}
```

后端逻辑：
1. 查询所有合集记录
2. 遍历每个合集：
   - 若 `pluginId` 在 `collectionIds` 中但不在当前合集的 `plugin_ids` 中 → 追加
   - 若 `pluginId` 不在 `collectionIds` 中但存在于当前合集的 `plugin_ids` 中 → 移除
   - 否则不变
3. 返回 `{ success: true, data: { addedTo: [...], removedFrom: [...] } }`

响应：
```json
{
  "success": true,
  "data": {
    "addedTo": ["集合1", "集合2"],
    "removedFrom": []
  }
}
```

## 前端设计

### 数据加载

在 `AdminPluginsPage` 中：
- 新增 `fetchCollections()` 调用 `GET /api/featured-collections`
- 新增 state: `allCollections: FeaturedCollection[]`
- 通过 `useMemo` 计算 `pluginCollectionsMap: Record<string, string[]>`（插件 ID → 合集 ID 列表）

### 按钮规则

| 按钮 | 显示条件 | 行为 |
|------|----------|------|
| 加入精选 | 始终显示 | 打开合集选择弹窗，列出全部合集，当前已加入的预勾选 |
| 取消精选 | 插件已加入 ≥1 个合集 | 打开合集选择弹窗，仅列出已加入的合集，全部预勾选 |

按钮样式与现有"编辑/上架/删除"一致（`text-xs`，hover 变色）。

### 合集标签

在每个插件行的名称描述下方展示已加入的合集标签：

```tsx
<span className="px-1.5 py-0.5 bg-[#cc785c]/10 text-[#cc785c] rounded text-[10px]">
  开发工具合集
</span>
```

### 弹窗设计

"加入精选"和"取消精选"共用一个弹窗组件，通过传入的 props 区分模式。沿用现有删除确认弹窗的 UI 模式（fixed overlay + 圆角卡片），包含：

- 标题：根据模式动态显示"加入精选合集" / "取消精选合集"
- "加入"模式下：列出全部合集，已加入的预勾选
- "取消"模式下：仅列出已加入的合集，全部预勾选
- 合集列表：每行 `checkbox` + 标题 + 描述
- 底部："取消"按钮 + "确认"按钮（珊瑚色）

## 文件变更清单

| 操作 | 文件 | 说明 |
|------|------|------|
| 新增 | `src/app/api/featured-collections/plugins/featured-update/route.ts` | POST 同步端点 |
| 修改 | `src/lib/types.ts` | 新增 `FeaturedCollection` 类型 |
| 修改 | `src/app/admin/plugins/page.tsx` | 新增按钮、弹窗、标签、数据加载 |

## 错误处理

- API 调用失败时，使用现有 `addToast()` 提示错误
- 同步操作后刷新合集数据和插件列表，确保 UI 一致性
- 弹窗内确认按钮操作中禁用重复提交（saving 状态）
