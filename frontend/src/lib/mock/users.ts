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

export const mockUsers: MockUser[] = [
  { id: "1", name: "张三", nickname: "张三", email: "zhangsan@agenthub.ai", phone: "138-0000-0001", password: "admin123", role: "admin", status: "active", createdAt: "2025-06-15 10:30", lastActiveAt: "2026-04-29 09:15" },
  { id: "2", name: "李四", nickname: "李四", email: "lisi@agenthub.ai", phone: "138-0000-0002", password: "editor123", role: "editor", status: "active", createdAt: "2025-08-22 14:20", lastActiveAt: "2026-04-28 17:40" },
  { id: "3", name: "王五", nickname: "王五", email: "wangwu@agenthub.ai", phone: "138-0000-0003", password: "guest123", role: "guest", status: "disabled", createdAt: "2025-10-08 09:00", lastActiveAt: "2026-03-15 11:22" },
  { id: "4", name: "赵六", nickname: "赵六", email: "zhaoliu@agenthub.ai", phone: "138-0000-0004", password: "editor123", role: "editor", status: "active", createdAt: "2025-11-03 16:45", lastActiveAt: "2026-04-29 08:30" },
  { id: "5", name: "孙七", nickname: "孙七", email: "sunqi@agenthub.ai", phone: "138-0000-0005", password: "guest123", role: "guest", status: "active", createdAt: "2025-12-19 11:15", lastActiveAt: "2026-04-27 20:05" },
  { id: "6", name: "周八", nickname: "周八", email: "zhouba@agenthub.ai", phone: "138-0000-0006", password: "admin123", role: "admin", status: "active", createdAt: "2026-01-07 08:50", lastActiveAt: "2026-04-29 10:00" },
  { id: "7", name: "吴九", nickname: "吴九", email: "wujiu@agenthub.ai", phone: "138-0000-0007", password: "editor123", role: "editor", status: "disabled", createdAt: "2026-01-20 13:30", lastActiveAt: "2026-02-28 16:10" },
  { id: "8", name: "郑十", nickname: "郑十", email: "zhengshi@agenthub.ai", phone: "138-0000-0008", password: "guest123", role: "guest", status: "active", createdAt: "2026-02-14 10:20", lastActiveAt: "2026-04-26 14:55" },
  { id: "9", name: "陈十一", nickname: "陈十一", email: "chenshiyi@agenthub.ai", phone: "138-0000-0009", password: "editor123", role: "editor", status: "active", createdAt: "2026-02-28 09:35", lastActiveAt: "2026-04-29 07:20" },
  { id: "10", name: "林十二", nickname: "林十二", email: "linshier@agenthub.ai", phone: "138-0000-0010", password: "admin123", role: "admin", status: "active", createdAt: "2026-03-05 15:00", lastActiveAt: "2026-04-28 22:45" },
  { id: "11", name: "黄十三", nickname: "黄十三", email: "huangshisan@agenthub.ai", phone: "138-0000-0011", password: "guest123", role: "guest", status: "disabled", createdAt: "2026-03-12 12:10", lastActiveAt: "2026-04-01 09:30" },
  { id: "12", name: "刘十四", nickname: "刘十四", email: "liushisi@agenthub.ai", phone: "138-0000-0012", password: "editor123", role: "editor", status: "active", createdAt: "2026-03-20 08:40", lastActiveAt: "2026-04-29 06:55" },
  { id: "13", name: "杨十五", nickname: "杨十五", email: "yangshiwu@agenthub.ai", phone: "138-0000-0013", password: "guest123", role: "guest", status: "active", createdAt: "2026-04-01 17:25", lastActiveAt: "2026-04-28 19:10" },
  { id: "14", name: "朱十六", nickname: "朱十六", email: "zhushiliu@agenthub.ai", phone: "138-0000-0014", password: "editor123", role: "editor", status: "active", createdAt: "2026-04-10 11:55", lastActiveAt: "2026-04-29 08:00" },
  { id: "15", name: "马十七", nickname: "马十七", email: "mashiqi@agenthub.ai", phone: "138-0000-0015", password: "guest123", role: "guest", status: "active", createdAt: "2026-04-18 14:30", lastActiveAt: "2026-04-28 21:15" },
  { id: "16", name: "何十八", nickname: "何十八", email: "heshiba@agenthub.ai", phone: "138-0000-0016", password: "admin123", role: "admin", status: "disabled", createdAt: "2026-04-22 10:05", lastActiveAt: "2026-04-25 12:40" },
  { id: "17", name: "罗十九", nickname: "罗十九", email: "luoshijiu@agenthub.ai", phone: "138-0000-0017", password: "editor123", role: "editor", status: "active", createdAt: "2026-04-25 09:20", lastActiveAt: "2026-04-29 05:30" },
  { id: "18", name: "梁二十", nickname: "梁二十", email: "liangershi@agenthub.ai", phone: "138-0000-0018", password: "guest123", role: "guest", status: "active", createdAt: "2026-04-27 16:45", lastActiveAt: "2026-04-29 01:10" },
];

export async function fetchMockUsers(): Promise<MockUser[]> {
  return new Promise((resolve) => {
    setTimeout(() => resolve(mockUsers), 300);
  });
}
