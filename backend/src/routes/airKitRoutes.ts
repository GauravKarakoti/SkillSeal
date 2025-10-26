import { Router } from 'express';
import { authenticateToken, AuthenticatedRequest } from '../middleware/auth';
import { validateRequest, userRegistrationSchema } from '../middleware/validation';
import { CredentialModel } from '../models/Credential';
import { ProofModel } from '../models/Proof';
import { pool } from '../config/database';
import dotenv from 'dotenv';
import * as snarkjs from 'snarkjs';
import fs from 'fs';
import path from 'path';
// --- END OF ADDITIONS ---

// --- Import your real credential service ---
import { credentialService } from '../services/credentialService';

dotenv.config();

// --- WARNING: DEVELOPMENT MOCK ---
// The real `airAccount` import is removed due to package errors.
// This mock object bypasses all Moca Network verification and is NOT SECURE.
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
    connectedChains: [{ chain: 'moca', address: '0x366a8' }, { chain: 'eth', address: '0x456' }],
    primaryChain: 'moca',
    identityState: 'Active',
  }),
  connectWallet: async (params: any) => ({
    success: true,
  })
};

const router = Router();

// --- Define paths to your compiled circuit products ---
// Using your updated path
const circuitsPath = path.join(__dirname, '../artifacts');
const vkeyPath = path.join(circuitsPath, 'verification_key.json');
let vkey: any = null; // Cache for verification key

try {
  vkey = JSON.parse(fs.readFileSync(vkeyPath, 'utf-8'));
  console.log('Verification key loaded successfully.');
} catch (e) {
  console.error('CRITICAL: Could not load verification_key.json. Verification will fail.', e);
}

/**
 * @route POST /api/airkit/login
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

      const email = await client.query(
        'SELECT email FROM users WHERE id = $1',
        [user.id]
      );
      console.log('Fetched email:', email.rows[0]?.email);

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
          email: email.rows[0]?.email,
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

router.put('/profile', authenticateToken, async (req: AuthenticatedRequest, res) => {
  try {
    const user = (req as any).user;
    const { email } = req.body; // Get the new email from the request body

    // 1. Validate the new email (optional, but recommended)
    if (!email) {
      return res.status(400).json({
        success: false,
        error: 'Email is required'
      });
    }

    // 2. Update the user's email in the database
    const client = await pool.connect();
    try {
      const updateResult = await client.query(
        `UPDATE users 
         SET email = $1, updated_at = CURRENT_TIMESTAMP 
         WHERE id = $2 
         RETURNING id, air_id, wallet_address, email, updated_at`,
        [email, user.id]
      );

      if (updateResult.rows.length === 0) {
        return res.status(404).json({
          success: false,
          error: 'User not found'
        });
      }

      // 3. Send back the updated user information
      res.json({
        success: true,
        message: 'Profile updated successfully',
        user: updateResult.rows[0]
      });

    } finally {
      client.release();
    }
  } catch (error: any) {
    console.error('Profile update error:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to update profile',
      details: process.env.NODE_ENV === 'production' ? undefined : error.message
    });
  }
});

/**
 * @route POST /api/airkit/credential/issue
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

    // --- USE REAL SERVICE, NOT MOCK ---
    // Issue credential through AIR Credential service
    const credential = await credentialService.issueCredential({
      type: credentialType,
      subject: user.walletAddress,
      issuer: process.env.ISSUER_DID!,
      attributes,
      expiration: expiration ? new Date(expiration) : undefined,
      privacyLevel: 'zk_proof_only'
    });
    // --- END OF CHANGE ---

    // Store credential in database
    const client = await pool.connect();
    try {
      const credentialRecord = await CredentialModel.create({
        userId: user.id,
        credentialId: credential.id, // Assuming service returns an id
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
    
    if (proof) {
      // ZKProof verification is handled by /zkp/verify
      // This route is for *standard* credential verification.
      return res.status(400).json({ success: false, error: "Use /api/airkit/zkp/verify to verify ZK proofs." });
    }
    
    // --- START: FIX for TypeScript Error ---
    // Your service returns a boolean, so we store it as a boolean.
    const verificationResult: boolean = await credentialService.verifyCredential(credential);

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
        // `verificationResult` is now the boolean, so we use it directly
        valid: verificationResult && !isRevoked,
        details: {
          // We can't spread a boolean, so we remove `...verificationResult`
          isRevoked,
          checkedAt: new Date().toISOString()
        }
      });
      // --- END: FIX for TypeScript Error ---
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

    // --- START: REAL ZK-PROOF GENERATION ---
    const client = await pool.connect();
    try {
      const userCredentials = await CredentialModel.findByUserId(user.id);
      
      let circuitInputs: any;
      let circuitWasmPath: string;
      let circuitZkeyPath: string;

      // --- Logic for the reputation_scoring circuit ---
      if (circuit === 'reputation_scoring_v2') {
        // Your circuit 'reputation_scoring.circom' is 'v1', but frontend calls it 'v2'.
        // We will prepare inputs for 'reputation_scoring.circom'.
        
        // ** FIX: Input Mismatch **
        // Your frontend sends `minimumScore` as PRIVATE.
        // Your circuit `reputation_scoring.circom` expects `minimumScore` as PUBLIC.
        // This logic fixes that by preparing the inputs correctly for the circuit.
        circuitInputs = prepareReputationInputs(userCredentials, privateInputs.minimumScore);

        // --- Use your updated paths ---
        circuitWasmPath = path.join(circuitsPath, 'reputation_scoring.wasm');
        circuitZkeyPath = path.join(circuitsPath, 'reputation_scoring_0001.zkey');

      } else {
        // TODO: Add input preparation logic for your other circuits
        return res.status(400).json({ success: false, error: `Circuit '${circuit}' is not yet implemented.` });
      }

      console.log("Generating proof with inputs:", circuitInputs);
      console.log(`Using WASM: ${circuitWasmPath}`);
      console.log(`Using ZKEY: ${circuitZkeyPath}`);
      
      if (!fs.existsSync(circuitWasmPath) || !fs.existsSync(circuitZkeyPath)) {
        console.error('Missing circuit files. Did you compile?');
        return res.status(500).json({ success: false, error: 'Internal server error: Missing circuit artifacts.'});
      }

      // Generate zero-knowledge proof using snarkjs
      const { proof, publicSignals } = await snarkjs.groth16.fullProve(
          circuitInputs,
          circuitWasmPath,
          circuitZkeyPath
      );

      console.log("Proof generated successfully.");

      // Combine frontend public inputs with circuit-generated public signals
      const finalPublicInputs = {
        ...publicInputs,
        subject: user.walletAddress,
        circuitType: circuit,
        generationTimestamp: Date.now(),
        signals: publicSignals // The public outputs from the circuit
      };

      // Store proof in database
      const proofRecord = await ProofModel.create({
        userId: user.id,
        proofId: `proof_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        circuitType: circuit,
        proofData: JSON.stringify(proof), // Store proof object as a string
        publicInputs: JSON.stringify(finalPublicInputs) // Store all public inputs
      });
      // --- END: REAL ZK-PROOF GENERATION ---

      console.log("Proof record stored with ID:", proofRecord);
      // Generate verification URL
      const verificationUrl = `${process.env.APP_URL}/verify/${proofRecord.proof_id}`;

      res.json({
        success: true,
        proof: {
          proofId: proofRecord.proof_id,
          circuit: proofRecord.circuitType,
          proofData: proof, // Send the object
          publicInputs: finalPublicInputs, // Send the combined object
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
 */
