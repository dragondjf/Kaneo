import { sql } from "drizzle-orm";
import db from "../database";
import { columnExists, tableExists } from "../database/sqlite-helpers";

/**
 * Migration script to handle conversion from user_email to user_id in workspace_member table.
 * This runs before Drizzle migrations to ensure no NULL user_id values exist and prevents
 * column collision errors during migration.
 *
 * SQLite notes: the legacy `workspace_member` table does not exist on fresh
 * installs (the current schema uses `workspace_user`), so this is a no-op.
 */
export async function migrateWorkspaceUserEmail() {
  console.log(
    "🔄 Checking workspace_member table for user_email to user_id migration...",
  );

  try {
    if (!(await tableExists(db, "workspace_member"))) {
      console.log(
        "🛈 workspace_member table does not exist; skipping migration.",
      );
      return;
    }

    // Check if user_email column still exists
    const hasUserEmailColumn = await columnExists(
      db,
      "workspace_member",
      "user_email",
    );

    // Check if user_id column already exists
    const hasUserIdColumn = await columnExists(db, "workspace_member", "user_id");

    if (hasUserEmailColumn) {
      console.log("📧 Found user_email column, migrating to user_id...");

      // Add user_id column if it doesn't exist
      if (!hasUserIdColumn) {
        await db.run(sql`
          ALTER TABLE "workspace_member" ADD COLUMN "user_id" text;
        `);
        console.log("➕ Added user_id column");
      }

      // Update user_id based on user_email
      await db.run(sql`
        UPDATE "workspace_member"
        SET "user_id" = (
          SELECT u.id
          FROM "user" u
          WHERE u.email = "workspace_member"."user_email"
        )
        WHERE "user_id" IS NULL AND "user_email" IS NOT NULL;
      `);

      // Remove records where user_email doesn't match any existing user
      const orphanedRecords = await db.all(sql`
        SELECT COUNT(*) as count
        FROM "workspace_member"
        WHERE "user_id" IS NULL AND "user_email" IS NOT NULL;
      `);

      if (
        (orphanedRecords[0] as { count?: number } | undefined)?.count &&
        Number(
          (orphanedRecords[0] as { count?: number } | undefined)?.count,
        ) > 0
      ) {
        console.log(
          `⚠️  Found ${(orphanedRecords[0] as { count?: number } | undefined)?.count} workspace_member records with invalid user_email. Removing them...`,
        );

        await db.run(sql`
          DELETE FROM "workspace_member"
          WHERE "user_id" IS NULL AND "user_email" IS NOT NULL;
        `);
      }

      // Remove records where both user_email and user_id are NULL
      const nullRecords = await db.all(sql`
        SELECT COUNT(*) as count
        FROM "workspace_member"
        WHERE "user_id" IS NULL AND ("user_email" IS NULL OR "user_email" = '');
      `);

      if (
        (nullRecords[0] as { count?: number } | undefined)?.count &&
        Number((nullRecords[0] as { count?: number } | undefined)?.count) > 0
      ) {
        console.log(
          `⚠️  Found ${(nullRecords[0] as { count?: number } | undefined)?.count} workspace_member records with no user identification. Removing them...`,
        );

        await db.run(sql`
          DELETE FROM "workspace_member"
          WHERE "user_id" IS NULL AND ("user_email" IS NULL OR "user_email" = '');
        `);
      }

      // Drop the user_email column (completing the migration)
      await db.run(sql`
        ALTER TABLE "workspace_member" DROP COLUMN "user_email";
      `);

      console.log(
        "✅ Successfully migrated user_email to user_id and dropped user_email column",
      );
    } else if (!hasUserIdColumn) {
      // Neither column exists, add user_id column
      console.log("➕ Adding user_id column to workspace_member table...");
      await db.run(sql`
        ALTER TABLE "workspace_member" ADD COLUMN "user_id" text;
      `);
    }

    // Check if there are any remaining NULL user_id values
    const nullUserIds = await db.all(sql`
      SELECT COUNT(*) as count
      FROM "workspace_member"
      WHERE "user_id" IS NULL;
    `);

    if (
      (nullUserIds[0] as { count?: number } | undefined)?.count &&
      Number((nullUserIds[0] as { count?: number } | undefined)?.count) > 0
    ) {
      console.log(
        `⚠️  Found ${(nullUserIds[0] as { count?: number } | undefined)?.count} workspace_member records with NULL user_id. Removing them...`,
      );

      await db.run(sql`
        DELETE FROM "workspace_member"
        WHERE "user_id" IS NULL;
      `);

      console.log("✅ Removed records with NULL user_id");
    }

    console.log("✅ Workspace member migration completed successfully!");
  } catch (error) {
    console.error("❌ Error during workspace member migration:", error);
    throw error;
  }
}
