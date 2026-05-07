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

export interface FeaturedCollection {
  id: string;
  title: string;
  description: string;
  pluginIds: string[];
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
