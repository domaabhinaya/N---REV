// READ-ONLY audit of live foods table. No writes, no deletes, no truncates.
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
const log = (...a) => console.log(...a);
const q = async (label, sql, params) => {
  log("\n## " + label);
  try {
    const r = await pool.query(sql, params);
    log(JSON.stringify(r.rows, null, 2));
  } catch (e) { log("ERROR: " + (e && e.message ? e.message : e)); }
};

const NUTRIENTS = [
  ["protein","protein"], ["iron","iron"], ["calcium","calcium"], ["vitamin_d","vitamin_d"],
  ["magnesium","magnesium"], ["vitamin_a","vitamin_a"], ["vitamin_c","vitamin_c"],
  ["vitamin_b7","vitamin_b7"], ["vitamin_e","vitamin_e"], ["vitamin_k","vitamin_k"],
  ["vitamin_b12","vitamin_b12"], ["vitamin_b1","vitamin_b1"], ["vitamin_b2","vitamin_b2"],
  ["vitamin_b3","vitamin_b3"], ["vitamin_b6","vitamin_b6"],
];

(async () => {
  log("================ 1. LIVE DATABASE INVENTORY ================");
  await q("total_rows", "select count(*) as total from foods");
  await q("unique_names", "select count(DISTINCT name) as unique_names from foods where name is not null");
  await q("null_name_count", "select count(*) as null_or_empty_name from foods where name is null or name=''");
  await q("duplicate_name_count", "select (count(*) - count(DISTINCT name)) as duplicate_name_rows from foods where name is not null");
  await q("exact_duplicate_full_rows", "select count(*) - count(DISTINCT (name,serving_size,protein,iron,calcium,vitamin_d,magnesium,vitamin_a,vitamin_c,vitamin_b7,vitamin_e,vitamin_k,vitamin_b12,vitamin_b1,vitamin_b2,vitamin_b3,vitamin_b6,diet_tags,meal_tags,cuisine_tags,tier,source)) as exact_dupes from foods");

  log("\n================ 2. DATASET SOURCE ANALYSIS ================");
  await q("tier_distribution_(refined=primary/extended)_(seed ts)",
    "select tier, count(*) from foods group by tier order by tier");
  await q("source_distribution_top", "select source, count(*) as n from foods group by source order by n desc limit 15");
  await q("null_source_count_(would=SEED_FOODS fallback)", "select count(*) as null_source from foods where source is null");

  log("\n================ 3. NUTRIENT COVERAGE (15) ================");
  let select = "count(*) as total,";
  let completeAnd = NUTRIENTS.map(([l,c]) => `"${c}" > 0`).join(" AND ");
  let bCompleteAnd = ["vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6","vitamin_b12"].map(c => `"${c}" > 0`).join(" AND ");
  for (const [l,c] of NUTRIENTS) {
    select += `\n  count(*) FILTER (WHERE "${c}" > 0) AS "${l}_gt0",`;
    select += `\n  count(*) FILTER (WHERE "${c}" IS NOT NULL AND "${c}" = 0) AS "${l}_eq0",`;
    select += `\n  count(*) FILTER (WHERE "${c}" IS NULL) AS "${l}_null",`;
  }
  select += `\n  count(*) FILTER (WHERE ${completeAnd}) AS nutritionally_complete_all15_gt0,`;
  select += `\n  count(*) FILTER (WHERE ${bCompleteAnd}) AS all5_B_gt0`;
  await q("coverage_table", "select " + select + " from foods");

  log("\n--- coverage percentages (gt0 / total) ---");
  const cov = await pool.query("select " +
    NUTRIENTS.map(([l,c]) => `count(*) FILTER (WHERE "${c}" > 0) AS "${l}"`).join(",") +
    ", count(*) FROM foods");
  const tot = cov.rows[0].count || cov.rows[0].total;
  const row = cov.rows[0];
  for (const [l] of NUTRIENTS) {
    const n = Number(row[l]);
    console.log(`  ${l.padEnd(12)} >0=${String(n).padStart(6)}  coverage=${(n/(tot||1)*100).toFixed(2)}%`);
  }
  console.log(`  total rows = ${tot}`);

  log("\n--- foods where a given nutrient is NULL (nullable cols only) ---");
  await q("null_counts", "select " +
    ["magnesium","vitamin_a","vitamin_c","vitamin_b7","vitamin_e","vitamin_k","vitamin_b12","vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6"]
      .map(c => `count(*) FILTER (WHERE "${c}" IS NULL) AS "${c}"`).join(",") +
    " from foods");

  log("\n================ 7. HIGH-VALUE FOODS (for scoring demo) ================");
  for (const [,c] of NUTRIENTS) {
    await q("top8_" + c, `select id, name, tier, "${c}" as val from foods where "${c}" > 0 order by "${c}" desc limit 8`);
  }

  log("\n================ 6. B-vitamin-rich foods actually in DB ================");
  for (const c of ["vitamin_b1","vitamin_b2","vitamin_b3","vitamin_b6","vitamin_b12"]) {
    await q("top10_B_" + c, `select id, name, "${c}" as val from foods where "${c}" > 0 order by "${c}" desc limit 10`);
  }

  log("\n================ 4. SAMPLE FOOD OBJECTS (null vs 0 vs value) ================");
  await q("sample_one_per_diet", "select id, name, tier, source, protein, iron, calcium, vitamin_d, magnesium, vitamin_a, vitamin_c, vitamin_b7, vitamin_e, vitamin_k, vitamin_b12, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, diet_tags, meal_tags, cuisine_tags from foods limit 1");
  await q("any_food_with_null_B", `select id, name, vitamin_b1, vitamin_b2, vitamin_b3, vitamin_b6, vitamin_b12 from foods where vitamin_b1 is null or vitamin_b2 is null or vitamin_b3 is null or vitamin_b6 is null or vitamin_b12 is null limit 5`);

  log("\n================ FOOD-CATEGORY / TAG VARIETY ================");
  await q("distinct_cuisine_tags_sample", "select distinct unnest(cuisine_tags) as tag from foods where array_length(cuisine_tags,1) > 0 limit 40");
  await q("distinct_diet_tags", "select unnest(diet_tags) as tag, count(*) as n from foods where array_length(diet_tags,1)>0 group by tag order by n desc limit 20");

  await pool.end();
  log("\n=== audit done ===");
})().catch(e => { console.error("FATAL", e && e.stack ? e.stack : e); process.exit(1); });
