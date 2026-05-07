-- 添加文件路径列
ALTER TABLE public.agenthub_plugins 
  ADD COLUMN IF NOT EXISTS package_file TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS cover_images JSONB DEFAULT '[]'::jsonb;

-- 添加 Storage UPDATE 策略（修复图标覆盖上传静默失败）
DROP POLICY IF EXISTS "Authenticated users can update icons" ON storage.objects;
CREATE POLICY "Authenticated users can update icons"
  ON storage.objects FOR UPDATE
  USING (bucket_id = 'agenthub' AND auth.role() = 'authenticated')
  WITH CHECK (bucket_id = 'agenthub' AND auth.role() = 'authenticated');
