import { sql } from "drizzle-orm";
import db from "../database";
import { indexExists, tableExists } from "../database/sqlite-helpers";

/**
 * Repairs notification preference tables for instances where migration state
 * drift left the schema partially applied.
 *
 * SQLite notes: on fresh installs all three tables (columns, indexes and
 * foreign keys) are created by the Drizzle migrations, so this is a no-op
 * guard. PostgreSQL's `DO $$ ... pg_constraint` blocks are not supported by
 * SQLite and are intentionally omitted.
 */
export async function migrateNotificationPreferencesSchema() {
  console.log("🔄 Checking notification preference schema...");

  try {
    const tables = [
      "user_notification_preference",
      "user_notification_workspace_rule",
      "user_notification_workspace_project",
    ];

    for (const table of tables) {
      if (!(await tableExists(db, table))) {
        console.warn(
          `⚠️ Table "${table}" is missing; Drizzle migrations should have created it.`,
        );
      }
    }

    const indexes = [
      "user_notification_preference_user_id_unique",
      "user_notification_workspace_rule_user_workspace_unique",
      "user_notification_workspace_rule_workspace_id_id_unique",
      "user_notification_workspace_project_rule_project_unique",
      "user_notification_workspace_rule_userId_idx",
      "user_notification_workspace_rule_workspaceId_idx",
      "user_notification_workspace_project_ruleId_idx",
      "user_notification_workspace_project_projectId_idx",
    ];

    const indexStatements: Record<string, string> = {
      user_notification_preference_user_id_unique:
        'CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_preference_user_id_unique" ON "user_notification_preference" ("user_id")',
      user_notification_workspace_rule_user_workspace_unique:
        'CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_workspace_rule_user_workspace_unique" ON "user_notification_workspace_rule" ("user_id", "workspace_id")',
      user_notification_workspace_rule_workspace_id_id_unique:
        'CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_workspace_rule_workspace_id_id_unique" ON "user_notification_workspace_rule" ("workspace_id", "id")',
      user_notification_workspace_project_rule_project_unique:
        'CREATE UNIQUE INDEX IF NOT EXISTS "user_notification_workspace_project_rule_project_unique" ON "user_notification_workspace_project" ("workspace_rule_id", "project_id")',
      user_notification_workspace_rule_userId_idx:
        'CREATE INDEX IF NOT EXISTS "user_notification_workspace_rule_userId_idx" ON "user_notification_workspace_rule" ("user_id")',
      user_notification_workspace_rule_workspaceId_idx:
        'CREATE INDEX IF NOT EXISTS "user_notification_workspace_rule_workspaceId_idx" ON "user_notification_workspace_rule" ("workspace_id")',
      user_notification_workspace_project_ruleId_idx:
        'CREATE INDEX IF NOT EXISTS "user_notification_workspace_project_ruleId_idx" ON "user_notification_workspace_project" ("workspace_rule_id")',
      user_notification_workspace_project_projectId_idx:
        'CREATE INDEX IF NOT EXISTS "user_notification_workspace_project_projectId_idx" ON "user_notification_workspace_project" ("project_id")',
    };

    for (const indexName of indexes) {
      if (!(await indexExists(db, indexName))) {
        await db.run(sql.raw(indexStatements[indexName] ?? ""));
      }
    }

    console.log("✅ Notification preference schema check complete!");
  } catch (error) {
    console.error("❌ Error during notification preference migration:", error);
    throw error;
  }
}
