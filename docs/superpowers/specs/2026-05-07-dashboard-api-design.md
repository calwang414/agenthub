# 仪表盘数据 API 化

**日期：** 2026-05-07
**状态：** 设计中

## 目标

将管理后台仪表盘页面从硬编码数据改为调用 `GET /api/plugins` 实时计算统计值和最近活动。

## 方案：客户端 fetch（方案 A）

保持 `"use client"` 组件，通过 `apiGet("/api/plugins")` 获取 Supabase 真实数据，前端计算聚合值。

### 改动范围

仅修改 `frontend/src/app/admin/page.tsx` 一个文件。

### 数据来源

- `GET /api/plugins` → Supabase `agenthub_plugins` 表全量数据
- 数据格式与 mock `plugins.ts` 的 `Plugin` 接口一致

### 统计卡片计算逻辑

| 卡片 | 计算方式 |
|------|---------|
| 插件总数 | `plugins.length` |
| 已上架 | `plugins.filter(p => p.status === "published").length` |
| 总下载量 | `sum(plugins.downloads)` → 格式化 ≥10000 为 `"X.Xw"` |
| 待审核 | `plugins.filter(p => p.status === "reviewing").length` |

### 最近活动

- 按 `updatedAt` 降序排序，取前 5 条
- 显示格式：`"{name} {version} 已更新"`

### 状态处理

- **加载中**：统计卡片显示骨架屏或 "--"
- **加载失败**：统计卡片显示 "--"，活动列表显示空状态文案 "加载失败，请刷新重试"
- **数据为空**：统计卡片全为 0，活动列表显示 "暂无活动"

### 未纳入范围

- 不新增 `/api/dashboard/stats` 端点（过度设计）
- 不动其他 mock 数据页面（分类管理、用户管理）
- 不改动统计卡片的视觉样式
