import { pool } from '../config/database';

export interface ZKProof {
  id: number;
  userId: number;
  proof_id: string;
  circuitType: string;
  proofData: any;
  publicInputs: any;
  createdAt: Date;
}

export interface CreateProofData {
  userId: number;
  proofId: string;
  circuitType: string;
  proofData: any;
  publicInputs: any;
}

export class ProofModel {
  static async findByUserId(userId: number): Promise<ZKProof[]> {
    const result = await pool.query(
      'SELECT * FROM zk_proofs WHERE user_id = $1 ORDER BY created_at DESC',
      [userId]
    );
    return result.rows;
  }

  static async findByProofId(proofId: string): Promise<ZKProof | null> {
    const result = await pool.query(
      'SELECT * FROM zk_proofs WHERE proof_id = $1',
      [proofId]
    );
    return result.rows[0] || null;
  }

  static async create(proofData: CreateProofData): Promise<ZKProof> {
    const result = await pool.query(
      `INSERT INTO zk_proofs 
       (user_id, proof_id, circuit_type, proof_data, public_inputs) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [
        proofData.userId,
        proofData.proofId,
        proofData.circuitType,
        proofData.proofData,
        proofData.publicInputs
      ]
    );
    return result.rows[0];
  }

  static async getProofStats(userId: number): Promise<any> {
    const result = await pool.query(
      `SELECT circuit_type, COUNT(*) as count, 
              MAX(created_at) as last_used 
       FROM zk_proofs 
       WHERE user_id = $1 
       GROUP BY circuit_type`,
      [userId]
    );
    return result.rows;
  }
}