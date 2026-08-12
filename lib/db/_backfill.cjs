// Non-destructive, idempotent in-place backfill of the 5 B-vitamin columns from the
// xlsx-derived map. Uses a typed TEMP table (same session) + always 6 bound params/row
// (nulls bound as params, not literal), then UPDATE ... FROM temp with coalesce so a
// column is only overwritten when the source value is non-null. Safe to re-run.
// Placed under lib/db so `require('pg')` resolves via its node_modules.
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

function normalizeFoodName(name) {
  return String(name == null ? "" : name)
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const map = JSON.parse(fs.readFileSync(path.join(__dirname, "../../_udata/_bmap.json"), "utf8"));

(async () => {
  const client = await pool.connect();
  try {
    await client.query("CREATE TEMP TABLE _bf (food_id int primary key, b1 real, b2 real, b3 real, b6 real, b12 real) ON COMMIT PRESERVE ROWS");

    const foodRes = await client.query("SELECT id, name FROM foods");
    const foods = foodRes.rows;
    console.log("loaded foods rows: " + foods.length);

    const BATCH = 2000;
    let matched = 0;
    for (let i = 0; i < foods.length; i += BATCH) {
      const rows = [];
      for (const f of foods.slice(i, i + BATCH)) {
        const v = map[normalizeFoodName(f.name)];
        if (!v) continue;
        matched++;
        rows.push([f.id, v.b1, v.b2, v.b3, v.b6, v.b12]);
      }
      if (rows.length === 0) continue;

      const flat = [];
      const chunks = [];
      let ci = 1;
      for (const r of rows) {
        chunks.push("($" + ci + ", $" + (ci + 1) + ", $" + (ci + 2) + ", $" + (ci + 3) + ", $" + (ci + 4) + ", $" + (ci + 5) + ")");
        flat.push(r[0], r[1], r[2], r[3], r[4], r[5]); // r[5] may be null -> bound as param
        ci += 6;
      }
      await client.query(
        "INSERT INTO _bf (food_id,b1,b2,b3,b6,b12) VALUES " + chunks.join(",") +
        " ON CONFLICT (food_id) DO UPDATE SET b1=EXCLUDED.b1,b2=EXCLUDED.b2,b3=EXCLUDED.b3,b6=EXCLUDED.b6,b12=EXCLUDED.b12",
        flat
      );
    }
    const cnt = await client.query("select count(*) from _bf");
    console.log("matched names: " + matched + ", rows in temp: " + cnt.rows[0].count);

    const upd = await client.query(
      "UPDATE foods f SET " +
      "\"vitamin_b1\"=COALESCE(_bf.b1, f.\"vitamin_b1\"), " +
      "\"vitamin_b2\"=COALESCE(_bf.b2, f.\"vitamin_b2\"), " +
      "\"vitamin_b3\"=COALESCE(_bf.b3, f.\"vitamin_b3\"), " +
      "\"vitamin_b6\"=COALESCE(_bf.b6, f.\"vitamin_b6\"), " +
      "\"vitamin_b12\"=COALESCE(_bf.b12, f.\"vitamin_b12\") " +
      "FROM _bf WHERE f.id=_bf.food_id"
    );
    console.log("rows updated: " + upd.rowCount);

    const counts = await client.query(
      "SELECT " +
      "count(*) FILTER (WHERE \"vitamin_b1\" IS NOT NULL AND \"vitamin_b1\" <> 0) AS b1," +
      "count(*) FILTER (WHERE \"vitamin_b2\" IS NOT NULL AND \"vitamin_b2\" <> 0) AS b2," +
      "count(*) FILTER (WHERE \"vitamin_b3\" IS NOT NULL AND \"vitamin_b3\" <> 0) AS b3," +
      "count(*) FILTER (WHERE \"vitamin_b6\" IS NOT NULL AND \"vitamin_b6\" <> 0) AS b6," +
      "count(*) FILTER (WHERE \"vitamin_b12\" IS NOT NULL AND \"vitamin_b12\" <> 0) AS b12 " +
      "FROM foods"
    );
    console.log("non-zero counts after backfill: " + JSON.stringify(counts.rows[0]));
    await client.query("DROP TABLE IF EXISTS _bf");
  } finally {
    client.release();
    await pool.end();
  }
  console.log("=== backfill done ===");
})().catch(e => { console.error("FATAL", e && e.stack ? e.stack : e); process.exit(1); });
