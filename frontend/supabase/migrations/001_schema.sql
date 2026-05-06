-- ==================== 创建 agenthub schema ====================
CREATE SCHEMA IF NOT EXISTS agenthub;

-- ==================== agenthub_users ====================
DROP TABLE IF EXISTS agenthub.agenthub_users CASCADE;
CREATE TABLE agenthub.agenthub_users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  phone TEXT DEFAULT '',
  role TEXT CHECK(role IN ('admin','editor','guest')) DEFAULT 'guest',
  status TEXT CHECK(status IN ('active','disabled')) DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT now(),
  last_active_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenthub.agenthub_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users viewable by all"
  ON agenthub.agenthub_users FOR SELECT USING (true);

CREATE POLICY "Users can update own profile"
  ON agenthub.agenthub_users FOR UPDATE USING (auth.uid() = id);

CREATE POLICY "Admins can insert users"
  ON agenthub.agenthub_users FOR INSERT WITH CHECK (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

CREATE POLICY "Admins can delete users"
  ON agenthub.agenthub_users FOR DELETE USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- 自动创建 profile 触发器
CREATE OR REPLACE FUNCTION agenthub.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO agenthub.agenthub_users (id, name, nickname)
  VALUES (NEW.id, COALESCE(NEW.email, ''), COALESCE(split_part(NEW.email, '@', 1), ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION agenthub.handle_new_user();

-- ==================== agenthub_plugins ====================
CREATE TABLE agenthub.agenthub_plugins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  version TEXT NOT NULL DEFAULT '',
  author TEXT NOT NULL DEFAULT '',
  category TEXT NOT NULL CHECK(category IN ('Skill','Agent','Tool','MCP','Plugin')),
  downloads INTEGER NOT NULL DEFAULT 0,
  rating DOUBLE PRECISION NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'published' CHECK(status IN ('published','draft','reviewing')),
  tags JSONB NOT NULL DEFAULT '[]'::jsonb,
  icon TEXT DEFAULT '',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenthub.agenthub_plugins ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plugins viewable by all"
  ON agenthub.agenthub_plugins FOR SELECT USING (true);

CREATE POLICY "Authenticated can insert plugins"
  ON agenthub.agenthub_plugins FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Owners/admins can update plugins"
  ON agenthub.agenthub_plugins FOR UPDATE USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role IN ('admin','editor'))
  );

CREATE POLICY "Admins can delete plugins"
  ON agenthub.agenthub_plugins FOR DELETE USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_categories ====================
CREATE TABLE agenthub.agenthub_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  icon TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  plugin_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenthub.agenthub_categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Categories viewable by all"
  ON agenthub.agenthub_categories FOR SELECT USING (true);

CREATE POLICY "Admins can manage categories"
  ON agenthub.agenthub_categories FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_tags ====================
CREATE TABLE agenthub.agenthub_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  color TEXT NOT NULL DEFAULT '',
  icon TEXT NOT NULL DEFAULT '',
  description TEXT NOT NULL DEFAULT '',
  plugin_count INTEGER NOT NULL DEFAULT 0,
  sort_order INTEGER NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'enabled' CHECK(status IN ('enabled','disabled')),
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenthub.agenthub_tags ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Tags viewable by all"
  ON agenthub.agenthub_tags FOR SELECT USING (true);

CREATE POLICY "Admins can manage tags"
  ON agenthub.agenthub_tags FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_announcements ====================
CREATE TABLE agenthub.agenthub_announcements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  content TEXT NOT NULL DEFAULT '',
  priority TEXT NOT NULL DEFAULT 'normal' CHECK(priority IN ('pinned','normal')),
  link_url TEXT NOT NULL DEFAULT '',
  is_dismissible BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  publish_at TIMESTAMPTZ,
  expire_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE agenthub.agenthub_announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Announcements viewable by all"
  ON agenthub.agenthub_announcements FOR SELECT USING (true);

CREATE POLICY "Admins can manage announcements"
  ON agenthub.agenthub_announcements FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_notification_records ====================
CREATE TABLE agenthub.agenthub_notification_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content TEXT NOT NULL DEFAULT '',
  target_type TEXT NOT NULL DEFAULT 'all' CHECK(target_type IN ('all','byRole')),
  target_roles JSONB NOT NULL DEFAULT '[]'::jsonb,
  sent_at TIMESTAMPTZ DEFAULT now(),
  status TEXT NOT NULL DEFAULT 'sent' CHECK(status IN ('sent','failed'))
);

ALTER TABLE agenthub.agenthub_notification_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notifications viewable by all"
  ON agenthub.agenthub_notification_records FOR SELECT USING (true);

CREATE POLICY "Admins can manage notifications"
  ON agenthub.agenthub_notification_records FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== agenthub_plugin_details ====================
CREATE TABLE agenthub.agenthub_plugin_details (
  plugin_id UUID PRIMARY KEY REFERENCES agenthub.agenthub_plugins(id) ON DELETE CASCADE,
  readme TEXT NOT NULL DEFAULT '',
  install_steps JSONB NOT NULL DEFAULT '[]'::jsonb,
  dependencies JSONB NOT NULL DEFAULT '[]'::jsonb,
  reviews JSONB NOT NULL DEFAULT '[]'::jsonb,
  version_history JSONB NOT NULL DEFAULT '[]'::jsonb,
  developer_name TEXT NOT NULL DEFAULT '',
  developer_description TEXT NOT NULL DEFAULT '',
  developer_website TEXT NOT NULL DEFAULT '',
  docs JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE agenthub.agenthub_plugin_details ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Plugin details viewable by all"
  ON agenthub.agenthub_plugin_details FOR SELECT USING (true);

CREATE POLICY "Editors can manage plugin details"
  ON agenthub.agenthub_plugin_details FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role IN ('admin','editor'))
  );

-- ==================== agenthub_featured_collections ====================
CREATE TABLE agenthub.agenthub_featured_collections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT NOT NULL DEFAULT '',
  plugin_ids JSONB NOT NULL DEFAULT '[]'::jsonb
);

ALTER TABLE agenthub.agenthub_featured_collections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Collections viewable by all"
  ON agenthub.agenthub_featured_collections FOR SELECT USING (true);

CREATE POLICY "Admins can manage collections"
  ON agenthub.agenthub_featured_collections FOR ALL USING (
    EXISTS (SELECT 1 FROM agenthub.agenthub_users WHERE id = auth.uid() AND role = 'admin')
  );

-- ==================== Storage ====================
INSERT INTO storage.buckets (id, name, public)
VALUES ('agenthub', 'agenthub', true)
ON CONFLICT (id) DO NOTHING;

DROP POLICY IF EXISTS "Public can view icons" ON storage.objects;
CREATE POLICY "Public can view icons"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'agenthub');

DROP POLICY IF EXISTS "Authenticated users can upload icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');

DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
CREATE POLICY "Users can delete their uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agenthub' AND owner = auth.uid());
