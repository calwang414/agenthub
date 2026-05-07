-- 修复 Storage DELETE 策略（移除 owner 限制，与 INSERT/UPDATE 策略保持一致）
-- 003 迁移修复了 INSERT 和 UPDATE，但遗漏了 DELETE

DROP POLICY IF EXISTS "Users can delete their uploads" ON storage.objects;
CREATE POLICY "Users can delete uploads"
  ON storage.objects FOR DELETE
  USING (bucket_id = 'agenthub');
