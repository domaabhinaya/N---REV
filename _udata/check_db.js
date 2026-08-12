const { drizzle } = require('drizzle-orm/better-sqlite3');
const Database = require('better-sqlite3');
const db = drizzle(new Database('./local.db'));
const result = db.prepare('PRAGMA table_info(foods)').all();
console.log(JSON.stringify(result, null, 2));
