import { pool } from '../config/database.ts';

export interface Credential {
  id: number;
  userId: number;
  credentialId: string;
  credentialType: string;
  credentialData: any;
  issuedAt: Date;
  expiresAt?: Date;
  isRevoked: boolean;
  onChainHash?: string;
}

export interface CreateCredentialData {
  userId: number;
  credentialId: string;
  credentialType: string;
  credentialData: any;
  expiresAt?: Date;
  onChainHash?: string;
}

export class CredentialModel {
  static async findByUserId(userId: number): Promise<Credential[]> {
    const result = await pool.query(
      'SELECT * FROM credentials WHERE user_id = $1 AND is_revoked = false ORDER BY issued_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findByCredentialId(credentialId: string): Promise<Credential | null> {
    const result = await pool.query(
      'SELECT * FROM credentials WHERE credential_id = $1',
      [credentialId]
    );
    return result.rows[0] || null;
  }

  static async create(credentialData: CreateCredentialData): Promise<Credential> {
    const result = await pool.query(
      `INSERT INTO credentials 
       (user_id, credential_id, credential_type, credential_data, expires_at, on_chain_hash) 
       VALUES ($1, $2, $3, $4, $5, $6) 
       RETURNING *`,
      [
        credentialData.userId,
        credentialData.credentialId,
        credentialData.credentialType,
        credentialData.credentialData,
        credentialData.expiresAt,
        credentialData.onChainHash
      ]
    );
    return result.rows[0];
  }

  static async revoke(credentialId: string): Promise<Credential> {
    const result = await pool.query(
      'UPDATE credentials SET is_revoked = true WHERE credential_id = $1 RETURNING *',
      [credentialId]
    );
    return result.rows[0];
  }

  static async getActiveCredentialsByType(userId: number, credentialType: string): Promise<Credential[]> {
    const result = await pool.query(
      `SELECT * FROM credentials 
       WHERE user_id = $1 AND credential_type = $2 AND is_revoked = false 
       AND (expires_at IS NULL OR expires_at > CURRENT_TIMESTAMP)`,
      [userId, credentialType]
    );
    return result.rows;
  }
}