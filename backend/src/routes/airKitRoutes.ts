import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, userRegistrationSchema } from '../middleware/validation';
import { CredentialModel } from '../models/Credential';
import { ProofModel } from '../models/Proof';
import { pool } from '../config/database';

// --- WARNING: DEVELOPMENT MOCK ---
// The real `airAccount` and `airCredential` imports are removed due to package errors.
// These mock objects bypass all Moca Network verification and are NOT SECURE.
// TODO: Restore original imports once the correct Moca Admin SDK is installed.

const airAccount = {
  verifyUser: async (params: any) => ({
    verified: true,
  }),
  createSession: async (params: any) => {
    return `mock-session-token-for-${params.airId}`;
  },
  invalidateSession: async (token: string) => {
    console.log(`Mock invalidate session for token: ${token}`);
    return { success: true };
  },
  getUserProfile: async (airId: string) => ({
    universalId: airId,
    connectedChains: ['moca', 'ethereum'],
    tier: 'Tier 1',
    verificationStatus: 'Verified',
  }),
  getCrossChainIdentity: async (airId: string) => ({
    universalId: airId,
    connectedChains: [{ chain: 'moca', address: '0x123' }, { chain: 'eth', address: '0x456' }],
    primaryChain: 'moca',
    identityState: 'Active',
  }),
  connectWallet: async (params: any) => ({
    success: true,
  })
};

const airCredential = {
  issue: async (params: any) => ({
    id: `mock-credential-${Date.now()}`,
    ...params
  }),
  verifyZKProof: async (proof: any) => ({
    valid: true,
  }),
  verify: async (credential: any) => ({
    valid: true,
  }),
  generateZKProof: async (params: any) => ({
    proofData: 'mock-proof-data-string',
    publicInputs: params.publicInputs || { mock: 'public-inputs' }
  })
};
// --- END OF DEVELOPMENT MOCK ---


const router = Router();

/**
 * @route POST /api/airkit/login
 * @desc Login with AIR Account and create user session
 * @access Public
 */
