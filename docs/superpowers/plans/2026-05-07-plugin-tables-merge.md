# 合并 Plugin 两张表实现计划

> **面向 AI 代理的工作者：** 必需子技能：使用 superpowers:subagent-driven-development（推荐）或 superpowers:executing-plans 逐任务实现此计划。步骤使用复选框（`- [ ]`）语法来跟踪进度。

**目标：** 将 `agenthub_plugin_details` 中活跃字段合并到 `agenthub_plugins`，删除废弃表和字段，补齐管理端表单（readme、changelog、版本历史自动记录），描述改用普通 textarea。

**架构：** 插件数据从两表 1:1 扩展合并为单表，API 层删除 `/api/plugins/[id]/detail` 端点，前端数据源从双 API 改为单一 `/api/plugins/[id]`。

**技术栈：** PostgreSQL (Supabase), TypeScript, Next.js API Routes, React

---

### 任务 1：数据库迁移 — 新增字段、迁移数据、删除旧表

**文件：**
- 创建：`frontend/supabase/migrations/006_merge_plugin_details.sql`
- 修改：`frontend/supabase/migrations/002_seed_data.sql`

- [ ] **步骤 1：创建 migration 文件**

```sql
-- 006_merge_plugin_details.sql
-- 将 agenthub_plugin_details 活跃字段合并到 agenthub_plugins，删除旧表

ALTER TABLE public.agenthub_plugins
  ADD COLUMN IF NOT EXISTS readme TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS changelog TEXT DEFAULT '';

UPDATE public.agenthub_plugins p
SET
  readme = d.readme,
  reviews = d.reviews,
  version_history = d.version_history
FROM public.agenthub_plugin_details d
WHERE p.id = d.plugin_id;

DROP POLICY IF EXISTS "Plugin details viewable by all" ON public.agenthub_plugin_details;
DROP POLICY IF EXISTS "Editors can manage plugin details" ON public.agenthub_plugin_details;
DROP TABLE IF EXISTS public.agenthub_plugin_details;
```

- [ ] **步骤 2：更新种子数据 — 修改 002_seed_data.sql 的 plugins INSERT**

将 `agenthub_plugins` 的 INSERT 语句列清单增加 `readme, reviews, version_history`：

```sql
-- 修改前（第7-20行）：
INSERT INTO public.agenthub_plugins (id, name, description, version, author, category, downloads, rating, status, tags, icon, created_at, updated_at) VALUES

-- 修改后：
INSERT INTO public.agenthub_plugins (id, name, description, version, author, category, downloads, rating, status, tags, icon, readme, reviews, version_history, created_at, updated_at) VALUES
```

然后将原来每个 plugin_id 对应的 `agenthub_plugin_details` 行中的 `readme`、`reviews`、`version_history` 值合并到对应的 INSERT values 中。

例如第一条 seed（`a0000001`）：
```sql
('a0000001-0000-0000-0000-000000000001', '智能代码审查', '基于 AI 的代码审查工具，自动检测潜在 bug 和优化建议', '2.1.0', 'DevTools Lab', 'Tool', 12580, 4.8, 'published', '["代码审查","AI 对话"]', '',
  '# 智能代码审查\n\n基于 AI 的代码审查工具，自动检测潜在 bug 和优化建议。\n\n## 主要特性\n\n- 支持多种编程语言（TypeScript、Python、Go、Rust 等）\n- 实时检测代码质量问题\n- 提供智能修复建议\n- 支持自定义审查规则\n\n```bash\nconst review = await aiReview.analyze({\n  files: ["src/**/*.ts"],\n  severity: "high"\n});\n```',
  '[{"id":"r1","userName":"张三","userAvatar":"ZS","rating":5,"content":"非常好用的代码审查工具，检测准确率很高，强烈推荐！","date":"2026-04-25"},{"id":"r2","userName":"李四","userAvatar":"LS","rating":4,"content":"日常开发必备，节省了大量 code review 时间。希望后续支持更多语言。","date":"2026-04-20"},{"id":"r3","userName":"王五","userAvatar":"WW","rating":5,"content":"集成到 CI/CD 流程后，代码质量明显提升。Bug 检测能力很强。","date":"2026-04-15"}]',
  '[{"version":"2.1.0","date":"2026-04-20","changelog":["新增 Rust 语言支持","优化检测算法，误报率降低 30%","新增自定义规则导入功能"]},{"version":"2.0.0","date":"2026-04-01","changelog":["重构检测引擎","新增 Go 语言支持","支持批量审查"]},{"version":"1.0.0","date":"2026-03-15","changelog":["首个正式版本发布","支持 TypeScript 和 Python"]}]',
  '2026-03-15T00:00:00+08:00', '2026-04-20T00:00:00+08:00'),
```

