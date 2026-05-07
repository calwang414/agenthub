export interface Plugin {
  id: string;
  name: string;
  description: string;
  version: string;
  author: string;
  category: "Skill" | "Agent" | "Tool" | "MCP" | "Plugin";
  downloads: number;
  rating: number;
  status: "published" | "draft" | "reviewing";
  tags: string[];
  icon?: string;
  packageFile?: string;
  coverImages?: string[];
  createdAt: string;
  updatedAt: string;
}

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

export interface Announcement {
  id: string;
  title: string;
  content: string;
  priority: "pinned" | "normal";
  linkUrl: string;
  isDismissible: boolean;
  isActive: boolean;
  publishAt: string | null;
  expireAt: string | null;
  createdAt: string;
}

export interface NotificationRecord {
  id: string;
  content: string;
  targetType: "all" | "byRole";
  targetRoles: ("admin" | "editor" | "guest")[];
  sentAt: string;
  status: "sent" | "failed";
}

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

export interface MockUser {
  id: string;
  name: string;
  nickname: string;
  email: string;
  phone: string;
  password: string;
  role: "admin" | "editor" | "guest";
  status: "active" | "disabled";
  createdAt: string;
  lastActiveAt: string;
}

export interface MockProduct {
  id: string;
  name: string;
  price: number;
  category: string;
  status: "active" | "draft" | "archived";
}
