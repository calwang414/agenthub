-- 002_add_email_to_users.sql
-- 给 agenthub_users 表添加 email 字段，并更新触发器同步写入

ALTER TABLE public.agenthub_users ADD COLUMN IF NOT EXISTS email TEXT DEFAULT '';

-- 更新 handle_new_user 触发器，同步写入 email
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.agenthub_users (id, name, nickname, email)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email, ''),
    COALESCE(split_part(NEW.email, '@', 1), ''),
    COALESCE(NEW.email, '')
  );
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