对所有 9 条有 detail 数据的 seed（a0000001-a0000004, a0000006, a0000007, a0000009, a0000010, a0000012）同样操作。a0000005/a0000008/a0000011 没有 detail 数据，readme/reviews/version_history 填空字符串和空数组。

- [ ] **步骤 3：删除 `agenthub_plugin_details` 的种子数据区块**

删除 002_seed_data.sql 的第 62-145 行（整段 `-- ==================== 插件详情数据 ====================` 及其 INSERT 语句）。

- [ ] **步骤 4：Commit**

```bash
git add frontend/supabase/migrations/006_merge_plugin_details.sql frontend/supabase/migrations/002_seed_data.sql
git commit -m "feat: 合并 plugin details 到 plugins 主表，删除旧表"
```

---

### 任务 2：更新 TypeScript 类型定义

**文件：**
- 修改：`frontend/src/lib/types.ts`

- [ ] **步骤 1：Plugin 接口新增字段**

在 `Plugin` 接口中添加 `readme`、`reviews`、`versionHistory`、`changelog`：

```typescript
export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: string;
  downloads: number;
  rating: number;
  status: "published" | "draft" | "reviewing";
  tags: string[];
  icon?: string;
  packageFile?: string;
  coverImages?: string[];
  readme: string;
  reviews: Review[];
  versionHistory: VersionEntry[];
  changelog: string;
  createdAt: string;
  updatedAt: string;
}
```

- [ ] **步骤 2：删除 PluginDetail 接口和 DeveloperInfo 接口**

删除第 88-103 行的 `DeveloperInfo` 和 `PluginDetail` 接口定义。

- [ ] **步骤 3：保留 Review 和 VersionEntry 接口**

`Review`（第 73-80 行）和 `VersionEntry`（第 82-86 行）保持不变，因为它们被 `Plugin` 接口引用。

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/lib/types.ts
git commit -m "feat: Plugin 类型新增 readme/reviews/versionHistory/changelog，删除 PluginDetail"
```

---

### 任务 3：删除 detail API 端点

**文件：**
- 删除：`frontend/src/app/api/plugins/[id]/detail/route.ts`

- [ ] **步骤 1：删除 detail 路由文件**

```bash
rm frontend/src/app/api/plugins/[id]/detail/route.ts
# 如果目录为空，也删除目录
rmdir frontend/src/app/api/plugins/\[id\]/detail 2>/dev/null || true
```

- [ ] **步骤 2：Commit**

```bash
git add -A
git commit -m "feat: 删除 GET /api/plugins/[id]/detail 端点"
```

---

### 任务 4：修改 GET /api/plugins 列表 — 排除大字段

**文件：**
- 修改：`frontend/src/app/api/plugins/route.ts`

- [ ] **步骤 1：列表查询排除重字段**

将 GET 方法的 `.select("*")` 改为精确列选择，排除 `readme`、`reviews`、`version_history`、`changelog`：

```typescript
const { data, error: err } = await supabase
  .from("agenthub_plugins")
  .select("id, name, description, version, author, category, downloads, rating, status, tags, icon, package_file, cover_images, created_at, updated_at")
  .order("created_at", { ascending: false });
```

- [ ] **步骤 2：删除 JSON body 中 description 的 trim，保持不变**

POST 方法中 `description: body.description || ""` 保持不变即可。

POST 方法新增 `readme` 和 `changelog` 字段（后续任务会在 POST 中补充）。

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/plugins/route.ts
git commit -m "feat: 列表查询排除 readme/reviews/version_history/changelog 大字段"
```

---

### 任务 5：修改 GET/PUT /api/plugins/[id] — 支持新字段

**文件：**
- 修改：`frontend/src/app/api/plugins/[id]/route.ts`

- [ ] **步骤 1：GET 保持不变**

当前 GET 已经是 `.select("*")`，数据库新增字段后自动返回全量字段，无需修改。

- [ ] **步骤 2：PUT 新增字段支持**

在 PUT 方法的 updates 对象中，`body.coverImages` 之后添加：

```typescript
if (body.readme !== undefined) updates.readme = body.readme;
if (body.reviews !== undefined) updates.reviews = body.reviews;
if (body.versionHistory !== undefined) updates.version_history = body.versionHistory;
if (body.changelog !== undefined) updates.changelog = body.changelog;
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/plugins/\[id\]/route.ts
git commit -m "feat: PUT /api/plugins/[id] 支持 readme/reviews/version_history/changelog"
```

---

### 任务 6：修改 POST /api/plugins 和 POST /api/plugins/upload — 支持新字段

**文件：**
- 修改：`frontend/src/app/api/plugins/route.ts`（POST 部分）
- 修改：`frontend/src/app/api/plugins/upload/route.ts`

