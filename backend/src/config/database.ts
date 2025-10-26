import { Pool } from 'pg';
import { runMigrations } from '../scripts/migrate';
import dotenv from 'dotenv';
dotenv.config();

export const databaseConfig = {
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT!),
  database: process.env.DB_NAME,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 10000,
  ssl: {
    rejectUnauthorized: false
  }
};

export const pool = new Pool(databaseConfig);

export const initializeDatabase = async () => {
  const client = await pool.connect();
  try {
    // Create tables if they don't exist
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        air_id VARCHAR(255) UNIQUE NOT NULL,
        wallet_address VARCHAR(255) UNIQUE,
        email VARCHAR(255),
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE TABLE IF NOT EXISTS credentials (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        credential_id VARCHAR(255) UNIQUE NOT NULL,
        credential_type VARCHAR(100) NOT NULL,
        credential_data JSONB NOT NULL,
        issued_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        expires_at TIMESTAMP,
        is_revoked BOOLEAN DEFAULT FALSE,
        on_chain_hash VARCHAR(255)
      );

      CREATE TABLE IF NOT EXISTS zk_proofs (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id),
        proof_id VARCHAR(255) UNIQUE NOT NULL,
        circuit_type VARCHAR(100) NOT NULL,
        proof_data JSONB NOT NULL,
        public_inputs JSONB NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );

      CREATE INDEX IF NOT EXISTS idx_users_air_id ON users(air_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_user_id ON credentials(user_id);
      CREATE INDEX IF NOT EXISTS idx_credentials_type ON credentials(credential_type);
    `);
    
    console.log('Database initialized successfully');
  } finally {
    client.release();
  }
};

initializeDatabase().catch(err => {
  console.error('Failed to initialize database:', err);
});

runMigrations().catch(err => {
  console.error('Failed to run migrations:', err);
});