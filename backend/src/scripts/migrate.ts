import { pool } from '../config/database.ts';
import { fileURLToPath } from 'url';

async function runMigrations() {
  const client = await pool.connect();
  
  try {
    console.log('Running database migrations...');

    // Migration 1: Add reputation scores table
    await client.query(`
      CREATE TABLE IF NOT EXISTS reputation_scores (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
        overall_score INTEGER DEFAULT 0,
        skill_diversity INTEGER DEFAULT 0,
        completion_rate INTEGER DEFAULT 0,
        client_satisfaction INTEGER DEFAULT 0,
        last_calculated TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // Migration 2: Add staking information
    await client.query(`
      CREATE TABLE IF NOT EXISTS staking_info (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) UNIQUE NOT NULL,
        staked_amount DECIMAL(20, 8) DEFAULT 0,
        staking_tier VARCHAR(50) DEFAULT 'BASIC',
        staked_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        unstake_available_at TIMESTAMP
      );
    `);

    // Migration 3: Add indexes for performance
    await client.query(`
      CREATE INDEX IF NOT EXISTS idx_reputation_scores_user_id ON reputation_scores(user_id);
      CREATE INDEX IF NOT EXISTS idx_reputation_scores_score ON reputation_scores(overall_score);
      CREATE INDEX IF NOT EXISTS idx_staking_info_tier ON staking_info(staking_tier);
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS user_wallets (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) NOT NULL,
        wallet_address VARCHAR(255) UNIQUE NOT NULL,
        chain VARCHAR(50) NOT NULL,
        connected_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        is_primary BOOLEAN DEFAULT FALSE
      );

      CREATE INDEX IF NOT EXISTS idx_user_wallets_user_id ON user_wallets(user_id);
      CREATE INDEX IF NOT EXISTS idx_user_wallets_address ON user_wallets(wallet_address);
    `);

    console.log('Migrations completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
    throw error;
  } finally {
    client.release();
  }
}

const currentModulePath = fileURLToPath(import.meta.url);
const executedScriptPath = process.argv[1];

if (currentModulePath === executedScriptPath) {
  runMigrations().catch(err => {
    console.error('Migration execution failed:', err);
    process.exit(1); // Exit with an error code
  });
}
export { runMigrations };