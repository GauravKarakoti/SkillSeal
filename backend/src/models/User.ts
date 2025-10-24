import { pool } from '../config/database';

export interface User {
  id: number;
  airId: string;
  walletAddress: string;
  email?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface CreateUserData {
  airId: string;
  walletAddress: string;
  email?: string;
}

export class UserModel {
  static async findByAirId(airId: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE air_id = $1',
      [airId]
    );
    return result.rows[0] || null;
  }

  static async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    return result.rows[0] || null;
  }

  static async create(userData: CreateUserData): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (air_id, wallet_address, email) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userData.airId, userData.walletAddress, userData.email]
    );
    return result.rows[0];
  }

  static async update(userId: number, updates: Partial<CreateUserData>): Promise<User> {
    const setClause = Object.keys(updates)
      .map((key, index) => `${key} = $${index + 2}`)
      .join(', ');

    const values = [userId, ...Object.values(updates)];

    const result = await pool.query(
      `UPDATE users 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      values
    );
    return result.rows[0];
  }

  static async getUserWithCredentials(userId: number): Promise<any> {
    const result = await pool.query(
      `SELECT u.*, 
              json_agg(c.*) as credentials
       FROM users u
       LEFT JOIN credentials c ON u.id = c.user_id
       WHERE u.id = $1
       GROUP BY u.id`,
      [userId]
    );
    return result.rows[0];
  }
}