const LOCAL_FALLBACK_DB_PATH = "./data/kaneo.db";

type DatabaseConfigSource = "DATABASE_URL" | "LOCAL_FALLBACK";

export type ResolvedDatabaseConfig = {
  /** Absolute or relative path to the SQLite database file. */
  connectionString: string;
  source: DatabaseConfigSource;
  host: string;
  port: number;
  database: string;
  username: string;
  logConfig: {
    source: DatabaseConfigSource;
    host: string;
    port: number;
    database: string;
    username: string;
  };
};

function normalizePath(raw: string): string {
  let value = raw.trim();

  if (!value) {
    return LOCAL_FALLBACK_DB_PATH;
  }

  // Accept "sqlite:///path/to.db" / "sqlite:path/to.db" / a bare filesystem path.
  if (value.startsWith("sqlite:")) {
    value = value.slice("sqlite:".length);
    // Strip a leading slash for "sqlite:///..." style URLs.
    value = value.replace(/^\/+/, "");
  }

  try {
    value = decodeURIComponent(value);
  } catch {
    // Leave the path as-is if it isn't valid percent-encoding.
  }

  return value || LOCAL_FALLBACK_DB_PATH;
}

function toResolvedConfig(
  databasePath: string,
  source: DatabaseConfigSource,
): ResolvedDatabaseConfig {
  const logConfig = {
    source,
    host: "local",
    port: 0,
    database: databasePath,
    username: "",
  };

  return {
    connectionString: databasePath,
    ...logConfig,
    logConfig,
  };
}

export function resolveDatabaseConfig(): ResolvedDatabaseConfig {
  if (process.env.DATABASE_URL) {
    return toResolvedConfig(
      normalizePath(process.env.DATABASE_URL),
      "DATABASE_URL",
    );
  }

  return toResolvedConfig(LOCAL_FALLBACK_DB_PATH, "LOCAL_FALLBACK");
}

export function resolveDatabasePath(): string {
  return resolveDatabaseConfig().connectionString;
}

/** Kept for API compatibility with callers that only need the connection target. */
export function resolveDatabaseConnectionString(): string {
  return resolveDatabasePath();
}
