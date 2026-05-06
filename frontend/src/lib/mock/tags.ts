export interface Tag {
  id: string;
  name: string;
  color: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export const tags: Tag[] = [
  {
    id: "1",
    name: "代码生成",
    icon: "⚡",
    color: "#cc785c",
    description: "自动生成代码、模板和样板文件，提升开发效率的智能体插件",
    pluginCount: 5,
    sortOrder: 1,
    status: "enabled",
    createdAt: "2025-10-12",
    updatedAt: "2026-04-18",
  },
  {
    id: "2",
    name: "代码审查",
    icon: "🔍",
    color: "#5db8a6",
    description: "代码质量检查、安全审计和最佳实践建议相关插件",
    pluginCount: 3,
    sortOrder: 2,
    status: "enabled",
    createdAt: "2025-11-20",
    updatedAt: "2026-04-20",
  },
  {
    id: "3",
    name: "AI 对话",
    icon: "💬",
    color: "#5b8bd4",
    description: "自然语言对话、问答系统和智能聊天助手类插件",
    pluginCount: 4,
    sortOrder: 3,
    status: "enabled",
    createdAt: "2026-01-05",
    updatedAt: "2026-04-22",
  },
  {
    id: "4",
    name: "自动化",
    icon: "🔄",
    color: "#e8a55a",
    description: "工作流自动化、定时任务和业务流程编排插件",
    pluginCount: 2,
    sortOrder: 4,
    status: "enabled",
    createdAt: "2026-01-18",
    updatedAt: "2026-04-15",
  },
  {
    id: "5",
    name: "数据分析",
    icon: "📈",
    color: "#9b7ec4",
    description: "数据可视化、统计分析、报表生成和商业智能插件",
    pluginCount: 3,
    sortOrder: 5,
    status: "enabled",
    createdAt: "2026-02-08",
    updatedAt: "2026-04-19",
  },
  {
    id: "6",
    name: "文档处理",
    icon: "📄",
    color: "#5db872",
    description: "文档生成、格式转换、内容提取和知识库管理",
    pluginCount: 2,
    sortOrder: 6,
    status: "enabled",
    createdAt: "2026-02-22",
    updatedAt: "2026-04-21",
  },
  {
    id: "7",
    name: "DevOps",
    icon: "🚀",
    color: "#e09b5e",
    description: "CI/CD 集成、容器管理、部署自动化和基础设施即代码",
    pluginCount: 1,
    sortOrder: 7,
    status: "disabled",
    createdAt: "2026-03-10",
    updatedAt: "2026-04-10",
  },
  {
    id: "8",
    name: "安全防护",
    icon: "🔒",
    color: "#c47a6a",
    description: "漏洞扫描、权限管理、加密通信和安全合规检查",
    pluginCount: 2,
    sortOrder: 8,
    status: "disabled",
    createdAt: "2026-03-25",
    updatedAt: "2026-04-12",
  },
];
