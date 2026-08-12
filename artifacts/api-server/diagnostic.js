import pg from "pg";
const { Pool } = pg;

// Safe DATABASE_URL inspection (no password exposure)
const url = process.env.DATABASE_URL || "";
console.log("DATABASE_URL:", url ? "SET" : "NOT SET");

if (url) {
  try {
    const u = new URL(url);
    console.log("protocol:", u.protocol);
    console.log("hostname:", u.hostname);
    console.log("port:", u.port || "default(5432)");
    console.log("database:", u.pathname.slice(1) || "(none)");
    console.log("password:", "PRESENT");
    console.log("sslmode:", u.searchParams.get("sslmode") || "not present");
  } catch (e) {
    console.log("URL parse error:", e.message);
    // Fallback: extract hostname manually
    const match = url.match(/@([^:/]+)/);
    console.log("hostname (fallback):", match ? match[1] : "unknown");
  }
}

// Check for PG* environment variables
console.log("---PG ENV---");
for (const key of Object.keys(process.env)) {
  if (key.startsWith("PG")) {
    const val = key.includes("PASS") ? "PRESENT" : process.env[key];
    console.log(`${key}:`, val);
  }
}

// Test connection with explicit SELECT 1
console.log("---DB TEST---");
if (!process.env.DATABASE_URL) {
  console.log("DATABASE_URL not set — cannot test connection");
} else {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const client = await pool.connect();
  try {
    const result = await client.query("SELECT 1");
    console.log("SELECT 1: PASS", JSON.stringify(result.rows[0]));
  } catch (err) {
    console.log("SELECT 1: FAIL");
    console.log("Error code:", err.code);
    console.log("Error hostname:", err.hostname);
    console.log("Error message:", err.message?.split("\n")[0]);
  } finally {
    client.release();
    await pool.end();
  }
}
