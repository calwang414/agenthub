# 插件文件上传与安装下载 设计文档

**日期：** 2026-05-07
**状态：** 已批准

---

## 目标

1. 实现插件安装包、多张封面图的上传，文件路径存入插件表
2. 实现安装包下载功能（浏览器直接下载）
3. 修复 Storage bucket 缺少 UPDATE 策略导致图标覆盖上传静默失败的问题

---

## 架构

```
┌──────────────────────────────────────────────────┐
│                    前端                           │
│  admin/plugins: 图标上传 + 安装包 + 多封面图上传     │
│  marketplace/[id]: "安装" → 触发浏览器下载         │
└──────────┬───────────────────┬───────────────────┘
           │ FormData          │ GET
           ▼                   ▼
┌──────────────────┐  ┌────────────────────────┐
│ POST /api/plugins│  │ GET /api/plugins       │
│       /upload    │  │       /[id]/install    │
│                  │  │                        │
│ 1.INSERT plugin  │  │ 1.查 package_file      │
│ 2.upload package │  │ 2.Storage.getPublicUrl │
│ 3.upload covers  │  │ 3.302 重定向下载        │
│ 4.UPDATE paths   │  └────────────────────────┘
└────────┬─────────┘
         │
         ▼
┌──────────────────┐
│  Supabase Storage │
│  agenthub bucket  │
│  icons/           │
│  packages/        │
│  covers/          │
└──────────────────┘
```

---

## 数据库变更（003 迁移）

```sql
-- 添加文件相关列
ALTER TABLE public.agenthub_plugins 
  ADD COLUMN IF NOT EXISTS package_file TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_images JSONB DEFAULT '[]'::jsonb;

-- 添加 Storage UPDATE 策略（修复图标覆盖上传）
CREATE POLICY "Authenticated users can update icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'agenthub' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');
```

---

## API 设计

### 1. `POST /api/plugins/upload`

**请求：** `multipart/form-data`

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `name` | text | ✅ | 插件名称 |
| `description` | text | | 描述 |
| `version` | text | | 版本号 |
| `author` | text | | 作者 |
| `category` | text | | 分类 |
| `tags` | text[] | | 标签数组 |
| `package` | file | | 安装包 .zip/.tar.gz/.tgz |
| `coverImages` | file[] | | 多张封面图 |

**处理流程：**

1. 解析 `request.formData()`，分离文本字段和文件字段
2. `INSERT` 插件记录到 `agenthub_plugins`，获得 `pluginId`
3. 若 `package` 存在：上传到 `packages/{pluginId}.{ext}`
4. 若 `coverImages` 存在：遍历上传到 `covers/{pluginId}_{i}.{ext}`，收集路径数组
5. `UPDATE` 回写 `package_file`、`cover_images` 到插件表
6. 返回 camelCase 的 Plugin JSON

**响应：** `{ success: true, data: Plugin }` 201

### 2. `GET /api/plugins/[id]/install`

**处理流程：**

1. 查询插件 `package_file` 字段
2. 若为空 → 404 `{ error: "该插件无可下载的安装包" }`
3. 通过 `supabase.storage.from("agenthub").getPublicUrl(path)` 获取公开 URL
4. `302` 重定向到下载 URL

---

## 前端改动

### admin/plugins/page.tsx

- 封面图上传改为 `multiple`（多选）
- 封面图预览改为横向滚动缩略图列表（最多 5 张）
- `coverImageFile` 状态从单个 `File | null` 改为 `File[]`
- `coverImagePreview` 状态从单个 `string | null` 改为 `string[]`
- `handleSave` 中构造 FormData 时遍历 `coverImages` 数组逐个 append

### marketplace/[id]/page.tsx（额外）

- 封面图展示区域改为多图轮播/横向滚动

---

## 文件结构

| 文件 | 操作 | 说明 |
|------|------|------|
| `supabase/migrations/003_add_plugin_files.sql` | 新建 | 添加列 + Storage UPDATE 策略 |
| `src/app/api/plugins/upload/route.ts` | 新建 | upload API |
| `src/app/api/plugins/[id]/install/route.ts` | 新建 | install 下载 API |
| `src/app/admin/plugins/page.tsx` | 修改 | 多封面图上传 |
| `src/app/marketplace/[id]/page.tsx` | 修改 | 多封面图展示 |
