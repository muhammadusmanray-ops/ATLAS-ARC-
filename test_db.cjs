const { Pool } = require('pg');

const db = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

async function test() {
  try {
    const r = await db.query('SELECT COUNT(*) FROM ai_transactions_ledger');
    console.log('[NEON DB] ✅ Connected! Rows in ledger:', r.rows[0].count);
    
    const r2 = await db.query('SELECT COUNT(*) FROM market_demand_metrics');
    console.log('[NEON DB] Rows in metrics:', r2.rows[0].count);
    
    const r3 = await db.query('SELECT COUNT(*) FROM agent_activity_logs');
    console.log('[NEON DB] Rows in agent logs:', r3.rows[0].count);
  } catch(e) {
    console.error('[NEON DB] ❌ Error:', e.message);
  } finally {
    await db.end();
  }
}

test();
