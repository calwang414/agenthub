export interface Category {
  id: string;
  name: string;
  icon: string;
  description: string;
  pluginCount: number;
  sortOrder: number;
  status: "enabled" | "disabled";
  createdAt: string;
  updatedAt: string;
}

export const categories: Category[] = [
  {
    id: "1",
    name: "Skill",
    icon: "🧩",
    description: "可复用的技能模块，支持拖拽式组合和使用，为智能体提供特定领域能力",
    pluginCount: 3,
    sortOrder: 1,
    status: "enabled",
    createdAt: "2025-11-05",
    updatedAt: "2026-04-19",
  },
  {
    id: "2",
    name: "Agent",
    icon: "🤖",
    description: "自主 AI 智能体，支持多步骤任务执行和复杂工作流编排",
    pluginCount: 2,
    sortOrder: 2,
    status: "enabled",
    createdAt: "2026-02-10",
    updatedAt: "2026-04-15",
  },
  {
    id: "3",
    name: "Tool",
    icon: "🛠️",
    description: "实用工具集成类插件，覆盖代码审查、SQL 优化、代码解释等开发辅助场景",
    pluginCount: 3,
    sortOrder: 3,
    status: "enabled",
    createdAt: "2026-02-15",
    updatedAt: "2026-04-23",
  },
  {
    id: "4",
    name: "MCP",
    icon: "🔗",
    description: "MCP 协议连接器，提供与外部平台和服务的标准化集成接口",
    pluginCount: 2,
    sortOrder: 4,
    status: "enabled",
    createdAt: "2026-03-01",
    updatedAt: "2026-04-22",
  },
  {
    id: "5",
    name: "Plugin",
    icon: "📦",
    description: "通用插件类型，支持 PPT 生成、Markdown 编辑等独立功能扩展",
    pluginCount: 2,
    sortOrder: 5,
    status: "enabled",
    createdAt: "2026-04-05",
    updatedAt: "2026-04-25",
  },
];
