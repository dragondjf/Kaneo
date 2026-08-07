import { sql } from "drizzle-orm";
import db from "../database";
import { columnExists, tableExists } from "../database/sqlite-helpers";

/**
 * Migration script to:
 * 1. Rename active_workspace_id to active_organization_id in session table
 * 2. Add created_at column to invitation table if it doesn't exist
 * This runs before Drizzle migrations to ensure the column names match the schema.
 *
 * SQLite notes: fresh installs are created directly from the Drizzle schema
 * (correct columns, defaults and NOT NULL constraints), so these legacy
 * upgrade steps are no-ops. The SQL below is SQLite-compatible for the cases
 * that can still be reached.
 */
export async function migrateSessionColumn() {
  console.log(
    "🔄 Checking session table for active_workspace_id to active_organization_id migration...",
  );

  try {
    // Migrate session table column
    const sessionExists = await tableExists(db, "session");

    if (sessionExists) {
      const hasOldColumn = await columnExists(
        db,
        "session",
        "active_workspace_id",
      );
      const hasNewColumn = await columnExists(
        db,
        "session",
        "active_organization_id",
      );

      if (hasOldColumn && !hasNewColumn) {
        console.log(
          "📝 Found active_workspace_id column, renaming to active_organization_id...",
        );
        await db.run(sql`
          ALTER TABLE "session"
          RENAME COLUMN "active_workspace_id" TO "active_organization_id";
        `);
        console.log(
          "✅ Successfully renamed active_workspace_id to active_organization_id",
        );
      } else if (hasNewColumn) {
        console.log(
          "✅ active_organization_id column already exists; skipping migration.",
        );
      } else {
        console.log(
          "🛈 active_workspace_id column does not exist; skipping migration.",
        );
      }
    } else {
      console.log("🛈 session table does not exist; skipping migration.");
    }

    // Migrate invitation table - add created_at column
    console.log(
      "🔄 Checking invitation table for created_at column migration...",
    );

    const invitationExists = await tableExists(db, "invitation");

    if (invitationExists) {
      const hasCreatedAt = await columnExists(db, "invitation", "created_at");

      if (!hasCreatedAt) {
        console.log("📝 Adding created_at column to invitation table...");
        // Add column as nullable first
        await db.run(sql`
          ALTER TABLE "invitation"
          ADD COLUMN "created_at" timestamp;
        `);

        // Set default value for existing rows (use expires_at - 1 month as a reasonable default)
        await db.run(sql`
          UPDATE "invitation"
          SET "created_at" = datetime(COALESCE("expires_at", datetime('now')), '-1 month')
          WHERE "created_at" IS NULL;
        `);

        // SQLite cannot ALTER COLUMN SET DEFAULT/NOT NULL; fresh installs get
        // the correct definition from the Drizzle migrations instead.
        console.log(
          "✅ Successfully added created_at column to invitation table",
        );
      } else {
        console.log(
          "✅ created_at column already exists in invitation table; skipping migration.",
        );
      }
    } else {
      console.log("🛈 invitation table does not exist; skipping migration.");
    }
  } catch (error) {
    console.error("❌ Error during migration:", error);
    throw error;
  }
}
