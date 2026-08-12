// Additive migration: align live Neon foods table with canonical foods.ts schema.
const fs = require("fs");
const path = require("path");
const pg = require("pg");

const raw = fs.readFileSync(path.join(__dirname, "../../.env"), "utf8");
let DATABASE_URL = "";
for (const line of raw.split("\n")) {
  const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
  if (m) DATABASE_URL = m[1];
}
if (!DATABASE_URL) { console.error("DATABASE_URL not found"); process.exit(2); }

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const COLS = ["vitamin_b1", "vitamin_b2", "vitamin_b3", "vitamin_b6", "vitamin_b12"];

(async () => {
  const out = [];
  for (const c of COLS) {
    const q = `ALTER TABLE foods ADD COLUMN IF NOT EXISTS "${c}" real DEFAULT 0`;
    try { await pool.query(q); out.push(`OK   ${c} added (real DEFAULT 0)`); }
    catch (e) { out.push(`ERR  ${c}: ${e && e.message ? e.message : e}`); }
  }
  const verify = await pool.query(
    `select column_name, is_nullable, column_default from information_schema.columns where table_name='foods' and column_name = any($1) order by 1`,
    [COLS]
  );
  out.push("verify present: " + verify.rows.map(r => `${r.column_name}(nullable=${r.is_nullable},default=${r.column_default})`).join(" | ") || "(none)");
  const count = await pool.query("select count(*) from foods where \"vitamin_b6\" is not null");
  out.push(`rows with non-null vitamin_b6: ${count.rows[0].count}`);
  console.log(out.join("\n"));
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
