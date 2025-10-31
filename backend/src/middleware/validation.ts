import express from 'express';
import { z } from 'zod';

export const validateRequest = (schema: z.ZodSchema) => {
  return (req: express.Request, res: express.Response, next: express.NextFunction) => {
    try {
      schema.parse(req.body);
      next();
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          error: 'Validation failed',
          details: error.issues
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
  // FIX: z.record() needs both a key type (z.string()) and a value type (z.any())
  attributes: z.record(z.string(), z.any()),
  expiration: z.string().optional()
});

export const proofGenerationSchema = z.object({
  circuit: z.string().min(1, 'Circuit type is required'),
  // FIX: z.record() needs both a key type (z.string()) and a value type (z.any())
  privateInputs: z.record(z.string(), z.any()),
  publicInputs: z.record(z.string(), z.any()).optional() // Also fixed here
});

export const userRegistrationSchema = z.object({
  airId: z.string().min(1, 'AIR ID is required'),
  walletAddress: z.string().min(1, 'Wallet address is required'),
  email: z.string().email().optional()
});