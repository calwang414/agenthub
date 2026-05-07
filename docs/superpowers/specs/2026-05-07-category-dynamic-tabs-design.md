# 分类管理 API 迁移 + 市场 Tab 动态化 设计文档

**日期：** 2026-05-07
**状态：** 已批准

---

## 目标

1. 分类管理后台页面从前端 mock 数据切换到 `/api/categories` API
2. 插件市场首页的分类 Tab 从硬编码改为动态获取分类数据
3. 插件管理后台的分类筛选器同步改为动态获取

---

## 架构

```
                  ┌─────────────────────────────┐
                  │     /api/categories          │
                  │  (toCamelCase → 返回 camelCase) │
                  └──────────────┬──────────────┘
                                 │
          ┌──────────────────────┼──────────────────────┐
          ▼                      ▼                      ▼
  ┌───────────────┐    ┌─────────────────┐    ┌─────────────────┐
  │ admin/categories│   │ marketplace/page │    │ admin/plugins   │
  │ (分类管理 CRUD) │   │ (市场 Tab 筛选)  │    │ (插件分类筛选)  │
  └───────────────┘    └─────────────────┘    └─────────────────┘
```

所有页面统一通过 `apiGet("/api/categories")` 获取分类列表。

---

## API 响应格式（camelCase）

经过 `toCamelCase` 转换后，API 返回：

```json
{
  "success": true,
  "data": [
    {
      "id": "uuid-1",
      "name": "Skill",
      "icon": "🧩",
      "description": "可复用的技能模块...",
      "pluginCount": 3,
      "sortOrder": 1,
      "status": "enabled",
      "createdAt": "2025-11-05T00:00:00Z",
      "updatedAt": "2026-04-19T00:00:00Z"
    }
  ]
}
```

---

## 改动点

### 1. API 路由层（camelCase 转换）

**文件：** `api/categories/route.ts`、`api/categories/[id]/route.ts`

- GET 列表/单条响应使用 `toCamelCaseArray` / `toCamelCase` 转换
- POST/PUT 响应同样转换

### 2. 分类管理后台页面

**文件：** `admin/categories/page.tsx`

- 移除 `import from mock/categories`
- 添加 `apiGet/apiPost/apiPut/apiDelete` 导入
- 添加 `fetchCategories` + loading 状态
- 新增/编辑/删除/排序均改为异步调用 API
- `createdAt` 格式化展示

### 3. 插件市场首页

**文件：** `marketplace/page.tsx`

- 移除硬编码 `CATEGORY_OPTIONS`、`CATEGORY_ICONS`、`CATEGORY_COLORS`
- `useEffect` 中调用 `apiGet` 获取分类列表
- Tab 渲染改为动态：`["全部", ...categories.map(c => c.name)]`
- 图标直接用 `category.icon`
- 颜色改为基于分类名称的哈希算法

### 4. 插件管理后台

**文件：** `admin/plugins/page.tsx`

- 移除硬编码 `CATEGORY_OPTIONS`
- `useEffect` 中调用 `apiGet` 获取分类列表
- 分类筛选下拉改为动态生成

---

## 颜色生成算法

```typescript
const CATEGORY_COLOR_PALETTE = [
  "bg-[#5db8a6]/12 text-[#5db8a6]",
  "bg-[#cc785c]/12 text-[#cc785c]",
  "bg-[#e8a55a]/12 text-[#d4a017]",
  "bg-[#8e8b82]/12 text-[#6c6a64]",
  "bg-[#252523]/12 text-[#252523]",
  "bg-[#5db872]/12 text-[#5db872]",
  "bg-[#7b6fde]/12 text-[#7b6fde]",
  "bg-[#de6f9c]/12 text-[#de6f9c]",
];

function getCategoryColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return CATEGORY_COLOR_PALETTE[Math.abs(hash) % CATEGORY_COLOR_PALETTE.length];
}
```

---

## 数据流

```
页面加载 → fetchCategories() → setCategoryList(camelCase数据)
                                    │
                    ┌───────────────┼───────────────┐
                    ▼               ▼               ▼
              表格/卡片展示    Tab/筛选器渲染    插件按分类过滤
              CRUD 操作       categoryFilter      p.category === name
```

---

## 边界处理

- **分类为空**：仅显示"全部"选项
- **API 失败**：toast 提示，不崩溃
- **排序冲突**：上下移动时调用两次 PUT，然后重新 fetch 确保一致性
- **日期格式**：API 返回 ISO 字符串，前端 `formatDate` 转为 `YYYY-MM-DD` 展示
