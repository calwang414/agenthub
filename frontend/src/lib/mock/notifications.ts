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

export const mockAnnouncements: Announcement[] = [
  {
    id: "a1",
    title: "AI 插件市场正式上线通知",
    content: "<p>尊敬的开发者们，AI 智能体插件市场现已正式上线！欢迎各位开发者入驻并发布你的优秀插件。</p><p>上线首月注册即享 <b>30 天免费试用</b> Pro 版功能。</p>",
    priority: "pinned",
    linkUrl: "",
    isDismissible: true,
    isActive: true,
    publishAt: "2026-04-01 00:00",
    expireAt: "2026-07-01 00:00",
    createdAt: "2026-04-01 08:00",
  },
  {
    id: "a2",
    title: "v2.5 版本发布公告",
    content: "<p>平台已升级至 <b>v2.5</b> 版本，本次更新包含以下内容：</p><ul><li>新增插件推荐算法，提升匹配准确率</li><li>优化搜索性能，响应速度提升 40%</li><li>修复若干已知 Bug</li></ul>",
    priority: "pinned",
    linkUrl: "/changelog",
    isDismissible: true,
    isActive: true,
    publishAt: "2026-04-20 10:00",
    expireAt: null,
    createdAt: "2026-04-20 10:00",
  },
  {
    id: "a3",
    title: "五一假期服务保障通知",
    content: "<p>五一劳动节（5月1日-5月5日）期间，平台将正常运营。技术支持响应时间可能略有延长，敬请谅解。</p>",
    priority: "normal",
    linkUrl: "",
    isDismissible: false,
    isActive: true,
    publishAt: null,
    expireAt: "2026-05-06 00:00",
    createdAt: "2026-04-28 14:30",
  },
  {
    id: "a4",
    title: "新插件审核规则调整",
    content: "<p>自 2026 年 5 月 1 日起，所有新提交的插件需通过<b>安全扫描</b>后方可上架。请各位开发者确保插件代码符合安全规范。</p><p>详情请查看 <a href='/docs/security'>安全规范文档</a>。</p>",
    priority: "normal",
    linkUrl: "/docs/security",
    isDismissible: true,
    isActive: false,
    publishAt: "2026-05-01 00:00",
    expireAt: null,
    createdAt: "2026-04-25 09:00",
  },
  {
    id: "a5",
    title: "开发者激励计划预告",
    content: "<p>为鼓励优质插件创作，平台将于近期推出<b>开发者激励计划</b>：</p><ul><li>月度 TOP 10 插件可获得流量扶持</li><li>季度优秀开发者颁发认证徽章</li><li>年度最佳插件评选及奖金</li></ul><p>敬请期待！</p>",
    priority: "normal",
    linkUrl: "",
    isDismissible: true,
    isActive: true,
    publishAt: null,
    expireAt: null,
    createdAt: "2026-04-22 16:00",
  },
  {
    id: "a6",
    title: "系统维护预告",
    content: "<p>平台计划于 <b>5月10日凌晨 2:00-4:00</b> 进行系统升级维护，届时服务可能短暂中断，请提前做好准备。</p>",
    priority: "normal",
    linkUrl: "",
    isDismissible: false,
    isActive: false,
    publishAt: "2026-05-08 00:00",
    expireAt: "2026-05-10 04:00",
    createdAt: "2026-04-28 10:00",
  },
];

export const mockNotificationRecords: NotificationRecord[] = [
  {
    id: "n1",
    content: "<p>欢迎加入 AI 智能体插件市场！请完善你的开发者资料，即可开始发布插件。</p>",
    targetType: "all",
    targetRoles: [],
    sentAt: "2026-04-27 10:30",
    status: "sent",
  },
  {
    id: "n2",
    content: "<p>亲爱的管理员：v2.5 版本已发布，请查看 <a href='/changelog'>更新日志</a> 了解详情。</p>",
    targetType: "byRole",
    targetRoles: ["admin"],
    sentAt: "2026-04-20 10:05",
    status: "sent",
  },
  {
    id: "n3",
    content: "<p>🔥 新的热门插件 <b>代码审查 Agent</b> 已上架，赶快去试试吧！</p>",
    targetType: "all",
    targetRoles: [],
    sentAt: "2026-04-18 15:00",
    status: "sent",
  },
  {
    id: "n4",
    content: "<p>尊敬的开发者，你的插件已通过审核，现已上架！</p>",
    targetType: "byRole",
    targetRoles: ["editor"],
    sentAt: "2026-04-15 09:20",
    status: "sent",
  },
  {
    id: "n5",
    content: "<p>⚠️ 测试通知：这是一条测试消息，请忽略。</p>",
    targetType: "all",
    targetRoles: [],
    sentAt: "2026-04-10 18:00",
    status: "failed",
  },
];
