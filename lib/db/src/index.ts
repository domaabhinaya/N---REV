import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

type Schema = typeof schema;

const { Pool } = pg;

/**
 * LAZY database bootstrap.
 *
 * The database connection is NOT established (and NOT required) at module
 * import time. On serverless hosts (Vercel/@vercel/node) the api-server's
 * handler entry loads this module, and a missing/misconfigured DATABASE_URL
 * used to throw during import — which crashed the entire function, breaking
 * *every* /api request ("connection broke"). Now the module always loads; the
 * connection is resolved on first use, so a missing DATABASE_URL surfaces as a
 * clear, catchable error at query time instead of taking the service down.
 */

function getConnectionString(): string {
  const rawUrl = process.env.DATABASE_URL;
  if (!rawUrl || !rawUrl.trim()) {
    throw new Error(
      "DATABASE_URL must be set (e.g., a Neon/Postgres connection string) before querying the database.",
    );
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    throw new Error(
      "DATABASE_URL is malformed and cannot be parsed as a URL. It must start with postgresql:// or postgres://",
    );
  }
  if (!parsed.protocol.startsWith("postgresql") && !parsed.protocol.startsWith("postgres")) {
    throw new Error(
      `Invalid DATABASE_URL protocol: ${parsed.protocol}. Expected postgresql:// or postgres://`,
    );
  }

  return rawUrl.trim();
}

let _pool: pg.Pool | null = null;
let _db: ReturnType<typeof drizzle> | null = null;

export function getPool(): pg.Pool {
  if (!_pool) _pool = new Pool({ connectionString: getConnectionString() });
  return _pool;
}

export function getDb(): ReturnType<typeof drizzle> {
  if (!_db) _db = drizzle(getPool(), { schema });
  return _db;
}

/** Proxy so existing `db.select()…` / `pool.query()…` usage keeps working while staying lazy. */
function lazyProxy<T extends object>(get: () => T, fallbackPrototype?: object): T {
  return new Proxy({} as T, {
    get(_target, prop) {
      const value = (get() as unknown as Record<PropertyKey, unknown>)[prop];
      return typeof value === "function" ? (value as (...a: unknown[]) => unknown).bind(get()) : value;
    },
    getPrototypeOf() {
      return fallbackPrototype ?? null;
    },
    has() {
      return true;
    },
    set() {
      return true;
    },
  });
}

const dbProxy = lazyProxy(getDb);
const poolProxy = lazyProxy(getPool, pg.Pool.prototype);

export const db: ReturnType<typeof drizzle> = dbProxy;
export const pool: pg.Pool = poolProxy;

export * from "./schema";