- [ ] **步骤 1：POST /api/plugins 新增 readme 和 changelog**

在 POST 方法的 `.insert()` 对象中，`icon: body.icon || ""` 之后添加：

```typescript
readme: body.readme || "",
changelog: body.changelog || "",
```

- [ ] **步骤 2：POST /api/plugins/upload 新增 readme 和 changelog**

从 FormData 中读取：

```typescript
const readme = (formData.get("readme") as string) || "";
const changelog = (formData.get("changelog") as string) || "";
```

在 `.insert()` 对象中，`tags` 之后添加：

```typescript
readme: readme.trim(),
changelog: changelog.trim(),
```

- [ ] **步骤 3：Commit**

```bash
git add frontend/src/app/api/plugins/route.ts frontend/src/app/api/plugins/upload/route.ts
git commit -m "feat: POST /api/plugins 和 upload 支持 readme/changelog 字段"
```

---

### 任务 7：改造管理端表单 — formData 新增字段 + 控件替换

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

这是改动最大的任务，分解为 7 个子步骤。

- [ ] **步骤 1：formData 状态新增 readme 和 changelog**

将第 93-100 行：

```typescript
const [formData, setFormData] = useState({
  name: "",
  description: "",
  version: "1.0.0",
  author: "",
  category: "Skill",
  tags: [] as string[],
});
```

改为：

```typescript
const [formData, setFormData] = useState({
  name: "",
  description: "",
  version: "1.0.0",
  author: "",
  category: "Skill",
  tags: [] as string[],
  readme: "",
  changelog: "",
});
```

- [ ] **步骤 2：openAddModal 初始化新字段**

第 351 行，`setFormData(...)` 中增加：

```typescript
setFormData({ name: "", description: "", version: "1.0.0", author: "", category: "Skill", tags: [], readme: "", changelog: "" });
```

- [ ] **步骤 3：openEditModal 回填新字段**

第 370-377 行，`setFormData(...)` 中增加：

```typescript
setFormData({
  name: plugin.name,
  description: plugin.description,
  version: plugin.version,
  author: plugin.author,
  category: plugin.category,
  tags: plugin.tags,
  readme: plugin.readme || "",
  changelog: plugin.changelog || "",
});
```

- [ ] **步骤 4：description 控件从 CherryMarkdownEditor 改为 textarea**

将第 1154-1165 行：

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

改为：

```tsx
<div>
  <label className="block text-sm text-[#3d3d3a] mb-1.5">描述</label>
  <textarea
    value={formData.description}
    onChange={(e) => setFormData((f) => ({ ...f, description: e.target.value }))}
    placeholder="简要描述插件功能…"
    rows={4}
    className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 resize-y"
  />
</div>
```

- [ ] **步骤 5：新增 readme 字段 — Markdown 编辑器**

在描述 textarea 之后、作者/版本号 grid 之前插入：

```tsx
<div>
  <label className="block text-sm text-[#3d3d3a] mb-1.5">详细介绍（README）</label>
  <div className="border border-[#e6dfd8] rounded-lg overflow-hidden">
    <CherryMarkdownEditor
      value={formData.readme}
      onChange={(md) =>
        setFormData((f) => ({ ...f, readme: md }))
      }
      placeholder="编写插件的详细介绍，支持 Markdown 格式…"
      height="320px"
    />
  </div>
</div>
```

- [ ] **步骤 6：新增 changelog 字段 — 在版本号旁边**

在版本号的 input 之后、分类 select 之前插入：

```tsx
<div>
  <label className="block text-sm text-[#3d3d3a] mb-1.5">变更说明</label>
  <textarea
    value={formData.changelog}
    onChange={(e) => setFormData((f) => ({ ...f, changelog: e.target.value }))}
    placeholder="本次版本的变更说明…（修改版本号后，旧变更说明会自动归档到版本历史）"
    rows={3}
    className="w-full px-3 py-2.5 bg-[#faf9f5] border border-[#e6dfd8] rounded-lg text-sm text-[#141413] placeholder-[#8e8b82] focus:outline-none focus:border-[#cc785c] focus:ring-2 focus:ring-[#cc785c]/15 resize-y"
  />
</div>
```

（注意：这个插入位置是版本号那一行的 grid 之后、分类之前，即第 1188 行 `<div><label>分类</label>...` 之前。）

