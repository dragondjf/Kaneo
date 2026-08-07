import { sql } from "drizzle-orm";
import db from "../database";
import { columnExists, indexExists, tableExists } from "../database/sqlite-helpers";

/**
 * Ensures API key schema matches Better Auth expectations:
 * - reference_id exists and is populated from user_id when needed
 * - config_id exists with default value
 * - user_id is nullable (Better Auth inserts reference_id, not user_id)
 *
 * Must run after Drizzle `migrate()` so the `apikey` table exists (see `runStartupTasks`).
 */
export async function migrateApiKeyReferenceId() {
  console.log("🔄 Checking apikey table reference_id migration...");

  try {
    if (!(await tableExists(db, "apikey"))) {
      console.log("🛈 apikey table does not exist; skipping migration.");
      return;
    }

    const hasReferenceIdColumn = await columnExists(db, "apikey", "reference_id");
    const hasConfigIdColumn = await columnExists(db, "apikey", "config_id");
    const hasUserIdColumn = await columnExists(db, "apikey", "user_id");

    if (!hasReferenceIdColumn) {
      console.log("➕ Adding reference_id column to apikey...");
      await db.run(sql`
        ALTER TABLE "apikey" ADD COLUMN "reference_id" text;
      `);
    }

    if (!hasConfigIdColumn) {
      console.log("➕ Adding config_id column to apikey...");
      await db.run(sql`
        ALTER TABLE "apikey" ADD COLUMN "config_id" text DEFAULT 'default';
      `);
    }

    if (hasUserIdColumn) {
      await db.run(sql`
        UPDATE "apikey"
        SET "reference_id" = "user_id"
        WHERE "reference_id" IS NULL AND "user_id" IS NOT NULL;
      `);

      // NOTE: SQLite has no `ALTER COLUMN ... DROP NOT NULL`. Fresh installs
      // created from the Drizzle schema already have a nullable user_id, so
      // nothing needs to be done here. Existing rows are backfilled above.
    }

    await db.run(sql`
      UPDATE "apikey"
      SET "config_id" = 'default'
      WHERE "config_id" IS NULL;
    `);

    if (!(await indexExists(db, "apikey_configId_idx"))) {
      await db.run(sql`
        CREATE INDEX "apikey_configId_idx" ON "apikey" ("config_id");
      `);
    }

    if (!(await indexExists(db, "apikey_referenceId_idx"))) {
      await db.run(sql`
        CREATE INDEX "apikey_referenceId_idx" ON "apikey" ("reference_id");
      `);
    }

    if (!(await indexExists(db, "apikey_key_idx"))) {
      await db.run(sql`
        CREATE INDEX "apikey_key_idx" ON "apikey" ("key");
      `);
    }

    console.log("✅ API key reference_id migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during apikey migration:", error);
    throw error;
  }
}
