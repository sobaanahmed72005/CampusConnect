require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { pool } = require('../config/database');

async function check() {
  const c = await pool.connect();
  
  // Check users
  const users = await c.query("SELECT id, email, role, LEFT(password, 10) as pw_prefix FROM users");
  console.log('\nUsers:', JSON.stringify(users.rows));
  
  // Check events
  const events = await c.query("SELECT id, title, category, date FROM events LIMIT 3");
  console.log('\nEvents sample:', JSON.stringify(events.rows));
  
  // Check marketplace
  const market = await c.query("SELECT id, title, price, images FROM marketplace_listings LIMIT 3");
  console.log('\nMarketplace sample:', JSON.stringify(market.rows));
  
  // Check lost_found_reports
  const lf = await c.query("SELECT id, title, type FROM lost_found_reports LIMIT 3");
  console.log('\nLost&Found sample:', JSON.stringify(lf.rows));
  
  // Check accommodation
  const acc = await c.query("SELECT id, title, type, price FROM accommodation_listings LIMIT 3");
  console.log('\nAccommodation sample:', JSON.stringify(acc.rows));
  
  c.release();
  pool.end();
}
check().catch(e => { console.error(e.message); pool.end(); });
