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
    // pg-node returns snake_case, let's map to camelCase
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      airId: result.rows[0].air_id,
      walletAddress: result.rows[0].wallet_address,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  static async findByWalletAddress(walletAddress: string): Promise<User | null> {
    const result = await pool.query(
      'SELECT * FROM users WHERE wallet_address = $1',
      [walletAddress]
    );
    // pg-node returns snake_case, let's map to camelCase
    if (!result.rows[0]) return null;
    return {
      ...result.rows[0],
      airId: result.rows[0].air_id,
      walletAddress: result.rows[0].wallet_address,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  static async create(userData: CreateUserData): Promise<User> {
    const result = await pool.query(
      `INSERT INTO users (air_id, wallet_address, email) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [userData.airId, userData.walletAddress, userData.email]
    );
    // Map response to camelCase
    return {
      ...result.rows[0],
      airId: result.rows[0].air_id,
      walletAddress: result.rows[0].wallet_address,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
  }

  // --- UPDATED FUNCTION ---
  // This function now maps camelCase keys from the 'updates' object
  // to the correct snake_case column names in the database.
  static async update(userId: number, updates: Partial<CreateUserData>): Promise<User> {
    // Map JS keys to DB column names
    const columnMap: { [key in keyof CreateUserData]?: string } = {
      airId: 'air_id',
      walletAddress: 'wallet_address',
      email: 'email',
    };

    // Filter out any keys that aren't in the map
    const updateKeys = Object.keys(updates).filter(key => 
      columnMap[key as keyof CreateUserData]
    ) as (keyof CreateUserData)[];

    if (updateKeys.length === 0) {
      throw new Error("No valid fields provided for update.");
    }

    const setClause = updateKeys
      .map((key, index) => 
        // Use the mapped column name
        `${columnMap[key]} = $${index + 2}`
      )
      .join(', ');

    // Get values in the correct order
    const values = [userId, ...updateKeys.map(key => updates[key])];

    const result = await pool.query(
      `UPDATE users 
       SET ${setClause}, updated_at = CURRENT_TIMESTAMP 
       WHERE id = $1 
       RETURNING *`,
      values
    );

    // Map response to camelCase
    return {
      ...result.rows[0],
      airId: result.rows[0].air_id,
      walletAddress: result.rows[0].wallet_address,
      createdAt: result.rows[0].created_at,
      updatedAt: result.rows[0].updated_at,
    };
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
    
    if (!result.rows[0]) return null;

    // Map user fields to camelCase
    const user = result.rows[0];
    return {
      ...user,
      airId: user.air_id,
      walletAddress: user.wallet_address,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
      // You may also need to map fields within the 'credentials' array if they are snake_case
    };
  }
}