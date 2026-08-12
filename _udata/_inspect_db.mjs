// Introspect the live Neon foods table. Never prints the connection URL.
import fs from "fs";
import pg from "pg";

const raw = fs.readFileSync("C:/Users/Abhinaya Doma/OneDrive/Desktop/N-REV-main/.env", "utf8");
let DATABASE_URL = "";
for (const line of raw.split("\n")) {
  const m = line.match(/^DATABASE_URL=(.+)$/);
  if (m) DATABASE_URL = m[1].trim();
}
if (!DATABASE_URL) {
  console.error("DATABASE_URL not found in .env");
  process.exit(2);
}

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });
const c = await pool.connect();

const show = async (label, q, params = []) => {
  try {
    const r = await c.query(q, params);
    console.log(`## ${label}\n${JSON.stringify(r.rows, null, 2)}\n`);
  } catch (e) {
    console.log(`## ${label}\nERROR: ${e && e.message ? e.message : e}\n`);
  }
};

await show("tables matching foods/profiles/meal_logs", "select table_name from information_schema.tables where table_name in ('foods','profiles','meal_logs','labs') order by 1");
const cols = await c.query("select column_name, data_type, is_nullable from information_schema.columns where table_name='foods' order by ordinal_position");
console.log("## foods columns");
console.log(cols.rows.map((r) => `${r.column_name} (${r.data_type}, nullable=${r.is_nullable})`).join("\n"));
console.log("");

await show("count(foods)", "select count(*) from foods");
await show("select * from foods limit 1", "select * from foods limit 1");
await show("select id,name from foods limit 1", "select id, name from foods limit 1");
await show("select source from foods limit 1", "select source from foods limit 1");
await show("select tier from foods limit 1", "select tier from foods limit 1");
await show("select vitamin_b6 from foods limit 1", "select vitamin_b6 from foods limit 1");

c.release();
await pool.end();
