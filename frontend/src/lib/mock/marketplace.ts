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

export const pluginDetails: Record<string, PluginDetail> = {
  "1": {
    pluginId: "1",
    readme: `# 智能代码审查\n\n基于 AI 的代码审查工具，自动检测潜在 bug 和优化建议。\n\n## 主要特性\n\n- 支持多种编程语言（TypeScript、Python、Go、Rust 等）\n- 实时检测代码质量问题\n- 提供智能修复建议\n- 支持自定义审查规则\n\n\`\`\`bash\nconst review = await aiReview.analyze({\n  files: [\"src/**/*.ts\"],\n  severity: \"high\"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「智能代码审查」并点击安装",
      "在智能体配置中启用该插件",
      "选择需要审查的代码仓库或文件",
      "配置审查规则和严重级别",
      "运行首次审查并查看结果",
    ],
    dependencies: ["Node.js >= 18.0", "TypeScript >= 5.0"],
    reviews: [
      { id: "r1", userName: "张三", userAvatar: "ZS", rating: 5, content: "非常好用的代码审查工具，检测准确率很高，强烈推荐！", date: "2026-04-25" },
      { id: "r2", userName: "李四", userAvatar: "LS", rating: 4, content: "日常开发必备，节省了大量 code review 时间。希望后续支持更多语言。", date: "2026-04-20" },
      { id: "r3", userName: "王五", userAvatar: "WW", rating: 5, content: "集成到 CI/CD 流程后，代码质量明显提升。Bug 检测能力很强。", date: "2026-04-15" },
    ],
    versionHistory: [
      { version: "2.1.0", date: "2026-04-20", changelog: ["新增 Rust 语言支持", "优化检测算法，误报率降低 30%", "新增自定义规则导入功能"] },
      { version: "2.0.0", date: "2026-04-01", changelog: ["重构检测引擎", "新增 Go 语言支持", "支持批量审查"] },
      { version: "1.0.0", date: "2026-03-15", changelog: ["首个正式版本发布", "支持 TypeScript 和 Python"] },
    ],
    developer: { name: "DevTools Lab", description: "专注于开发者工具的创新团队，致力于用 AI 技术提升软件开发效率。团队成员来自 Google、Microsoft 等公司。", website: "https://devtoolslab.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "API 文档", url: "#" },
      { label: "常见问题", url: "#" },
    ],
  },
  "2": {
    pluginId: "2",
    readme: `# 多语言翻译助手\n\n支持 50+ 语言的实时翻译 Skill，集成到智能体对话中。\n\n## 主要特性\n\n- 支持 50+ 语言互译\n- 实时翻译，延迟低于 500ms\n- 支持专业术语库定制\n- 保持原文格式和 Markdown 样式\n\n\`\`\`bash\nawait translate.translate({\n  text: \"Hello, world!\",\n  target: \"zh-CN\"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「多语言翻译助手」并点击安装",
      "在智能体对话设置中启用翻译功能",
      "配置默认源语言和目标语言",
      "可选：上传专业术语库以提升翻译准确度",
    ],
    dependencies: ["无特殊依赖"],
    reviews: [
      { id: "r4", userName: "赵六", userAvatar: "ZL", rating: 5, content: "翻译质量非常好，多语言场景下非常实用。专业术语库功能很赞！", date: "2026-04-22" },
      { id: "r5", userName: "钱七", userAvatar: "QQ", rating: 4, content: "集成了很多语言，日常工作够用了。翻译速度还不错。", date: "2026-04-18" },
    ],
    versionHistory: [
      { version: "1.5.2", date: "2026-04-18", changelog: ["修复某些语言翻译不准确的问题", "新增泰语和越南语支持"] },
      { version: "1.5.0", date: "2026-03-20", changelog: ["新增专业术语库功能", "优化翻译速度"] },
      { version: "1.0.0", date: "2026-01-20", changelog: ["首个版本发布", "支持 40+ 语言"] },
    ],
    developer: { name: "LinguaAI", description: "专注自然语言处理技术的 AI 团队，致力于打破语言壁垒，让全球沟通无障碍。", website: "https://linguaai.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "API 文档", url: "#" },
      { label: "术语库配置指南", url: "#" },
    ],
  },
  "3": {
    pluginId: "3",
    readme: `# 数据分析 Agent\n\n自动分析用户上传的数据文件，生成可视化报告和洞察。\n\n## 主要特性\n\n- 支持 CSV、Excel、JSON 等多种格式\n- 自动生成统计分析和可视化图表\n- 自然语言交互式数据查询\n- 一键生成分析报告\n\n\`\`\`python\nresult = data_agent.analyze(\n  file="sales_2026.csv",\n  charts=True\n)\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「数据分析 Agent」并点击安装",
      "上传你的数据文件（CSV / Excel / JSON）",
      "用自然语言描述你的分析需求",
      "查看自动生成的图表和洞察报告",
      "导出分析报告（PDF / HTML）",
    ],
    dependencies: ["Python >= 3.10"],
    reviews: [
      { id: "r6", userName: "孙八", userAvatar: "SB", rating: 5, content: "数据分析能力非常强大，自然语言交互方式太方便了！", date: "2026-04-20" },
      { id: "r7", userName: "周九", userAvatar: "ZJ", rating: 5, content: "自动生成的可视化报告很专业，直接用于周报汇报。", date: "2026-04-16" },
      { id: "r8", userName: "吴十", userAvatar: "WS", rating: 4, content: "支持多种数据格式，图表生成效果不错。希望增加更多图表类型。", date: "2026-04-10" },
    ],
    versionHistory: [
      { version: "3.0.0", date: "2026-04-15", changelog: ["全新 UI 交互体验", "新增自然语言查询功能", "大幅提升处理速度"] },
      { version: "2.0.0", date: "2026-03-10", changelog: ["新增 JSON 格式支持", "支持自定义图表样式"] },
      { version: "1.0.0", date: "2026-02-10", changelog: ["首个版本发布", "支持 CSV 和 Excel"] },
    ],
    developer: { name: "DataMind", description: "数据智能团队，致力于让数据分析变得简单有趣。我们相信每个人都应该能够从数据中获得洞察。", website: "https://datamind.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "数据分析示例", url: "#" },
      { label: "API 文档", url: "#" },
    ],
  },
  "4": {
    pluginId: "4",
    readme: `# GitHub 集成 MCP\n\n连接 GitHub 仓库，支持 Issues、PR 管理和代码搜索。\n\n## 主要特性\n\n- 搜索公开和私有仓库\n- 管理 Issues 和 Pull Requests\n- 查看代码差异和提交历史\n- 触发 GitHub Actions\n\n\`\`\`bash\nawait github.searchCode({\n  query: "function: errorHandler",\n  repo: "my-org/my-project"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「GitHub 集成 MCP」并点击安装",
      "首次使用时授权 GitHub 账户",
      "选择授权仓库范围",
      "配置完成后即可在智能体对话中使用 GitHub 相关功能",
    ],
    dependencies: ["GitHub 账户授权"],
    reviews: [
      { id: "r9", userName: "郑十一", userAvatar: "ZY", rating: 4, content: "和 GitHub 的集成很流畅，代码搜索功能很好用。", date: "2026-04-23" },
      { id: "r10", userName: "冯十二", userAvatar: "FE", rating: 5, content: "直接在对话中管理 PR 和 Issue，效率提升很大。", date: "2026-04-19" },
    ],
    versionHistory: [
      { version: "1.0.0", date: "2026-03-01", changelog: ["首个版本发布", "支持 Issues 和 PR 管理", "支持代码搜索"] },
    ],
    developer: { name: "OpenConnect", description: "专注于开发者工具和 API 集成的团队。我们构建各种连接器，让 AI 智能体能够与更多服务打通。", website: "https://openconnect.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "授权配置指南", url: "#" },
      { label: "API 文档", url: "#" },
    ],
  },
  "6": {
    pluginId: "6",
    readme: `# 语音转文字 Skill\n\n高精度语音识别，支持会议记录、访谈转录等场景。\n\n## 主要特性\n\n- 支持中英文混合识别\n- 实时流式转录\n- 自动标点与分段\n- 说话人识别\n\n\`\`\`bash\nresult = await speechToText.transcribe({\n  audio: "meeting.mp3",\n  language: "zh-CN"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「语音转文字 Skill」并点击安装",
      "上传音频文件或连接麦克风进行实时转录",
      "选择识别语言和配置选项",
      "转录完成后下载文本文件",
    ],
    dependencies: ["无特殊依赖"],
    reviews: [
      { id: "r11", userName: "陈十三", userAvatar: "CS", rating: 5, content: "会议记录的好帮手！中英文混合识别准确率很高。", date: "2026-04-21" },
      { id: "r12", userName: "褚十四", userAvatar: "CH", rating: 4, content: "实时转录速度很快，说话人识别功能很实用。", date: "2026-04-17" },
    ],
    versionHistory: [
      { version: "2.3.0", date: "2026-04-19", changelog: ["优化中英文混合识别准确率", "新增说话人识别功能"] },
      { version: "2.0.0", date: "2026-02-15", changelog: ["新增实时流式转录", "支持多种音频格式"] },
      { version: "1.0.0", date: "2025-11-05", changelog: ["首个版本发布", "支持中文和英文识别"] },
    ],
    developer: { name: "VoicePilot", description: "深耕语音 AI 技术多年的团队，为全球用户提供高质量的语音识别和合成服务。", website: "https://voicepilot.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "API 文档", url: "#" },
    ],
  },
  "7": {
    pluginId: "7",
    readme: `# SQL 查询优化器\n\n分析 SQL 语句，提供索引建议和性能优化方案。\n\n## 主要特性\n\n- 支持 MySQL、PostgreSQL 等主流数据库\n- 自动检测慢查询\n- 提供索引建议\n- 生成优化方案报告\n\n\`\`\`sql\n-- 输入原始 SQL\nSELECT * FROM orders WHERE user_id = 123 AND status = 'active';\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「SQL 查询优化器」并点击安装",
      "连接你的数据库",
      "输入需要优化的 SQL 语句",
      "查看优化建议并应用",
    ],
    dependencies: ["数据库连接权限"],
    reviews: [
      { id: "r13", userName: "卫十五", userAvatar: "WY", rating: 4, content: "索引建议很实用，帮我们优化了不少慢查询。", date: "2026-04-18" },
    ],
    versionHistory: [
      { version: "1.8.0", date: "2026-04-14", changelog: ["新增 PostgreSQL 支持", "优化索引推荐算法"] },
      { version: "1.0.0", date: "2026-02-28", changelog: ["首个版本发布", "支持 MySQL"] },
    ],
    developer: { name: "QueryGenius", description: "数据库性能优化专家团队，致力于让每个查询都跑得更快。", website: "https://querygenius.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "数据库连接指南", url: "#" },
    ],
  },
  "9": {
    pluginId: "9",
    readme: `# Slack 通知 MCP\n\n将智能体输出实时推送到 Slack 频道，支持格式化和附件。\n\n## 主要特性\n\n- 实时推送智能体对话结果\n- 支持 Markdown 格式化\n- 支持文件附件\n- 可自定义通知规则\n\n\`\`\`bash\nawait slack.sendNotification({\n  channel: "#ai-results",\n  message: "分析完成：发现 3 个潜在问题"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「Slack 通知 MCP」并点击安装",
      "授权 Slack 工作区",
      "选择目标频道",
      "配置通知规则（关键词触发 / 全部通知）",
    ],
    dependencies: ["Slack 工作区管理员授权"],
    reviews: [
      { id: "r14", userName: "韩十六", userAvatar: "HY", rating: 4, content: "集成简单，通知推送很及时。希望后续支持更多消息格式。", date: "2026-04-22" },
    ],
    versionHistory: [
      { version: "1.1.0", date: "2026-04-21", changelog: ["新增文件附件功能", "优化通知速度"] },
      { version: "1.0.0", date: "2026-03-20", changelog: ["首个版本发布", "支持 Slack 消息推送"] },
    ],
    developer: { name: "NotiFlow", description: "专注企业级通知和消息推送的团队，让 AI 智能体的产出更及时地触达团队。", website: "https://notiflow.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "Slack 配置指南", url: "#" },
    ],
  },
  "10": {
    pluginId: "10",
    readme: `# 代码解释器\n\n逐行解释代码逻辑，帮助开发者快速理解复杂代码库。\n\n## 主要特性\n\n- 支持 20+ 编程语言\n- 逐行或分块解释\n- 可视化执行流程\n- 支持代码片段高亮标注\n\n\`\`\`typescript\nfunction fib(n: number): number {\n  if (n <= 1) return n;\n  return fib(n - 1) + fib(n - 2);\n}\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「代码解释器」并点击安装",
      "粘贴或选择代码片段",
      "选择解释详细程度",
      "查看逐行解释和学习要点",
    ],
    dependencies: ["无特殊依赖"],
    reviews: [
      { id: "r15", userName: "杨十七", userAvatar: "YY", rating: 5, content: "学习新代码库的神器！解释通俗易懂，示例很清晰。", date: "2026-04-24" },
      { id: "r16", userName: "朱十八", userAvatar: "ZU", rating: 4, content: "支持的语言很多，解释质量高。希望能增加更多可视化功能。", date: "2026-04-20" },
    ],
    versionHistory: [
      { version: "2.0.1", date: "2026-04-23", changelog: ["修复部分语言解释不完整的问题", "新增代码高亮标注功能"] },
      { version: "2.0.0", date: "2026-03-10", changelog: ["新增可视化执行流程", "支持 20+ 语言"] },
      { version: "1.0.0", date: "2026-02-15", changelog: ["首个版本发布", "支持 5 种主流语言"] },
    ],
    developer: { name: "CodeClarity", description: "让代码更易理解的团队。我们相信好的工具能帮助每个开发者更快地掌握新技术。", website: "https://codeclarity.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "支持的语言列表", url: "#" },
      { label: "API 文档", url: "#" },
    ],
  },
  "12": {
    pluginId: "12",
    readme: `# 情感分析引擎\n\n实时分析文本中的情感倾向，支持正面/负面/中性分类。\n\n## 主要特性\n\n- 多维度情感分析\n- 支持中文、英文等多种语言\n- 细分情感类别（喜悦、愤怒、悲伤等）\n- 批量处理支持\n\n\`\`\`bash\nresult = await sentiment.analyze({\n  text: "这个产品真的改变了我工作的方式！"\n});\n\`\`\``,
    installSteps: [
      "在插件市场中搜索「情感分析引擎」并点击安装",
      "输入或粘贴需要分析的文本",
      "选择分析粒度（全文 / 段落 / 句子）",
      "查看情感分析结果和可视化图表",
    ],
    dependencies: ["无特殊依赖"],
    reviews: [
      { id: "r17", userName: "秦十九", userAvatar: "QY", rating: 5, content: "情感分类很准确，多维度分析功能很强大。用于客服场景效果显著。", date: "2026-04-19" },
    ],
    versionHistory: [
      { version: "3.1.0", date: "2026-04-17", changelog: ["新增细分情感类别", "优化中文情感分析准确率"] },
      { version: "2.0.0", date: "2026-02-20", changelog: ["新增多维度分析", "支持批量处理"] },
      { version: "1.0.0", date: "2026-01-08", changelog: ["首个版本发布", "支持基础情感三分类"] },
    ],
    developer: { name: "EmoteAI", description: "专注于情感智能技术的团队，帮助企业更好地理解用户情感和需求。", website: "https://emoteai.example.com" },
    docs: [
      { label: "使用文档", url: "#" },
      { label: "API 文档", url: "#" },
      { label: "情感分类标准", url: "#" },
    ],
  },
};

export function getPluginDetail(pluginId: string): PluginDetail | undefined {
  return pluginDetails[pluginId];
}

export const featuredCollections = [
  {
    id: "dev-tools",
    title: "开发工具合集",
    description: "提升编码效率的必备工具",
    pluginIds: ["1", "10", "7"],
  },
  {
    id: "productivity",
    title: "效率提升精选",
    description: "让工作事半功倍的插件",
    pluginIds: ["2", "3", "6", "12"],
  },
  {
    id: "integration",
    title: "集成与连接",
    description: "打通各种平台和工具",
    pluginIds: ["4", "9"],
  },
];
