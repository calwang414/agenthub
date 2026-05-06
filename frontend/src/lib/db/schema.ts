import { getDb } from "./index";

export function initSchema(): void {
  const db = getDb();

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      nickname TEXT NOT NULL DEFAULT '',
      email TEXT NOT NULL UNIQUE,
      phone TEXT NOT NULL DEFAULT '',
      password TEXT NOT NULL DEFAULT '',
      role TEXT NOT NULL DEFAULT 'guest' CHECK(role IN ('admin','editor','guest')),
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','disabled')),
      created_at TEXT NOT NULL DEFAULT '',
      last_active_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS plugins (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      version TEXT NOT NULL DEFAULT '',
      author TEXT NOT NULL DEFAULT '',
      category TEXT NOT NULL DEFAULT '' CHECK(category IN ('Skill','Agent','Tool','MCP','Plugin')),
      downloads INTEGER NOT NULL DEFAULT 0,
      rating REAL NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft','reviewing')),
      tags TEXT NOT NULL DEFAULT '[]',
      icon TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      plugin_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS tags (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '',
      icon TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      plugin_count INTEGER NOT NULL DEFAULT 0,
      sort_order INTEGER NOT NULL DEFAULT 0,
      status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
      created_at TEXT NOT NULL DEFAULT '',
      updated_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS announcements (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('pinned','normal')),
      link_url TEXT NOT NULL DEFAULT '',
      is_dismissible INTEGER NOT NULL DEFAULT 1,
      is_active INTEGER NOT NULL DEFAULT 1,
      publish_at TEXT,
      expire_at TEXT,
      created_at TEXT NOT NULL DEFAULT ''
    );

    CREATE TABLE IF NOT EXISTS notification_records (
      id TEXT PRIMARY KEY,
      content TEXT NOT NULL DEFAULT '',
      target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all','byRole')),
      target_roles TEXT NOT NULL DEFAULT '[]',
      sent_at TEXT NOT NULL DEFAULT '',
      status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed'))
    );

    CREATE TABLE IF NOT EXISTS plugin_details (
      plugin_id TEXT PRIMARY KEY,
      readme TEXT NOT NULL DEFAULT '',
      install_steps TEXT NOT NULL DEFAULT '[]',
      dependencies TEXT NOT NULL DEFAULT '[]',
      reviews TEXT NOT NULL DEFAULT '[]',
      version_history TEXT NOT NULL DEFAULT '[]',
      developer_name TEXT NOT NULL DEFAULT '',
      developer_description TEXT NOT NULL DEFAULT '',
      developer_website TEXT NOT NULL DEFAULT '',
      docs TEXT NOT NULL DEFAULT '[]',
      FOREIGN KEY (plugin_id) REFERENCES plugins(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS featured_collections (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT NOT NULL DEFAULT '',
      plugin_ids TEXT NOT NULL DEFAULT '[]'
    );
  `);

  const columns = db.prepare("PRAGMA table_info(users)").all() as { name: string }[];
  if (!columns.find((c) => c.name === "nickname")) {
    db.exec("ALTER TABLE users ADD COLUMN nickname TEXT NOT NULL DEFAULT ''");
    db.prepare("UPDATE users SET nickname = name WHERE nickname = ''").run();
  }
}
