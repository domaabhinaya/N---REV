process.loadEnvFile && process.loadEnvFile('.env');
const { Pool } = require('pg');
(async () => {
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  const total = await pool.query('select count(*) c from foods');
  const cuis = await pool.query('select cuisine_tags, count(*) c from foods group by cuisine_tags order by c desc limit 30');
  const diet = await pool.query('select diet_tags, count(*) c from foods group by diet_tags order by c desc limit 20');
  const meal = await pool.query('select meal_tags, count(*) c from foods group by meal_tags order by c desc limit 20');
  const tier = await pool.query('select tier, count(*) c from foods group by tier');
  console.log('TOTAL', JSON.stringify(total.rows));
  console.log('CUISINE', JSON.stringify(cuis.rows));
  console.log('DIET', JSON.stringify(diet.rows));
  console.log('MEAL', JSON.stringify(meal.rows));
  console.log('TIER', JSON.stringify(tier.rows));
  await pool.end();
})().catch(e => { console.error(e); process.exit(1); });
