import { getDb } from "./index";
import { initSchema } from "./schema";

export function seed(): void {
  const db = getDb();
  initSchema();

  const existing = db.prepare("SELECT COUNT(*) as count FROM users").get() as { count: number };
  if (existing.count > 0) return;

  const insertUsers = db.prepare(`
    INSERT OR REPLACE INTO users (id, name, nickname, email, phone, password, role, status, created_at, last_active_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const users = [
    ["1", "张三", "张三", "zhangsan@agenthub.ai", "138-0000-0001", "admin123", "admin", "active", "2025-06-15 10:30", "2026-04-29 09:15"],
    ["2", "李四", "李四", "lisi@agenthub.ai", "138-0000-0002", "editor123", "editor", "active", "2025-08-22 14:20", "2026-04-28 17:40"],
    ["3", "王五", "王五", "wangwu@agenthub.ai", "138-0000-0003", "guest123", "guest", "disabled", "2025-10-08 09:00", "2026-03-15 11:22"],
    ["4", "赵六", "赵六", "zhaoliu@agenthub.ai", "138-0000-0004", "editor123", "editor", "active", "2025-11-03 16:45", "2026-04-29 08:30"],
    ["5", "孙七", "孙七", "sunqi@agenthub.ai", "138-0000-0005", "guest123", "guest", "active", "2025-12-19 11:15", "2026-04-27 20:05"],
    ["6", "周八", "周八", "zhouba@agenthub.ai", "138-0000-0006", "admin123", "admin", "active", "2026-01-07 08:50", "2026-04-29 10:00"],
    ["7", "吴九", "吴九", "wujiu@agenthub.ai", "138-0000-0007", "editor123", "editor", "disabled", "2026-01-20 13:30", "2026-02-28 16:10"],
    ["8", "郑十", "郑十", "zhengshi@agenthub.ai", "138-0000-0008", "guest123", "guest", "active", "2026-02-14 10:20", "2026-04-26 14:55"],
    ["9", "陈十一", "陈十一", "chenshiyi@agenthub.ai", "138-0000-0009", "editor123", "editor", "active", "2026-02-28 09:35", "2026-04-29 07:20"],
    ["10", "林十二", "林十二", "linshier@agenthub.ai", "138-0000-0010", "admin123", "admin", "active", "2026-03-05 15:00", "2026-04-28 22:45"],
    ["11", "黄十三", "黄十三", "huangshisan@agenthub.ai", "138-0000-0011", "guest123", "guest", "disabled", "2026-03-12 12:10", "2026-04-01 09:30"],
    ["12", "刘十四", "刘十四", "liushisi@agenthub.ai", "138-0000-0012", "editor123", "editor", "active", "2026-03-20 08:40", "2026-04-29 06:55"],
    ["13", "杨十五", "杨十五", "yangshiwu@agenthub.ai", "138-0000-0013", "guest123", "guest", "active", "2026-04-01 17:25", "2026-04-28 19:10"],
    ["14", "朱十六", "朱十六", "zhushiliu@agenthub.ai", "138-0000-0014", "editor123", "editor", "active", "2026-04-10 11:55", "2026-04-29 08:00"],
    ["15", "马十七", "马十七", "mashiqi@agenthub.ai", "138-0000-0015", "guest123", "guest", "active", "2026-04-18 14:30", "2026-04-28 21:15"],
    ["16", "何十八", "何十八", "heshiba@agenthub.ai", "138-0000-0016", "admin123", "admin", "disabled", "2026-04-22 10:05", "2026-04-25 12:40"],
    ["17", "罗十九", "罗十九", "luoshijiu@agenthub.ai", "138-0000-0017", "editor123", "editor", "active", "2026-04-25 09:20", "2026-04-29 05:30"],
    ["18", "梁二十", "梁二十", "liangershi@agenthub.ai", "138-0000-0018", "guest123", "guest", "active", "2026-04-27 16:45", "2026-04-29 01:10"],
  ];

  const insertMany = db.transaction(() => {
    for (const u of users) insertUsers.run(...u);
  });
  insertMany();

  const insertPlugins = db.prepare(`
    INSERT OR REPLACE INTO plugins (id, name, description, version, author, category, downloads, rating, status, tags, icon, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const plugins = [
    ["1", "智能代码审查", "基于 AI 的代码审查工具，自动检测潜在 bug 和优化建议", "2.1.0", "DevTools Lab", "Tool", 12580, 4.8, "published", JSON.stringify(["代码审查", "AI 对话"]), "", "2026-03-15", "2026-04-20"],
    ["2", "多语言翻译助手", "支持 50+ 语言的实时翻译 Skill，集成到智能体对话中", "1.5.2", "LinguaAI", "Skill", 23450, 4.6, "published", JSON.stringify(["AI 对话"]), "", "2026-01-20", "2026-04-18"],
    ["3", "数据分析 Agent", "自动分析用户上传的数据文件，生成可视化报告和洞察", "3.0.0", "DataMind", "Agent", 8900, 4.9, "published", JSON.stringify(["数据分析", "自动化"]), "", "2026-02-10", "2026-04-15"],
    ["4", "GitHub 集成 MCP", "连接 GitHub 仓库，支持 Issues、PR 管理和代码搜索", "1.0.0", "OpenConnect", "MCP", 15670, 4.5, "published", JSON.stringify(["自动化"]), "", "2026-03-01", "2026-04-22"],
    ["5", "PPT 自动生成器", "输入主题和要点，自动生成精美 PPT 演示文稿", "0.9.1", "SlideForge", "Plugin", 4500, 4.2, "reviewing", JSON.stringify(["文档处理", "自动化"]), "", "2026-04-10", "2026-04-25"],
    ["6", "语音转文字 Skill", "高精度语音识别，支持会议记录、访谈转录等场景", "2.3.0", "VoicePilot", "Skill", 31200, 4.7, "published", JSON.stringify(["AI 对话", "自动化"]), "", "2025-11-05", "2026-04-19"],
    ["7", "SQL 查询优化器", "分析 SQL 语句，提供索引建议和性能优化方案", "1.8.0", "QueryGenius", "Tool", 7800, 4.4, "published", JSON.stringify(["代码审查", "自动化"]), "", "2026-02-28", "2026-04-14"],
    ["8", "图片生成 Agent", "使用 Stable Diffusion 模型，通过文字描述生成高质量图片", "1.2.0", "PixelMind", "Agent", 18900, 4.3, "draft", JSON.stringify(["AI 对话", "代码生成"]), "", "2026-04-01", "2026-04-25"],
    ["9", "Slack 通知 MCP", "将智能体输出实时推送到 Slack 频道，支持格式化和附件", "1.1.0", "NotiFlow", "MCP", 6200, 4.1, "published", JSON.stringify(["自动化"]), "", "2026-03-20", "2026-04-21"],
    ["10", "代码解释器", "逐行解释代码逻辑，帮助开发者快速理解复杂代码库", "2.0.1", "CodeClarity", "Tool", 11000, 4.6, "published", JSON.stringify(["代码审查", "AI 对话"]), "", "2026-02-15", "2026-04-23"],
    ["11", "Markdown 编辑器", "富文本 Markdown 编辑器 Skill，支持实时预览和导出", "1.0.2", "DocSmith", "Plugin", 3400, 4.0, "reviewing", JSON.stringify(["文档处理", "代码生成"]), "", "2026-04-05", "2026-04-24"],
    ["12", "情感分析引擎", "实时分析文本中的情感倾向，支持正面/负面/中性分类", "3.1.0", "EmoteAI", "Skill", 9800, 4.5, "published", JSON.stringify(["数据分析", "AI 对话"]), "", "2026-01-08", "2026-04-17"],
  ];

  const insertManyPlugins = db.transaction(() => {
    for (const p of plugins) insertPlugins.run(...p);
  });
  insertManyPlugins();

  const insertCategories = db.prepare(`
    INSERT OR REPLACE INTO categories (id, name, icon, description, plugin_count, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const categories = [
    ["1", "Skill", "🧩", "可复用的技能模块，支持拖拽式组合和使用，为智能体提供特定领域能力", 3, 1, "enabled", "2025-11-05", "2026-04-19"],
    ["2", "Agent", "🤖", "自主 AI 智能体，支持多步骤任务执行和复杂工作流编排", 2, 2, "enabled", "2026-02-10", "2026-04-15"],
    ["3", "Tool", "🛠️", "实用工具集成类插件，覆盖代码审查、SQL 优化、代码解释等开发辅助场景", 3, 3, "enabled", "2026-02-15", "2026-04-23"],
    ["4", "MCP", "🔗", "MCP 协议连接器，提供与外部平台和服务的标准化集成接口", 2, 4, "enabled", "2026-03-01", "2026-04-22"],
    ["5", "Plugin", "📦", "通用插件类型，支持 PPT 生成、Markdown 编辑等独立功能扩展", 2, 5, "enabled", "2026-04-05", "2026-04-25"],
  ];

  const insertManyCategories = db.transaction(() => {
    for (const c of categories) insertCategories.run(...c);
  });
  insertManyCategories();

  const insertTags = db.prepare(`
    INSERT OR REPLACE INTO tags (id, name, color, icon, description, plugin_count, sort_order, status, created_at, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tags = [
    ["1", "代码生成", "#cc785c", "⚡", "自动生成代码、模板和样板文件，提升开发效率的智能体插件", 5, 1, "enabled", "2025-10-12", "2026-04-18"],
    ["2", "代码审查", "#5db8a6", "🔍", "代码质量检查、安全审计和最佳实践建议相关插件", 3, 2, "enabled", "2025-11-20", "2026-04-20"],
    ["3", "AI 对话", "#5b8bd4", "💬", "自然语言对话、问答系统和智能聊天助手类插件", 4, 3, "enabled", "2026-01-05", "2026-04-22"],
    ["4", "自动化", "#e8a55a", "🔄", "工作流自动化、定时任务和业务流程编排插件", 2, 4, "enabled", "2026-01-18", "2026-04-15"],
    ["5", "数据分析", "#9b7ec4", "📈", "数据可视化、统计分析、报表生成和商业智能插件", 3, 5, "enabled", "2026-02-08", "2026-04-19"],
    ["6", "文档处理", "#5db872", "📄", "文档生成、格式转换、内容提取和知识库管理", 2, 6, "enabled", "2026-02-22", "2026-04-21"],
    ["7", "DevOps", "#e09b5e", "🚀", "CI/CD 集成、容器管理、部署自动化和基础设施即代码", 1, 7, "disabled", "2026-03-10", "2026-04-10"],
    ["8", "安全防护", "#c47a6a", "🔒", "漏洞扫描、权限管理、加密通信和安全合规检查", 2, 8, "disabled", "2026-03-25", "2026-04-12"],
  ];

  const insertManyTags = db.transaction(() => {
    for (const t of tags) insertTags.run(...t);
  });
  insertManyTags();

  const insertAnnouncements = db.prepare(`
    INSERT OR REPLACE INTO announcements (id, title, content, priority, link_url, is_dismissible, is_active, publish_at, expire_at, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const announcements = [
    ["a1", "AI 插件市场正式上线通知", "<p>尊敬的开发者们，AI 智能体插件市场现已正式上线！欢迎各位开发者入驻并发布你的优秀插件。</p><p>上线首月注册即享 <b>30 天免费试用</b> Pro 版功能。</p>", "pinned", "", 1, 1, "2026-04-01 00:00", "2026-07-01 00:00", "2026-04-01 08:00"],
    ["a2", "v2.5 版本发布公告", "<p>平台已升级至 <b>v2.5</b> 版本，本次更新包含以下内容：</p><ul><li>新增插件推荐算法，提升匹配准确率</li><li>优化搜索性能，响应速度提升 40%</li><li>修复若干已知 Bug</li></ul>", "pinned", "/changelog", 1, 1, "2026-04-20 10:00", null, "2026-04-20 10:00"],
    ["a3", "五一假期服务保障通知", "<p>五一劳动节（5月1日-5月5日）期间，平台将正常运营。技术支持响应时间可能略有延长，敬请谅解。</p>", "normal", "", 0, 1, null, "2026-05-06 00:00", "2026-04-28 14:30"],
    ["a4", "新插件审核规则调整", '<p>自 2026 年 5 月 1 日起，所有新提交的插件需通过<b>安全扫描</b>后方可上架。请各位开发者确保插件代码符合安全规范。</p><p>详情请查看 <a href=\'/docs/security\'>安全规范文档</a>。</p>', "normal", "/docs/security", 1, 0, "2026-05-01 00:00", null, "2026-04-25 09:00"],
    ["a5", "开发者激励计划预告", "<p>为鼓励优质插件创作，平台将于近期推出<b>开发者激励计划</b>：</p><ul><li>月度 TOP 10 插件可获得流量扶持</li><li>季度优秀开发者颁发认证徽章</li><li>年度最佳插件评选及奖金</li></ul><p>敬请期待！</p>", "normal", "", 1, 1, null, null, "2026-04-22 16:00"],
    ["a6", "系统维护预告", "<p>平台计划于 <b>5月10日凌晨 2:00-4:00</b> 进行系统升级维护，届时服务可能短暂中断，请提前做好准备。</p>", "normal", "", 0, 0, "2026-05-08 00:00", "2026-05-10 04:00", "2026-04-28 10:00"],
  ];

  const insertManyAnnouncements = db.transaction(() => {
    for (const a of announcements) insertAnnouncements.run(...a);
  });
  insertManyAnnouncements();

  const insertNotificationRecords = db.prepare(`
    INSERT OR REPLACE INTO notification_records (id, content, target_type, target_roles, sent_at, status)
    VALUES (?, ?, ?, ?, ?, ?)
  `);

  const notificationRecords = [
    ["n1", "<p>欢迎加入 AI 智能体插件市场！请完善你的开发者资料，即可开始发布插件。</p>", "all", "[]", "2026-04-27 10:30", "sent"],
    ["n2", "<p>亲爱的管理员：v2.5 版本已发布，请查看 <a href='/changelog'>更新日志</a> 了解详情。</p>", "byRole", JSON.stringify(["admin"]), "2026-04-20 10:05", "sent"],
    ["n3", "<p>🔥 新的热门插件 <b>代码审查 Agent</b> 已上架，赶快去试试吧！</p>", "all", "[]", "2026-04-18 15:00", "sent"],
    ["n4", "<p>尊敬的开发者，你的插件已通过审核，现已上架！</p>", "byRole", JSON.stringify(["editor"]), "2026-04-15 09:20", "sent"],
    ["n5", "<p>⚠️ 测试通知：这是一条测试消息，请忽略。</p>", "all", "[]", "2026-04-10 18:00", "failed"],
  ];

  const insertManyNotifications = db.transaction(() => {
    for (const n of notificationRecords) insertNotificationRecords.run(...n);
  });
  insertManyNotifications();

  const insertPluginDetails = db.prepare(`
    INSERT OR REPLACE INTO plugin_details (plugin_id, readme, install_steps, dependencies, reviews, version_history, developer_name, developer_description, developer_website, docs)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const pluginDetails = [
    ["1",
      "# 智能代码审查\n\n基于 AI 的代码审查工具，自动检测潜在 bug 和优化建议。\n\n## 主要特性\n\n- 支持多种编程语言（TypeScript、Python、Go、Rust 等）\n- 实时检测代码质量问题\n- 提供智能修复建议\n- 支持自定义审查规则\n\n```bash\nconst review = await aiReview.analyze({\n  files: [\"src/**/*.ts\"],\n  severity: \"high\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「智能代码审查」并点击安装", "在智能体配置中启用该插件", "选择需要审查的代码仓库或文件", "配置审查规则和严重级别", "运行首次审查并查看结果"]),
      JSON.stringify(["Node.js >= 18.0", "TypeScript >= 5.0"]),
      JSON.stringify([{ id: "r1", userName: "张三", userAvatar: "ZS", rating: 5, content: "非常好用的代码审查工具，检测准确率很高，强烈推荐！", date: "2026-04-25" }, { id: "r2", userName: "李四", userAvatar: "LS", rating: 4, content: "日常开发必备，节省了大量 code review 时间。希望后续支持更多语言。", date: "2026-04-20" }, { id: "r3", userName: "王五", userAvatar: "WW", rating: 5, content: "集成到 CI/CD 流程后，代码质量明显提升。Bug 检测能力很强。", date: "2026-04-15" }]),
      JSON.stringify([{ version: "2.1.0", date: "2026-04-20", changelog: ["新增 Rust 语言支持", "优化检测算法，误报率降低 30%", "新增自定义规则导入功能"] }, { version: "2.0.0", date: "2026-04-01", changelog: ["重构检测引擎", "新增 Go 语言支持", "支持批量审查"] }, { version: "1.0.0", date: "2026-03-15", changelog: ["首个正式版本发布", "支持 TypeScript 和 Python"] }]),
      "DevTools Lab", "专注于开发者工具的创新团队，致力于用 AI 技术提升软件开发效率。团队成员来自 Google、Microsoft 等公司。", "https://devtoolslab.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "API 文档", url: "#" }, { label: "常见问题", url: "#" }])],
    ["2",
      "# 多语言翻译助手\n\n支持 50+ 语言的实时翻译 Skill，集成到智能体对话中。\n\n## 主要特性\n\n- 支持 50+ 语言互译\n- 实时翻译，延迟低于 500ms\n- 支持专业术语库定制\n- 保持原文格式和 Markdown 样式\n\n```bash\nawait translate.translate({\n  text: \"Hello, world!\",\n  target: \"zh-CN\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「多语言翻译助手」并点击安装", "在智能体对话设置中启用翻译功能", "配置默认源语言和目标语言", "可选：上传专业术语库以提升翻译准确度"]),
      JSON.stringify(["无特殊依赖"]),
      JSON.stringify([{ id: "r4", userName: "赵六", userAvatar: "ZL", rating: 5, content: "翻译质量非常好，多语言场景下非常实用。专业术语库功能很赞！", date: "2026-04-22" }, { id: "r5", userName: "钱七", userAvatar: "QQ", rating: 4, content: "集成了很多语言，日常工作够用了。翻译速度还不错。", date: "2026-04-18" }]),
      JSON.stringify([{ version: "1.5.2", date: "2026-04-18", changelog: ["修复某些语言翻译不准确的问题", "新增泰语和越南语支持"] }, { version: "1.5.0", date: "2026-03-20", changelog: ["新增专业术语库功能", "优化翻译速度"] }, { version: "1.0.0", date: "2026-01-20", changelog: ["首个版本发布", "支持 40+ 语言"] }]),
      "LinguaAI", "专注自然语言处理技术的 AI 团队，致力于打破语言壁垒，让全球沟通无障碍。", "https://linguaai.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "API 文档", url: "#" }, { label: "术语库配置指南", url: "#" }])],
    ["3",
      "# 数据分析 Agent\n\n自动分析用户上传的数据文件，生成可视化报告和洞察。\n\n## 主要特性\n\n- 支持 CSV、Excel、JSON 等多种格式\n- 自动生成统计分析和可视化图表\n- 自然语言交互式数据查询\n- 一键生成分析报告\n\n```python\nresult = data_agent.analyze(\n  file=\"sales_2026.csv\",\n  charts=True\n)\n```",
      JSON.stringify(["在插件市场中搜索「数据分析 Agent」并点击安装", "上传你的数据文件（CSV / Excel / JSON）", "用自然语言描述你的分析需求", "查看自动生成的图表和洞察报告", "导出分析报告（PDF / HTML）"]),
      JSON.stringify(["Python >= 3.10"]),
      JSON.stringify([{ id: "r6", userName: "孙八", userAvatar: "SB", rating: 5, content: "数据分析能力非常强大，自然语言交互方式太方便了！", date: "2026-04-20" }, { id: "r7", userName: "周九", userAvatar: "ZJ", rating: 5, content: "自动生成的可视化报告很专业，直接用于周报汇报。", date: "2026-04-16" }, { id: "r8", userName: "吴十", userAvatar: "WS", rating: 4, content: "支持多种数据格式，图表生成效果不错。希望增加更多图表类型。", date: "2026-04-10" }]),
      JSON.stringify([{ version: "3.0.0", date: "2026-04-15", changelog: ["全新 UI 交互体验", "新增自然语言查询功能", "大幅提升处理速度"] }, { version: "2.0.0", date: "2026-03-10", changelog: ["新增 JSON 格式支持", "支持自定义图表样式"] }, { version: "1.0.0", date: "2026-02-10", changelog: ["首个版本发布", "支持 CSV 和 Excel"] }]),
      "DataMind", "数据智能团队，致力于让数据分析变得简单有趣。我们相信每个人都应该能够从数据中获得洞察。", "https://datamind.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "数据分析示例", url: "#" }, { label: "API 文档", url: "#" }])],
    ["4",
      "# GitHub 集成 MCP\n\n连接 GitHub 仓库，支持 Issues、PR 管理和代码搜索。\n\n## 主要特性\n\n- 搜索公开和私有仓库\n- 管理 Issues 和 Pull Requests\n- 查看代码差异和提交历史\n- 触发 GitHub Actions\n\n```bash\nawait github.searchCode({\n  query: \"function: errorHandler\",\n  repo: \"my-org/my-project\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「GitHub 集成 MCP」并点击安装", "首次使用时授权 GitHub 账户", "选择授权仓库范围", "配置完成后即可在智能体对话中使用 GitHub 相关功能"]),
      JSON.stringify(["GitHub 账户授权"]),
      JSON.stringify([{ id: "r9", userName: "郑十一", userAvatar: "ZY", rating: 4, content: "和 GitHub 的集成很流畅，代码搜索功能很好用。", date: "2026-04-23" }, { id: "r10", userName: "冯十二", userAvatar: "FE", rating: 5, content: "直接在对话中管理 PR 和 Issue，效率提升很大。", date: "2026-04-19" }]),
      JSON.stringify([{ version: "1.0.0", date: "2026-03-01", changelog: ["首个版本发布", "支持 Issues 和 PR 管理", "支持代码搜索"] }]),
      "OpenConnect", "专注于开发者工具和 API 集成的团队。我们构建各种连接器，让 AI 智能体能够与更多服务打通。", "https://openconnect.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "授权配置指南", url: "#" }, { label: "API 文档", url: "#" }])],
    ["6",
      "# 语音转文字 Skill\n\n高精度语音识别，支持会议记录、访谈转录等场景。\n\n## 主要特性\n\n- 支持中英文混合识别\n- 实时流式转录\n- 自动标点与分段\n- 说话人识别\n\n```bash\nresult = await speechToText.transcribe({\n  audio: \"meeting.mp3\",\n  language: \"zh-CN\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「语音转文字 Skill」并点击安装", "上传音频文件或连接麦克风进行实时转录", "选择识别语言和配置选项", "转录完成后下载文本文件"]),
      JSON.stringify(["无特殊依赖"]),
      JSON.stringify([{ id: "r11", userName: "陈十三", userAvatar: "CS", rating: 5, content: "会议记录的好帮手！中英文混合识别准确率很高。", date: "2026-04-21" }, { id: "r12", userName: "褚十四", userAvatar: "CH", rating: 4, content: "实时转录速度很快，说话人识别功能很实用。", date: "2026-04-17" }]),
      JSON.stringify([{ version: "2.3.0", date: "2026-04-19", changelog: ["优化中英文混合识别准确率", "新增说话人识别功能"] }, { version: "2.0.0", date: "2026-02-15", changelog: ["新增实时流式转录", "支持多种音频格式"] }, { version: "1.0.0", date: "2025-11-05", changelog: ["首个版本发布", "支持中文和英文识别"] }]),
      "VoicePilot", "深耕语音 AI 技术多年的团队，为全球用户提供高质量的语音识别和合成服务。", "https://voicepilot.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "API 文档", url: "#" }])],
    ["7",
      "# SQL 查询优化器\n\n分析 SQL 语句，提供索引建议和性能优化方案。\n\n## 主要特性\n\n- 支持 MySQL、PostgreSQL 等主流数据库\n- 自动检测慢查询\n- 提供索引建议\n- 生成优化方案报告\n\n```sql\n-- 输入原始 SQL\nSELECT * FROM orders WHERE user_id = 123 AND status = 'active';\n```",
      JSON.stringify(["在插件市场中搜索「SQL 查询优化器」并点击安装", "连接你的数据库", "输入需要优化的 SQL 语句", "查看优化建议并应用"]),
      JSON.stringify(["数据库连接权限"]),
      JSON.stringify([{ id: "r13", userName: "卫十五", userAvatar: "WY", rating: 4, content: "索引建议很实用，帮我们优化了不少慢查询。", date: "2026-04-18" }]),
      JSON.stringify([{ version: "1.8.0", date: "2026-04-14", changelog: ["新增 PostgreSQL 支持", "优化索引推荐算法"] }, { version: "1.0.0", date: "2026-02-28", changelog: ["首个版本发布", "支持 MySQL"] }]),
      "QueryGenius", "数据库性能优化专家团队，致力于让每个查询都跑得更快。", "https://querygenius.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "数据库连接指南", url: "#" }])],
    ["9",
      "# Slack 通知 MCP\n\n将智能体输出实时推送到 Slack 频道，支持格式化和附件。\n\n## 主要特性\n\n- 实时推送智能体对话结果\n- 支持 Markdown 格式化\n- 支持文件附件\n- 可自定义通知规则\n\n```bash\nawait slack.sendNotification({\n  channel: \"#ai-results\",\n  message: \"分析完成：发现 3 个潜在问题\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「Slack 通知 MCP」并点击安装", "授权 Slack 工作区", "选择目标频道", "配置通知规则（关键词触发 / 全部通知）"]),
      JSON.stringify(["Slack 工作区管理员授权"]),
      JSON.stringify([{ id: "r14", userName: "韩十六", userAvatar: "HY", rating: 4, content: "集成简单，通知推送很及时。希望后续支持更多消息格式。", date: "2026-04-22" }]),
      JSON.stringify([{ version: "1.1.0", date: "2026-04-21", changelog: ["新增文件附件功能", "优化通知速度"] }, { version: "1.0.0", date: "2026-03-20", changelog: ["首个版本发布", "支持 Slack 消息推送"] }]),
      "NotiFlow", "专注企业级通知和消息推送的团队，让 AI 智能体的产出更及时地触达团队。", "https://notiflow.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "Slack 配置指南", url: "#" }])],
    ["10",
      "# 代码解释器\n\n逐行解释代码逻辑，帮助开发者快速理解复杂代码库。\n\n## 主要特性\n\n- 支持 20+ 编程语言\n- 逐行或分块解释\n- 可视化执行流程\n- 支持代码片段高亮标注\n\n```typescript\nfunction fib(n: number): number {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\n```",
      JSON.stringify(["在插件市场中搜索「代码解释器」并点击安装", "粘贴或选择代码片段", "选择解释详细程度", "查看逐行解释和学习要点"]),
      JSON.stringify(["无特殊依赖"]),
      JSON.stringify([{ id: "r15", userName: "杨十七", userAvatar: "YY", rating: 5, content: "学习新代码库的神器！解释通俗易懂，示例很清晰。", date: "2026-04-24" }, { id: "r16", userName: "朱十八", userAvatar: "ZU", rating: 4, content: "支持的语言很多，解释质量高。希望能增加更多可视化功能。", date: "2026-04-20" }]),
      JSON.stringify([{ version: "2.0.1", date: "2026-04-23", changelog: ["修复部分语言解释不完整的问题", "新增代码高亮标注功能"] }, { version: "2.0.0", date: "2026-03-10", changelog: ["新增可视化执行流程", "支持 20+ 语言"] }, { version: "1.0.0", date: "2026-02-15", changelog: ["首个版本发布", "支持 5 种主流语言"] }]),
      "CodeClarity", "让代码更易理解的团队。我们相信好的工具能帮助每个开发者更快地掌握新技术。", "https://codeclarity.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "支持的语言列表", url: "#" }, { label: "API 文档", url: "#" }])],
    ["12",
      "# 情感分析引擎\n\n实时分析文本中的情感倾向，支持正面/负面/中性分类。\n\n## 主要特性\n\n- 多维度情感分析\n- 支持中文、英文等多种语言\n- 细分情感类别（喜悦、愤怒、悲伤等）\n- 批量处理支持\n\n```bash\nresult = await sentiment.analyze({\n  text: \"这个产品真的改变了我工作的方式！\"\n});\n```",
      JSON.stringify(["在插件市场中搜索「情感分析引擎」并点击安装", "输入或粘贴需要分析的文本", "选择分析粒度（全文 / 段落 / 句子）", "查看情感分析结果和可视化图表"]),
      JSON.stringify(["无特殊依赖"]),
      JSON.stringify([{ id: "r17", userName: "秦十九", userAvatar: "QY", rating: 5, content: "情感分类很准确，多维度分析功能很强大。用于客服场景效果显著。", date: "2026-04-19" }]),
      JSON.stringify([{ version: "3.1.0", date: "2026-04-17", changelog: ["新增细分情感类别", "优化中文情感分析准确率"] }, { version: "2.0.0", date: "2026-02-20", changelog: ["新增多维度分析", "支持批量处理"] }, { version: "1.0.0", date: "2026-01-08", changelog: ["首个版本发布", "支持基础情感三分类"] }]),
      "EmoteAI", "专注于情感智能技术的团队，帮助企业更好地理解用户情感和需求。", "https://emoteai.example.com",
      JSON.stringify([{ label: "使用文档", url: "#" }, { label: "API 文档", url: "#" }, { label: "情感分类标准", url: "#" }])],
  ];

  const insertManyPluginDetails = db.transaction(() => {
    for (const d of pluginDetails) insertPluginDetails.run(...d);
  });
  insertManyPluginDetails();

  const insertCollections = db.prepare(`
    INSERT OR REPLACE INTO featured_collections (id, title, description, plugin_ids)
    VALUES (?, ?, ?, ?)
  `);

  const collections = [
    ["dev-tools", "开发工具合集", "提升编码效率的必备工具", JSON.stringify(["1", "10", "7"])],
    ["productivity", "效率提升精选", "让工作事半功倍的插件", JSON.stringify(["2", "3", "6", "12"])],
    ["integration", "集成与连接", "打通各种平台和工具", JSON.stringify(["4", "9"])],
  ];

  const insertManyCollections = db.transaction(() => {
    for (const c of collections) insertCollections.run(...c);
  });
  insertManyCollections();
}
