const Database = require('better-sqlite3');
const db = new Database('sqlite.db');
try {
  const products = db.prepare('SELECT id, name, price FROM products').all();
  console.log(products);
} catch (e) {
  console.log("Error:", e.message);
}
