import { eq, sql } from "drizzle-orm";
import { HTTPException } from "hono/http-exception";
import db from "../../database";
import { projectTable } from "../../database/schema";

type DbOrTx = typeof db | Parameters<Parameters<typeof db.transaction>[0]>[0];

/**
 * Atomically claims task numbers for a project.
 *
 * Synchronous by design: SQLite transactions (better-sqlite3) cannot run
 * async callbacks, and the Drizzle SQLite query builders execute
 * synchronously, so no `await` is needed.
 */
function claimTaskNumbers(
  projectId: string,
  count: number,
  dbOrTx: DbOrTx = db,
) {
  const [updated] = dbOrTx
    .update(projectTable)
    .set({
      lastTaskNumber: sql`${projectTable.lastTaskNumber} + ${count}`,
    })
    .where(eq(projectTable.id, projectId))
    .returning({ lastTaskNumber: projectTable.lastTaskNumber })
    .all();

  if (!updated) {
    throw new HTTPException(404, {
      message: "Project not found",
    });
  }

  return updated.lastTaskNumber - count + 1;
}

export function claimTaskNumber(projectId: string, dbOrTx: DbOrTx = db) {
  return claimTaskNumbers(projectId, 1, dbOrTx);
}

export default claimTaskNumbers;
