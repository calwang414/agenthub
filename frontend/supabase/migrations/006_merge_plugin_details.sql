-- 006_merge_plugin_details.sql
-- 将 agenthub_plugin_details 活跃字段合并到 agenthub_plugins，删除旧表

ALTER TABLE public.agenthub_plugins
  ADD COLUMN IF NOT EXISTS readme TEXT DEFAULT '',
  ADD COLUMN IF NOT EXISTS reviews JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS version_history JSONB DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS changelog TEXT DEFAULT '';

UPDATE public.agenthub_plugins p
SET
  readme = d.readme,
  reviews = d.reviews,
  version_history = d.version_history
FROM public.agenthub_plugin_details d
WHERE p.id = d.plugin_id;

DROP POLICY IF EXISTS "Plugin details viewable by all" ON public.agenthub_plugin_details;
DROP POLICY IF EXISTS "Editors can manage plugin details" ON public.agenthub_plugin_details;
DROP TABLE IF EXISTS public.agenthub_plugin_details;
