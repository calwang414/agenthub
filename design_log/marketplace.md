# AI 插件市场 — 需求文档

## 页面目标
为 AgentHub 平台提供面向用户的 AI 插件市场，让用户能够搜索、浏览和查看 AI 插件的详细信息。

## 页面结构

### 1. 插件市场首页 `/marketplace`

#### 英雄横幅
- 编辑型奶油画布风格，居中排版
- 珊瑚色标签 "AI 插件市场"
- Copernicus 衬线大标题
- 副标题描述
- 居中搜索栏，支持搜索插件名称、描述、作者

#### 分类筛选
- category-tab 组件风格，分类：全部 / Skill / Agent / Tool / MCP / Plugin
- 切换后过滤下方所有列表区

#### 热门插件推荐
- 6 个热门插件横向大卡片（feature-card 风格，奶油底色，圆角 12px）
- 每个卡片包含：图标、名称、描述、评分、下载量、标签

#### 下载排行榜
- Top 10 按下载量排序的列表
- 行式展示，显示排名、图标、名称、下载量、评分

#### 精选专题合集
- 2-3 个主题分组（如"开发工具合集"、"效率提升精选"）
- 每个专题内水平排列 3-4 个插件小卡片

#### 全部插件
- 奶油卡片网格，3 列布局，标签式切换分类
- 分页展示，每页 12 个
- 仅展示 status === "published" 的插件

### 2. 插件详情页 `/marketplace/[id]`

#### 插件信息头
- 图标 + 名称 + 版本号 + 分类标签 + 作者信息
- 评分（星级）+ 下载量统计
- 描述文字
- "安装" 按钮（珊瑚色 primary CTA）

#### 截图/演示区域
- 深色代码窗口风格展示区域（product-mockup-card-dark / code-window-card）
- 占位演示内容

#### 安装说明
- 安装步骤/命令展示
- 前置依赖说明

#### 标签与元信息
- 标签列表
- 创建时间、最后更新时间

#### 用户评论与评分
- 评论列表，每条包含：用户头像、用户名、评分、评论内容、时间
- 总评分概览

#### 版本历史
- 版本号、发布日期、更新说明

#### 开发者信息
- 开发者名称/团队名
- 简介

#### 相关文档
- 文档链接（使用文档、API 文档、常见问题）

#### 相似插件推荐
- 同类别的其他插件推荐，横向卡片排列

## 核心功能
1. 搜索插件（实时过滤，按名称/描述/作者）
2. 分类筛选（全部/Skill/Agent/Tool/MCP/Plugin）
3. 热门推荐展示
4. 下载排行榜
5. 精选专题合集
6. 全部插件分页浏览
7. 插件详情查看
8. 页面间跳转（首页 → 详情页，详情页返回首页）

## 交互行为
- 分类标签点击切换，即时过滤插件列表
- 搜索输入实时过滤
- 插件卡片点击跳转详情页
- 详情页"返回市场"导航
- 分页器翻页
- 安装按钮点击反馈（Toast 提示）

## 数据来源
- 复用 `frontend/src/lib/mock/plugins.ts` 中的 Plugin 数据模型
- 仅展示 status === "published" 的插件
- 评论、版本历史、开发者信息使用 mock 数据

