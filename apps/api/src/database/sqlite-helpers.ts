import { sql, type SQL } from "drizzle-orm";

/**
 * Minimal structural type: any Drizzle SQLite instance exposes `all(sql)`.
 * better-sqlite3 is synchronous, so `all()` returns the rows directly.
 */
export type DbLike = {
  all(query: SQL): unknown;
};

/**
 * SQLite-compatible helpers for the runtime migration scripts that
 * previously queried PostgreSQL's `information_schema`.
 */
export async function tableExists(
  db: DbLike,
  tableName: string,
): Promise<boolean> {
  const rows = await db.all(sql`
    SELECT name FROM sqlite_master
    WHERE type = 'table' AND name = ${tableName}
  `);
  return Array.isArray(rows) && rows.length > 0;
}

export async function columnExists(
  db: DbLike,
  tableName: string,
  columnName: string,
): Promise<boolean> {
  const rows = await db.all(sql`
    SELECT name FROM pragma_table_info(${tableName})
    WHERE name = ${columnName}
  `);
  return Array.isArray(rows) && rows.length > 0;
}

export async function indexExists(db: DbLike, indexName: string): Promise<boolean> {
  const rows = await db.all(sql`
    SELECT name FROM sqlite_master
    WHERE type = 'index' AND name = ${indexName}
  `);
  return Array.isArray(rows) && rows.length > 0;
}
