import { createClient } from "@supabase/supabase-js";
import Database from "better-sqlite3";
import path from "path";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error("请设置 NEXT_PUBLIC_SUPABASE_URL 和 SUPABASE_SERVICE_ROLE_KEY 环境变量");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

const DB_PATH = path.join(process.cwd(), "data.db");

function toISO8601(val: string | null): string | null {
  if (!val) return null;
  if (val.includes("T")) return val.replace(" ", "T") + "+08:00";
  return val.replace(" ", "T") + "+08:00";
}

async function main() {
  const db = new Database(DB_PATH);
  console.log("Opened SQLite at", DB_PATH);

  const tables = [
    "users", "plugins", "categories", "tags",
    "announcements", "notification_records",
    "plugin_details", "featured_collections",
  ];

  for (const table of tables) {
    const rows = db.prepare(`SELECT * FROM ${table}`).all() as Record<string, unknown>[];
    console.log(`Found ${rows.length} rows in ${table}`);

    if (rows.length === 0) continue;

    const tableMap: Record<string, string> = {
      users: "agenthub_users",
      plugins: "agenthub_plugins",
      categories: "agenthub_categories",
      tags: "agenthub_tags",
      announcements: "agenthub_announcements",
      notification_records: "agenthub_notification_records",
      plugin_details: "agenthub_plugin_details",
      featured_collections: "agenthub_featured_collections",
    };

    const supabaseTable = tableMap[table];

    if (table === "users") {
      for (const row of rows) {
        const r = row as Record<string, unknown>;
        const email = (r.email as string) || `${r.id}@migrated.local`;
        const password = (r.password as string) || "migrated123";
        console.log(`Creating auth user: ${email}`);
        const { error: authErr } = await supabase.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
        });
        if (authErr) {
          console.log(`  User ${email}: ${authErr.message} (may already exist)`);
        } else {
          console.log(`  Created: ${email}`);
        }
      }
      console.log(`Users: created ${rows.length} auth users (profiles auto-created by trigger)`);
      continue;
    }

    const mappedRows = rows.map((row) => {
      const mapped: Record<string, unknown> = {};
      for (const [key, value] of Object.entries(row)) {
        if (table === "announcements" && (key === "is_dismissible" || key === "is_active")) {
          mapped[key] = value === 1 || value === true;
          continue;
        }

        if (
          key === "tags" || key === "install_steps" || key === "dependencies" ||
          key === "reviews" || key === "version_history" || key === "target_roles" ||
          key === "plugin_ids" || key === "docs"
        ) {
          if (typeof value === "string") {
            try { mapped[key] = JSON.parse(value); } catch { mapped[key] = []; }
          } else {
            mapped[key] = value;
          }
          continue;
        }

        if (
          key === "created_at" || key === "updated_at" || key === "sent_at" ||
          key === "publish_at" || key === "expire_at" || key === "last_active_at"
        ) {
          mapped[key] = toISO8601(value as string);
          continue;
        }

        if (table === "plugin_details" && key === "plugin_id") {
          mapped.plugin_id = value;
          continue;
        }

        mapped[key] = value;
      }
      return mapped;
    });

    const batchSize = 50;
    for (let i = 0; i < mappedRows.length; i += batchSize) {
      const batch = mappedRows.slice(i, i + batchSize);
      const { error: insertErr } = await supabase
        .from(supabaseTable)
        .upsert(batch as never, { onConflict: "id" });

      if (insertErr) {
        console.log(`Error inserting ${supabaseTable} batch ${i}: ${insertErr.message}`);
        console.log("First item:", JSON.stringify(batch[0]).slice(0, 200));
      } else {
        console.log(`Inserted ${batch.length} rows into ${supabaseTable}`);
      }
    }
  }

  db.close();
  console.log("Migration complete!");
}

main().catch(console.error);
