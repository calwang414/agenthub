-- 添加文件路径列
ALTER TABLE public.agenthub_plugins 
  ADD COLUMN IF NOT EXISTS package_file TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_images JSONB DEFAULT '[]'::jsonb;

-- 修复 Storage INSERT 策略（移除 auth.role 限制，自托管实例兼容性）
DROP POLICY IF EXISTS "Authenticated users can upload icons" ON storage.objects;
CREATE POLICY "Authenticated users can upload icons"
  ON storage.objects FOR INSERT
  WITH CHECK (bucket_id = 'agenthub');

-- 修复 Storage UPDATE 策略
DROP POLICY IF EXISTS "Authenticated users can update icons" ON storage.objects;
CREATE POLICY "Authenticated users can update icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'agenthub')
  WITH CHECK (bucket_id = 'agenthub');
