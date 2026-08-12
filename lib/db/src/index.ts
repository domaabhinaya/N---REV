import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema";

const { Pool } = pg;

const rawUrl = process.env.DATABASE_URL;

if (!rawUrl) {
  throw new Error(
    "DATABASE_URL must be set. Did you forget to provision a database?",
  );
}

let connectionString: string;
try {
  const parsed = new URL(rawUrl);
  const validProtocol = parsed.protocol.startsWith("postgresql") || parsed.protocol.startsWith("postgres");
  if (!validProtocol) {
    throw new Error(`Invalid DATABASE_URL protocol: ${parsed.protocol}. Expected postgresql:// or postgres://`);
  }
  connectionString = rawUrl;
} catch (err) {
  if (err instanceof TypeError) {
    throw new Error(
      "DATABASE_URL is malformed and cannot be parsed as a URL. It must start with postgresql:// or postgres://",
    );
  }
  throw err;
}

export const pool = new Pool({ connectionString });
export const db = drizzle(pool, { schema });

export * from "./schema";