router.post('/zkp/verify', async (req, res) => {
  try {
    const { proofId, proofData, publicInputs } = req.body;

    console.log('Verifying ZKP:', proofId || 'from provided data');
    
    // --- START: REAL ZK-PROOF VERIFICATION ---
    if (!vkey) {
      return res.status(500).json({ success: false, error: 'Verification key not loaded.' });
    }

    let proofToVerify;
    let publicInputsToVerify;

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

        // Parse the JSON strings from the database
        proofToVerify = JSON.parse(proofRecord.proofData);
        publicInputsToVerify = JSON.parse(proofRecord.publicInputs);

      } finally {
        client.release();
      }
    } else {
      // Verify provided proof data directly
      proofToVerify = proofData;
      publicInputsToVerify = publicInputs;
    }

    if (!proofToVerify || !publicInputsToVerify || !publicInputsToVerify.signals) {
      return res.status(400).json({ success: false, error: 'Missing proof data or public inputs/signals' });
    }

    // The 'publicSignals' array is what snarkjs needs to verify
    const isValid = await snarkjs.groth16.verify(
        vkey,
        publicInputsToVerify.signals,
        proofToVerify
    );
    // --- END: REAL ZK-PROOF VERIFICATION ---

    res.json({
      success: true,
      valid: isValid,
      details: {
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

    const formattedProofs = paginatedProofs.map(proof => {
      // Safely parse public inputs
      let publicInputs = {};
      try {
        // The data in the DB is stored as a string
        publicInputs = JSON.parse(proof.publicInputs); 
      } catch (e) { console.error("Could not parse public inputs for proof:", proof.proof_id)}
      console.log("Parsed public inputs for proof:", proof, publicInputs);

      return {
        id: proof.proof_id,
        circuit: proof.circuitType,
        publicInputs: publicInputs, // Send the parsed object
        createdAt: proof.createdAt,
        verificationUrl: `${process.env.APP_URL}/verify/${proof.proof_id}`
      }
    });

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

// (Helper functions prepareReputationInputs and updateUserReputation are unchanged)
function prepareReputationInputs(userCredentials: any[], minimumScore: number) {
  const CIRCUIT_SIZE = 10;
  
  const credentials: bigint[] = [];
  const weights: bigint[] = [];
  
  let weightedSum = 0n;
  let totalWeight = 0n;

  // Filter for relevant credentials (e.g., project_completion with a rating)
  const projectCreds = userCredentials
    .filter(c => c.credentialType === 'project_completion' && c.credentialData?.rating)
    .slice(0, CIRCUIT_SIZE); // Take the first 10

  for (let i = 0; i < CIRCUIT_SIZE; i++) {
    if (i < projectCreds.length) {
      // Your circuit seems to use simple scores. Let's use the rating (e.g., 1-5)
      // and scale it (e.g., 1-100). Assuming rating is 1-5, multiply by 20.
      const score = BigInt(projectCreds[i].credentialData.rating * 20 || 0);
      const weight = 1n; // Using a simple weight of 1 for each

      credentials.push(score);
      weights.push(weight);

      weightedSum += score * weight;
      totalWeight += weight;
    } else {
      // Pad with zeros if user has fewer than 10 credentials
      credentials.push(0n);
      weights.push(0n);
    }
  }

  // Calculate averageScore. Handle division by zero.
  // This is the "division computed outside" part from your circuit's comments.
  const averageScore = totalWeight > 0n ? weightedSum / totalWeight : 0n;

  return {
    // --- Public Inputs ---
    // This is the fix: minimumScore is public, as per your .circom file
    minimumScore: BigInt(minimumScore || 0), 

    // --- Private Inputs ---
    credentials,
    weights,
    averageScore
  };
}

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