## 设计约束
- 严格遵循 `DESIGN.md` 中定义的 Claude 设计系统
- 颜色：cream canvas (#faf9f5) 为主底色，coral (#cc785c) 为 accent
- 字体：Copernicus/Tiempos Headline 衬线用于标题，StyreneB/Inter 用于正文
- 组件：feature-card, category-tab, product-mockup-card-dark, code-window-card 等
- 圆角：卡片 lg (12px)，按钮 md (8px)，标签 pill
- 间距：section 96px，卡片内部 32px

## 文件规划
- 首页：`frontend/src/app/marketplace/page.tsx`
- 详情页：`frontend/src/app/marketplace/[id]/page.tsx`
- Mock 数据扩展：`frontend/src/lib/mock/plugins.ts`（如需额外字段）

---
### 2026-04-30 · 生成
内容：生成了 AI 插件市场首页和详情页。首页包含编辑型奶油画布英雄横幅、分类筛选、热门推荐、下载排行榜、精选专题合集、全部插件分页网格；详情页包含插件信息头、代码窗口演示区、安装说明、用户评论、版本历史、开发者信息、文档链接、相似推荐。整体严格遵循 Claude DESIGN.md 暖色调设计系统。
文件：frontend/src/app/marketplace/page.tsx, frontend/src/app/marketplace/[id]/page.tsx, frontend/src/lib/mock/marketplace.ts

---
### 2026-04-30 · 修改
内容：迭代优化首页功能。1) "全部"筛选标签改为"热门"，默认按热度排序展示；2) 分类筛选改为即时切换卡片网格，删除底部分页区；3) 移除网格标题文字说明和描述文案；4) 下载排行榜与精选专题合集合并为同一行左右并排，缩小尺寸更紧凑；5) 移除导航栏"安装 AgentHub"按钮；6) 新增公告横幅轮播组件（announcement-banner.tsx），基于后台 Announcement 数据自动翻页滚动展示。
文件：frontend/src/app/marketplace/page.tsx, frontend/src/components/announcement-banner.tsx, frontend/src/app/page.tsx

---
### 2026-04-30 · SQLite API 集成 + 页脚精简
内容：插件首页和详情页从 mock 数据改为调用 GET /api/plugins、/api/announcements、/api/featured-collections。删除 NavLayout 和详情页底部产品/资源/社区/法律四列页脚链接，仅保留版权行。详情页删除重复的内联 footer。plugins 表返回统一转 camelCase 修复字段不显示。
文件：frontend/src/app/marketplace/page.tsx、frontend/src/app/marketplace/[id]/page.tsx、frontend/src/components/ui/nav-layout.tsx

---
### 2026-05-06 · 下载与收藏功能完整性实现
内容：插件详情页实现完整的下载和收藏功能。下载：安装按钮调用 API 后自动加入下载列表、下载计数自增（基础数+本地安装次数）。收藏：按钮支持 ☆/★ 切换，状态通过 localStorage 持久化，刷新不丢失。创建 useFavorites、useDownloads、useLocalStorage 三个共享 Hook，通过 CustomEvent 实现跨组件状态同步。
文件：frontend/src/app/marketplace/[id]/page.tsx、frontend/src/hooks/useFavorites.ts、frontend/src/hooks/useDownloads.ts、frontend/src/hooks/useLocalStorage.ts

---
### 2026-05-06 · 修复安装按钮 + 首页筛选/翻页优化
内容：详情页安装按钮改为真实异步安装流程（POST /api/plugins/:id/install）。首页：筛选标签从热门改为全部，每页 9 张卡片，左右大箭头翻页；tab 字体 28px 居中 gap-5。
文件：frontend/src/app/marketplace/[id]/page.tsx, frontend/src/app/marketplace/page.tsx

---
### 2026-05-06 · 详情页宽幅沉浸式布局重构
内容：信息头+代码演示左右 3:2 并排，标签融入插件信息区，元信息和操作按钮移至右侧 sticky 列，版本改为底部抽屉式，用户评价全宽展示（超 6 条折叠展开）。英雄区从全宽居中改为左右双栏（左公告卡片轮播、右搜索+统计），新增 AnnouncementHero 组件替代顶部横条 banner。移除详情页安装说明、开发者介绍、相关文档区块。
文件：frontend/src/app/marketplace/[id]/page.tsx, frontend/src/app/marketplace/page.tsx, frontend/src/components/announcement-hero.tsx

---
### 2026-05-06 15:30 · 修改
内容：修复插件详情页安装按钮功能（原仅 toast 提示，现改为真实异步安装流程：调用 POST /api/plugins/:id/install，按钮显示安装中状态并禁用防重复点击，成功/失败分别 toast 反馈）。新增 installing 状态跟踪和 handleInstall 回调函数。底部 CTA 珊瑚带的"立即安装"按钮同步更新。
文件：frontend/src/app/marketplace/[id]/page.tsx