- [ ] **步骤 7：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: 管理端表单新增 readme/changelog 字段，描述改用 textarea"
```

---

### 任务 8：改造管理端 handleSave — 版本历史自动记录 + 新字段写入

**文件：**
- 修改：`frontend/src/app/admin/plugins/page.tsx`

- [ ] **步骤 1：编辑模式 — 版本历史自动记录逻辑**

在 `handleSave` 函数中 `if (editingPlugin)` 分支里，构造 `updatePayload` 之后、`const storageToDelete` 之前，插入版本历史归档逻辑：

```typescript
if (editingPlugin) {
  const updatePayload: Record<string, unknown> = {
    name: formData.name.trim(),
    description: formData.description.trim(),
    version: formData.version.trim(),
    author: formData.author.trim(),
    category: formData.category,
    tags,
    readme: formData.readme,
    changelog: formData.changelog.trim(),
  };

  // 版本历史自动记录：修改版本号时将旧版本归档
  if (formData.version.trim() !== editingPlugin.version) {
    const oldEntry = {
      version: editingPlugin.version,
      date: new Date().toISOString(),
      changelog: editingPlugin.changelog ? [editingPlugin.changelog] : [],
    };
    const existingHistory = editingPlugin.versionHistory || [];
    updatePayload.versionHistory = [oldEntry, ...existingHistory];
    // 新版本已写入 changelog，旧 changelog 已归档
  } else {
    updatePayload.reviews = editingPlugin.reviews;
    updatePayload.versionHistory = editingPlugin.versionHistory;
  }

  const storageToDelete: string[] = [];
  // ... 后续文件上传逻辑保持不变 ...
```

- [ ] **步骤 2：新增模式 — FormData 上传增加 readme/changelog**

在 `if (hasFiles)` 分支的 FormData 构造中（第 681-693 行），`tags.forEach` 之后添加：

```typescript
formDataUpload.append("readme", formData.readme);
formDataUpload.append("changelog", formData.changelog.trim());
```

- [ ] **步骤 3：新增模式 — JSON 上传增加 readme/changelog**

在 `else` 分支的 `apiPost` body 中（第 706-714 行），`status: "draft"` 后面添加：

```typescript
readme: formData.readme,
changelog: formData.changelog.trim(),
```

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/app/admin/plugins/page.tsx
git commit -m "feat: handleSave 版本历史自动归档 + 新字段 readme/changelog 写入"
```

---

### 任务 9：改造市场详情页面 — 数据源切换

**文件：**
- 修改：`frontend/src/app/marketplace/[id]/page.tsx`

- [ ] **步骤 1：删除本地 PluginDetail 接口**

删除第 13-18 行：

```typescript
export interface PluginDetail {
  pluginId: string;
  readme: string;
  reviews: Review[];
  versionHistory: { version: string; date: string; changelog: string[] }[];
}
```

- [ ] **步骤 2：删除 detail state 和 detail API 调用**

第 73 行，删除 `const [detail, setDetail] = useState<PluginDetail | undefined>(undefined);`

第 87 行，删除 `apiGet<PluginDetail>(\`/api/plugins/${id}/detail\`).then(setDetail).catch(() => {});`

（异步加载改为只调用 plugins 列表 + 单个 plugin）

- [ ] **步骤 3：所有 detail?.xxx 改为 plugin?.xxx**

全局替换：
- `detail?.readme` → `plugin?.readme`
- `detail?.reviews` → `plugin?.reviews`
- `detail?.versionHistory` → `plugin?.versionHistory`
- `detail && detail.versionHistory.length > 1` → `plugin && plugin.versionHistory.length > 1`
- `detail?.versionHistory[0]` → `plugin?.versionHistory[0]`
- `detail.versionHistory.map(...)` → `plugin.versionHistory.map(...)`

- [ ] **步骤 4：Commit**

```bash
git add frontend/src/app/marketplace/\[id\]/page.tsx
git commit -m "feat: 市场详情页切换到 plugin 全量数据，删除 detail API 调用"
```

---

### 任务 10：验证

- [ ] **步骤 1：运行 TypeScript 编译检查**

```bash
cd frontend && npx tsc --noEmit
```

预期：无类型错误。如有错误，逐条修复。

- [ ] **步骤 2：检查全局引用 — 确保没有残留引用**

```bash
grep -r "agenthub_plugin_details" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "PluginDetail" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "DeveloperInfo" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "install_steps\|installSteps" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "developer_name\|developerName" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "developer_description\|developerDescription" frontend/src/ --include="*.ts" --include="*.tsx"
grep -r "developer_website\|developerWebsite" frontend/src/ --include="*.ts" --include="*.tsx"
```

预期：所有搜索都应无结果（或仅有注释/文档引用）。

- [ ] **步骤 3：运行 lint（如果项目有配置）**

```bash
cd frontend && npm run lint 2>/dev/null || echo "lint command not configured, skipping"
```

- [ ] **步骤 4：Commit 最终验证修复**

```bash
git add -A
git commit -m "chore: 清理残留引用，最终验证通过"
```
