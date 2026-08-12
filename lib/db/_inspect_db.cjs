// Introspection: live Neon foods table vs. expected schema. Never prints the URL.
const fs = require("fs");
const path = require("path");
const pg = require("pg");

const raw = fs.readFileSync(path.join(__dirname, "../../.env"), "utf8");
let DATABASE_URL = "";
for (const line of raw.split("\n")) {
  const m = line.match(/^\s*DATABASE_URL\s*=\s*(.+?)\s*$/);
  if (m) DATABASE_URL = m[1];
}
if (!DATABASE_URL) { console.error("DATABASE_URL not found in ../../.env"); process.exit(2); }

const { Pool } = pg;
const pool = new Pool({ connectionString: DATABASE_URL, ssl: { rejectUnauthorized: false } });

const log = (...a) => console.log(...a);
const show = async (label, q, params = []) => {
  try {
    const res = await pool.query(q, params);
    const rows = res.rowCount != null ? res.rows : undefined;
    log(`## ${label}  [${res.rowCount == null ? "n/a" : res.rowCount} rows]`);
    if (rows && rows.length) log(JSON.stringify(rows.length > 1 ? rows : rows[0], null, 2));
  } catch (e) {
    log(`## ${label}\nERROR: ${e && e.message ? e.message : e}`);
  }
};

(async () => {
  log("=== live foods table introspection ===");
  const cols = await pool.query("select column_name, data_type, is_nullable, column_default from information_schema.columns where table_name='foods' order by ordinal_position");
  log("## foods columns (" + cols.rowCount + ")");
  log(cols.rows.map(r => `${r.column_name} ${r.data_type}${r.is_nullable === "NO" ? " NOTNULL" : ""}${r.column_default ? " DEFAULT=" + r.column_default : ""}`).join("\n"));

  const exp = ["id","name","serving_size","protein","iron","calcium","vitamin_d","magnesium","vitamin_a","vitamin_c","vitamin_b7","vitamin_e","vitamin_k","vitamin_b12","vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6","diet_tags","meal_tags","cuisine_tags","tier","source"];
  const have = new Set(cols.rows.map(r => r.column_name));
  log("\n## MISSING columns (expected but absent): " + exp.filter(c => !have.has(c)).join(", ") || "(none)");
  log("## EXTRA columns (present but not expected): " + cols.rows.map(r => r.column_name).filter(c => !exp.includes(c)).join(", ") || "(none)");

  await show("count", "select count(*) from foods");
  await show("select id limit 1", "select id from foods limit 1");
  await show("select source limit 1", "select source from foods limit 1");
  await show("select tier limit 1", "select tier from foods limit 1");
  await show("select vitamin_b6 limit 1", "select \"vitamin_b6\" from foods limit 1");
  await show("select diet_tags limit 1", "select \"diet_tags\" from foods limit 1");
  await show("select * limit 1", "select * from foods limit 1");

  log("\n## select * sample (id,name,tier,source)");
  await show("sample5", "select id, name, tier, source from foods limit 5");

  await pool.end();
  log("\n=== done ===");
})().catch(e => { console.error(e); process.exit(1); });
