export const CREDENTIAL_TYPES = {
  PROJECT_COMPLETION: 'project_completion',
  SKILL_ASSESSMENT: 'skill_assessment',
  CLIENT_ENDORSEMENT: 'client_endorsement',
  IDENTITY_VERIFICATION: 'identity_verification'
} as const;

export const ZK_CIRCUITS = {
  REPUTATION_SCORING: 'reputation_scoring',
  SKILL_VERIFICATION: 'skill_verification',
  IDENTITY_PROOF: 'identity_proof'
} as const;

export const REPUTATION_TIERS = {
  BASIC: { minScore: 0, stakeRequired: 0 },
  VERIFIED: { minScore: 70, stakeRequired: 100 },
  PREMIUM: { minScore: 85, stakeRequired: 500 }
} as const;

export const ERROR_MESSAGES = {
  INVALID_CREDENTIAL: 'Invalid credential provided',
  PROOF_GENERATION_FAILED: 'Failed to generate zero-knowledge proof',
  USER_NOT_FOUND: 'User not found',
  UNAUTHORIZED: 'Unauthorized access'
} as const;