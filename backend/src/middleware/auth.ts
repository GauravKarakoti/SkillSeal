import { Request, Response, NextFunction } from 'express';
import { airAccount } from '../config/airKit';
import { pool } from '../config/database';

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

    // Verify token with AIR Account service
    const userProfile = await airAccount.verifyToken(token);
    
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