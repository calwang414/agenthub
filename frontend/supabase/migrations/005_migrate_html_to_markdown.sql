-- 005_migrate_html_to_markdown.sql
-- 将 agenthub_plugins.description 和 agenthub_announcements.content 
-- 中的 HTML 内容转换为 Markdown 格式

BEGIN;

-- 辅助函数：HTML → Markdown 基本转换
CREATE OR REPLACE FUNCTION html_to_markdown(html TEXT) RETURNS TEXT AS $$
DECLARE
    result TEXT;
BEGIN
    IF html IS NULL OR html = '' THEN
        RETURN '';
    END IF;

    result := html;

    -- 替换换行和段落
    result := regexp_replace(result, '<br\s*/?>', E'\n', 'gi');
    result := regexp_replace(result, '</p>\s*<p[^>]*>', E'\n\n', 'gi');
    result := regexp_replace(result, '</?(p|div)[^>]*>', '', 'gi');

    -- 标题
    result := regexp_replace(result, '<h1[^>]*>(.*?)</h1>', E'# \\1\n\n', 'gi');
    result := regexp_replace(result, '<h2[^>]*>(.*?)</h2>', E'## \\1\n\n', 'gi');
    result := regexp_replace(result, '<h3[^>]*>(.*?)</h3>', E'### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h4[^>]*>(.*?)</h4>', E'#### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h5[^>]*>(.*?)</h5>', E'##### \\1\n\n', 'gi');
    result := regexp_replace(result, '<h6[^>]*>(.*?)</h6>', E'###### \\1\n\n', 'gi');

    -- 加粗和斜体
    result := regexp_replace(result, '<strong[^>]*>(.*?)</strong>', '**\\1**', 'gi');
    result := regexp_replace(result, '<b[^>]*>(.*?)</b>', '**\\1**', 'gi');
    result := regexp_replace(result, '<em[^>]*>(.*?)</em>', '*\\1*', 'gi');
    result := regexp_replace(result, '<i[^>]*>(.*?)</i>', '*\\1*', 'gi');

    -- 链接
    result := regexp_replace(result, '<a[^>]*href="(.*?)"[^>]*>(.*?)</a>', '[\\2](\\1)', 'gi');

    -- 列表
    result := regexp_replace(result, '</li>\s*<li[^>]*>', E'\n- ', 'gi');
    result := regexp_replace(result, '<li[^>]*>(.*?)</li>', E'- \\1', 'gi');
    result := regexp_replace(result, '</?(ul|ol)[^>]*>', E'\n', 'gi');

    -- 代码
    result := regexp_replace(result, '<code[^>]*>(.*?)</code>', '`\\1`', 'gi');
    result := regexp_replace(result, '<pre[^>]*><code[^>]*>(.*?)</code></pre>', E'\n```\n\\1\n```\n', 'gi');

    -- 删除线和下划线
    result := regexp_replace(result, '<del[^>]*>(.*?)</del>', '~~\\1~~', 'gi');
    result := regexp_replace(result, '<s[^>]*>(.*?)</s>', '~~\\1~~', 'gi');
    result := regexp_replace(result, '<u[^>]*>(.*?)</u>', '\\1', 'gi');

    -- 去除其他 HTML 标签（保留内容）
    result := regexp_replace(result, '<[^>]+>', '', 'gi');

    -- HTML 实体解码
    result := regexp_replace(result, '&amp;', '&', 'gi');
    result := regexp_replace(result, '&lt;', '<', 'gi');
    result := regexp_replace(result, '&gt;', '>', 'gi');
    result := regexp_replace(result, '&quot;', '"', 'gi');
    result := regexp_replace(result, '&#39;', '''', 'gi');
    result := regexp_replace(result, '&nbsp;', ' ', 'gi');

    -- 清理多余空白行
    result := regexp_replace(result, E'\n{3,}', E'\n\n', 'g');
    result := trim(result);

    RETURN result;
END;
$$ LANGUAGE plpgsql;

-- 迁移插件描述
UPDATE agenthub_plugins
SET description = html_to_markdown(description)
WHERE description LIKE '%<%>%';

-- 迁移公告内容
UPDATE agenthub_announcements
SET content = html_to_markdown(content)
WHERE content LIKE '%<%>%';

-- 清理辅助函数
DROP FUNCTION IF EXISTS html_to_markdown;

COMMIT;