router.post('/login', validateRequest(userRegistrationSchema), async (req, res) => {
  try {
    const { airId, walletAddress, email } = req.body;

    console.log('AIR Kit login request:', { airId, walletAddress });

    // Verify the AIR Account with Moca Network
    const userProfile = await airAccount.verifyUser({
      airId,
      walletAddress,
      timestamp: Date.now()
    });

    if (!userProfile || !userProfile.verified) {
      return res.status(401).json({
        success: false,
        error: 'AIR Account verification failed'
      });
    }

    // Get or create user in database
    const client = await pool.connect();
    try {
      const userResult = await client.query(
        `INSERT INTO users (air_id, wallet_address, email) 
         VALUES ($1, $2, $3) 
         ON CONFLICT (air_id) 
         DO UPDATE SET 
           wallet_address = EXCLUDED.wallet_address,
           email = COALESCE(EXCLUDED.email, users.email),
           updated_at = CURRENT_TIMESTAMP 
         RETURNING id, air_id, wallet_address, email, created_at`,
        [airId, walletAddress, email]
      );

      const user = userResult.rows[0];

      // Generate session token
      const sessionToken = await airAccount.createSession({
        airId: user.air_id,
        walletAddress: user.wallet_address,
        expiresIn: '7d'
      });

      // Update user's last login
      await client.query(
        'UPDATE users SET last_login = CURRENT_TIMESTAMP WHERE id = $1',
        [user.id]
      );

      res.json({
        success: true,
        token: sessionToken,
        user: {
          id: user.id,
          airId: user.air_id,
          walletAddress: user.wallet_address,
          email: user.email,
          createdAt: user.created_at
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) { // Added 'any' type to access .message
    console.error('AIR Kit login error:', error);
    res.status(500).json({
      success: false,
      error: 'Login failed',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * @route POST /api/airkit/logout
 * @desc Logout user and invalidate session
 * @access Private
 */
router.post('/logout', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      await airAccount.invalidateSession(token);
    }

    res.json({
      success: true,
      message: 'Logged out successfully'
    });
  } catch (error) {
    console.error('Logout error:', error);
    res.status(500).json({
      success: false,
      error: 'Logout failed'
    });
  }
});

/**
 * @route GET /api/airkit/profile
 * @desc Get user profile and AIR Account information
 * @access Private
 */
router.get('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user; // Use (req as any) to bypass potential strict type issues

    // Get enhanced profile from AIR Account
    const airProfile = await airAccount.getUserProfile(user.airId);

    // Get user stats
    const client = await pool.connect();
    try {
      const credentialsCount = await client.query(
        'SELECT COUNT(*) FROM credentials WHERE user_id = $1 AND is_revoked = false',
        [user.id]
      );

      const proofsCount = await client.query(
        'SELECT COUNT(*) FROM zk_proofs WHERE user_id = $1',
        [user.id]
      );

      const reputationResult = await client.query(
        'SELECT overall_score FROM reputation_scores WHERE user_id = $1',
        [user.id]
      );

      res.json({
        success: true,
        profile: {
          ...user,
          airProfile: {
            universalId: airProfile.universalId,
            connectedChains: airProfile.connectedChains,
            identityTier: airProfile.tier,
            verificationStatus: airProfile.verificationStatus
          },
          stats: {
            credentials: parseInt(credentialsCount.rows[0].count),
            proofs: parseInt(proofsCount.rows[0].count),
            reputation: reputationResult.rows[0]?.overall_score || 0
          }
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Profile fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch profile'
    });
  }
});

/**
 * @route POST /api/airkit/credential/issue
 * @desc Issue a new verifiable credential
 * @access Private
 */
router.post('/credential/issue', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { credentialType, attributes, expiration, onChainHash } = req.body;

    console.log('Issuing credential for user:', user.id, 'Type:', credentialType);

    // Validate credential type
    const validTypes = ['project_completion', 'skill_assessment', 'client_endorsement', 'identity_verification'];
    if (!validTypes.includes(credentialType)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid credential type'
      });
    }

    // Issue credential through AIR Credential service
    const credential = await airCredential.issue({
      type: credentialType,
      subject: user.walletAddress,
      issuer: process.env.ISSUER_DID!,
      attributes,
      expiration: expiration ? new Date(expiration) : undefined,
      privacyLevel: 'zk_proof_only'
    });

    // Store credential in database
    const client = await pool.connect();
    try {
      const credentialRecord = await CredentialModel.create({
        userId: user.id,
        credentialId: credential.id,
        credentialType,
        credentialData: {
          ...attributes,
          issuedBy: process.env.ISSUER_DID,
          issuanceDate: new Date().toISOString()
        },
        expiresAt: expiration ? new Date(expiration) : undefined,
        onChainHash
      });

      // If this is a project completion credential, update reputation
      if (credentialType === 'project_completion') {
        await updateUserReputation(user.id);
      }

      res.json({
        success: true,
        credential: {
          id: credentialRecord.credentialId,
          type: credentialRecord.credentialType,
          attributes: credentialRecord.credentialData,
          issuedAt: credentialRecord.issuedAt,
          expiresAt: credentialRecord.expiresAt,
          onChainHash: credentialRecord.onChainHash
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) { // Added 'any' type
    console.error('Credential issuance error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to issue credential',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * @route POST /api/airkit/credential/verify
 * @desc Verify a credential's validity
 * @access Private
 */
router.post('/credential/verify', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { credential, proof } = req.body;

    let verificationResult;
    
    if (proof) {
      // Verify zero-knowledge proof
      verificationResult = await airCredential.verifyZKProof(proof);
    } else {
      // Verify standard credential
      verificationResult = await airCredential.verify(credential);
    }

    // Additional database check for revocation
    const client = await pool.connect();
    try {
      const dbCheck = await client.query(
        'SELECT is_revoked FROM credentials WHERE credential_id = $1',
        [credential.id]
      );

      const isRevoked = dbCheck.rows.length > 0 ? dbCheck.rows[0].is_revoked : false;

      res.json({
        success: true,
        valid: verificationResult.valid && !isRevoked,
        details: {
          ...verificationResult,
          isRevoked,
          checkedAt: new Date().toISOString()
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Credential verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Verification failed',
      valid: false
    });
  }
});

/**
 * @route POST /api/airkit/zkp/generate
 * @desc Generate a zero-knowledge proof
 * @access Private
 */
router.post('/zkp/generate', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { circuit, privateInputs, publicInputs } = req.body;

    console.log('Generating ZKP for user:', user.id, 'Circuit:', circuit);

    // Validate circuit type
    const validCircuits = ['reputation_scoring_v2', 'skill_verification_v2', 'identity_proof_v2', 'project_history_v2'];
    if (!validCircuits.includes(circuit)) {
      return res.status(400).json({
        success: false,
        error: 'Invalid circuit type'
      });
    }

    // Get user's credentials for proof generation
    const client = await pool.connect();
    try {
      const userCredentials = await CredentialModel.findByUserId(user.id);
      
      // Prepare inputs for ZKP generation
      const zkpInputs = {
        ...privateInputs,
        userCredentials: userCredentials.map(cred => ({
          id: cred.credentialId,
          type: cred.credentialType,
          data: cred.credentialData,
          issuedAt: cred.issuedAt
        }))
      };

      // Generate zero-knowledge proof
      const proof = await airCredential.generateZKProof({
        circuit,
        privateInputs: zkpInputs,
        publicInputs: {
          ...publicInputs,
          subject: user.walletAddress,
          circuitType: circuit,
          generationTimestamp: Date.now()
        }
      });

      // Store proof in database
      const proofRecord = await ProofModel.create({
        userId: user.id,
        proofId: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circuitType: circuit,
        proofData: proof.proofData,
        publicInputs: proof.publicInputs
      });

      // Generate verification URL
      const verificationUrl = `${process.env.APP_URL}/verify/${proofRecord.proofId}`;

      res.json({
        success: true,
        proof: {
          proofId: proofRecord.proofId,
          circuit: proofRecord.circuitType,
          proofData: proofRecord.proofData,
          publicInputs: proofRecord.publicInputs,
          verificationUrl,
          generatedAt: proofRecord.createdAt
        }
      });
    } finally {
      client.release();
    }
  } catch (error: any) { // Added 'any' type
    console.error('ZKP generation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to generate zero-knowledge proof',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * @route POST /api/airkit/zkp/verify
 * @desc Verify a zero-knowledge proof
 * @access Public (can be called by anyone to verify proofs)
 */
router.post('/zkp/verify', async (req, res) => {
  try {
    const { proofId, proofData, publicInputs } = req.body;

    console.log('Verifying ZKP:', proofId);

    let verificationResult;

    if (proofId) {
      // Look up proof in database
      const client = await pool.connect();
      try {
        const proofRecord = await ProofModel.findByProofId(proofId);
        
        if (!proofRecord) {
          return res.status(404).json({
            success: false,
            error: 'Proof not found'
          });
        }

        verificationResult = await airCredential.verifyZKProof({
          proofData: proofRecord.proofData,
          publicInputs: proofRecord.publicInputs
        });
      } finally {
        client.release();
      }
    } else {
      // Verify provided proof data directly
      verificationResult = await airCredential.verifyZKProof({
        proofData,
        publicInputs
      });
    }

    res.json({
      success: true,
      valid: verificationResult.valid,
      details: {
        ...verificationResult,
        verifiedAt: new Date().toISOString()
      }
    });
  } catch (error) {
    console.error('ZKP verification error:', error);
    res.status(500).json({
      success: false,
      error: 'Proof verification failed',
      valid: false
    });
  }
});

/**
 * @route GET /api/airkit/credentials
 * @desc Get user's credentials
 * @access Private
 */
router.get('/credentials', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { type, limit = 50, offset = 0 } = req.query;

    const client = await pool.connect();
    try {
      let query = 'SELECT * FROM credentials WHERE user_id = $1 AND is_revoked = false';
      const params: any[] = [user.id];
      let paramCount = 1;

      if (type) {
        paramCount++;
        query += ` AND credential_type = $${paramCount}`;
        params.push(type);
      }

      query += ` ORDER BY issued_at DESC LIMIT $${paramCount + 1} OFFSET $${paramCount + 2}`;
      params.push(parseInt(limit as string), parseInt(offset as string));

      const result = await client.query(query, params);

      const credentials = result.rows.map(cred => ({
        id: cred.credential_id,
        type: cred.credential_type,
        attributes: cred.credential_data,
        issuedAt: cred.issued_at,
        expiresAt: cred.expires_at,
        onChainHash: cred.on_chain_hash,
        isRevoked: cred.is_revoked
      }));

      // Get total count for pagination
      const countResult = await client.query(
        'SELECT COUNT(*) FROM credentials WHERE user_id = $1 AND is_revoked = false',
        [user.id]
      );

      res.json({
        success: true,
        credentials,
        pagination: {
          total: parseInt(countResult.rows[0].count),
          limit: parseInt(limit as string),
          offset: parseInt(offset as string)
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Credentials fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch credentials'
    });
  }
});

/**
 * @route DELETE /api/airkit/credential/:credentialId
 * @desc Revoke a credential
 * @access Private
 */
router.delete('/credential/:credentialId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { credentialId } = req.params;

    const client = await pool.connect();
    try {
      // Verify user owns the credential
      const credentialCheck = await client.query(
        'SELECT user_id FROM credentials WHERE credential_id = $1',
        [credentialId]
      );

      if (credentialCheck.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'Credential not found'
        });
      }

      if (credentialCheck.rows[0].user_id !== user.id) {
        return res.status(400).json({
          success: false,
          error: 'Not authorized to revoke this credential'
        });
      }

      // Revoke credential in database
      const revokedCredential = await CredentialModel.revoke(credentialId);

      // If credential has on-chain hash, revoke on chain as well
      if (revokedCredential.onChainHash) {
        // This would interact with the smart contract to revoke on-chain
        // await revokeCredentialOnChain(revokedCredential.onChainHash);
      }

      res.json({
        success: true,
        message: 'Credential revoked successfully',
        credential: {
          id: revokedCredential.credentialId,
          revoked: true,
          revokedAt: new Date().toISOString()
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Credential revocation error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to revoke credential'
    });
  }
});

/**
 * @route GET /api/airkit/proofs
 * @desc Get user's generated proofs
 * @access Private
 */
router.get('/proofs', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { circuit, limit = 20, offset = 0 } = req.query;

    const proofs = await ProofModel.findByUserId(user.id);

    // Filter by circuit type if specified
    let filteredProofs = proofs;
    if (circuit) {
      filteredProofs = proofs.filter(proof => proof.circuitType === circuit);
    }

    // Apply pagination
    const paginatedProofs = filteredProofs.slice(
      parseInt(offset as string),
      parseInt(offset as string) + parseInt(limit as string)
    );

    const formattedProofs = paginatedProofs.map(proof => ({
      id: proof.proofId,
      circuit: proof.circuitType,
      publicInputs: proof.publicInputs,
      createdAt: proof.createdAt,
      verificationUrl: `${process.env.APP_URL}/verify/${proof.proofId}`
    }));

    res.json({
      success: true,
      proofs: formattedProofs,
      pagination: {
        total: filteredProofs.length,
        limit: parseInt(limit as string),
        offset: parseInt(offset as string)
      }
    });
  } catch (error) {
    console.error('Proofs fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch proofs'
    });
  }
});

/**
 * @route GET /api/airkit/cross-chain/:airId
 * @desc Get cross-chain identity information
 * @access Private
 */
router.get('/cross-chain/:airId', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const { airId } = req.params;

    // Get cross-chain identity information from AIR Account
    const crossChainIdentity = await airAccount.getCrossChainIdentity(airId);

    res.json({
      success: true,
      crossChainIdentity: {
        universalId: crossChainIdentity.universalId,
        connectedChains: crossChainIdentity.connectedChains,
        primaryChain: crossChainIdentity.primaryChain,
        identityState: crossChainIdentity.identityState
      }
    });
  } catch (error) {
    console.error('Cross-chain identity fetch error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch cross-chain identity'
    });
  }
});

/**
 * @route POST /api/airkit/wallet/connect
 * @desc Connect additional wallet to AIR Account
 * @access Private
 */
router.post('/wallet/connect', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { walletAddress, chain, signature } = req.body;

    // Verify wallet connection through AIR Account
    const connectionResult = await airAccount.connectWallet({
      airId: user.airId,
      walletAddress,
      chain,
      signature,
      timestamp: Date.now()
    });

    if (!connectionResult.success) {
      return res.status(400).json({
        success: false,
        error: 'Wallet connection failed'
      });
    }

    // Update user's wallet information in database
    const client = await pool.connect();
    try {
      // Store additional wallet connection
      await client.query(
        `INSERT INTO user_wallets (user_id, wallet_address, chain, connected_at) 
         VALUES ($1, $2, $3, CURRENT_TIMESTAMP)
         ON CONFLICT (wallet_address) DO NOTHING`,
        [user.id, walletAddress, chain]
      );

      res.json({
        success: true,
        message: 'Wallet connected successfully',
        wallet: {
          address: walletAddress,
          chain,
          connectedAt: new Date().toISOString()
        }
      });
    } finally {
      client.release();
    }
  } catch (error) {
    console.error('Wallet connection error:', error);
    res.status(500).json({
      success: false,
      error: 'Wallet connection failed'
    });
  }
});

// Helper function to update user reputation
async function updateUserReputation(userId: number): Promise<void> {
  const client = await pool.connect();
  try {
    // Calculate new reputation score based on credentials
    const credentials = await CredentialModel.findByUserId(userId);
    
    let totalScore = 0;
    let weightSum = 0;

    for (const cred of credentials) {
      let credentialScore = 0;
      let weight = 1;

      switch (cred.credentialType) {
        case 'project_completion':
          credentialScore = (cred.credentialData.rating || 0) * 20;
          weight = 2; // Project completions have higher weight
          break;
        case 'skill_assessment':
          credentialScore = (cred.credentialData.assessmentScore || 0) * 0.8;
          weight = 1.5;
          break;
        case 'client_endorsement':
          credentialScore = 85;
          weight = 1.2;
          break;
        default:
          credentialScore = 50;
      }

      totalScore += credentialScore * weight;
      weightSum += weight;
    }

    const averageScore = weightSum > 0 ? totalScore / weightSum : 0;

    await client.query(
      `INSERT INTO reputation_scores (user_id, overall_score, last_calculated) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (user_id) 
       DO UPDATE SET overall_score = $2, last_calculated = CURRENT_TIMESTAMP`,
      [userId, Math.round(averageScore)]
    );
  } finally {
    client.release();
  }
}

export { router as airKitRoutes };