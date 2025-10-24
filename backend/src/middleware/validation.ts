import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.errors
        });
      }
      next(error);
    }
  };
};

// Validation schemas
export const credentialIssueSchema = z.object({
  subject: z.string().min(1, 'Subject is required'),
  credentialType: z.string().min(1, 'Credential type is required'),
  attributes: z.record(z.any()),
  expiration: z.string().optional()
});

export const proofGenerationSchema = z.object({
  circuit: z.string().min(1, 'Circuit type is required'),
  privateInputs: z.record(z.any()),
  publicInputs: z.record(z.any()).optional()
});

export const userRegistrationSchema = z.object({
  airId: z.string().min(1, 'AIR ID is required'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  email: z.string().email().optional()
});