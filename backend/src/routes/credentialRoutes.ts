import { Router } from 'express';
import { credentialService } from '../services/credentialService.ts';
import dotenv from 'dotenv';
dotenv.config();

const router: Router = Router();

// Issue a new credential
router.post('/issue', async (req, res) => {
  try {
    const { subject, attributes, credentialType } = req.body;
    
    const credential = await credentialService.issueCredential({
      subject,
      attributes,
      type: credentialType,
      issuer: process.env.ISSUER_DID!
    });

    res.json({ success: true, credential });
  } catch (error) {
    console.error('Credential issuance error:', error);
    res.status(500).json({ success: false, error: 'Failed to issue credential' });
  }
});

// Verify a credential
router.post('/verify', async (req, res) => {
  try {
    const { credential, proof } = req.body;
    
    const isValid = await credentialService.verifyCredential(credential, proof);
    
    res.json({ success: true, valid: isValid });
  } catch (error) {
    console.error('Credential verification error:', error);
    res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

export { router as credentialRoutes };