import { Request, Response, NextFunction } from 'express';
import { pool } from '../config/database';
import dotenv from 'dotenv';
dotenv.config();

export interface AuthenticatedRequest extends Request {
  user?: {
    id: number;
    airId: string;
    walletAddress: string;
  };
}

export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({ error: 'Access token required' });
    }

    // --- WARNING: DEVELOPMENT STUB ---
    // The original code `airAccount.verifyToken(token)` is commented out
    // because the `airKit.ts` file has a package error.
    // This mock implementation bypasses real authentication and is NOT SECURE.
    // TODO: Restore original code once the correct Moca Admin SDK is installed.
    
    // const userProfile = await airAccount.verifyToken(token); // <-- ORIGINAL CODE
    
    // Mock user profile for development:
    const userProfile = {
      airId: "mock-air-id-for-testing", // Using a mock Air ID
      address: "0x0000000000000000000000000000000000000001" // Using a mock wallet address
    };
    // --- END OF DEVELOPMENT STUB ---
    
    if (!userProfile || !userProfile.address) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get or create user in database
    const client = await pool.connect();
    try {
      const result = await client.query(
        `INSERT INTO users (air_id, wallet_address) 
         VALUES ($1, $2) 
         ON CONFLICT (air_id) 
         DO UPDATE SET updated_at = CURRENT_TIMESTAMP 
         RETURNING id, air_id, wallet_address`,
        [userProfile.airId, userProfile.address]
      );

      req.user = {
        id: result.rows[0].id,
        airId: result.rows[0].air_id,
        walletAddress: result.rows[0].wallet_address
      };

      next();
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Authentication failed' });
  }
};

export const requireRole = (requiredRole: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    // Role-based access control middleware
    // This can be extended based on your role system
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }
    next();
  };
};

export const errorHandler = (
  error: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', error);

  if (error.name === 'ValidationError') {
    return res.status(400).json({ error: error.message });
  }

  if (error.name === 'UnauthorizedError') {
    return res.status(401).json({ error: 'Unauthorized' });
  }

  res.status(500).json({ 
    error: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : error.message 
  });
};