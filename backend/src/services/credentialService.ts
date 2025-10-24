import { AirCredential } from '@mocanetwork/airkit';

export class CredentialService {
  private airCredential: AirCredential;

  constructor() {
    this.airCredential = new AirCredential({
      issuerPrivateKey: process.env.ISSUER_PRIVATE_KEY!,
      zkCircuitBaseUrl: process.env.ZK_CIRCUIT_BASE_URL!
    });
  }

  async issueCredential(credentialData: any) {
    return await this.airCredential.issue({
      type: credentialData.type,
      subject: credentialData.subject,
      issuer: credentialData.issuer,
      attributes: credentialData.attributes,
      expiration: credentialData.expiration,
      privacyLevel: 'zk_proof_only'
    });
  }

  async verifyCredential(credential: any, proof?: any) {
    if (proof) {
      return await this.airCredential.verifyZKProof(proof);
    }
    
    return await this.airCredential.verify(credential);
  }

  async generateReputationProof(credentials: any[], requirements: any) {
    const proof = await this.airCredential.generateZKProof({
      circuit: 'reputation_scoring_v2',
      privateInputs: {
        credentials,
        minimumScore: requirements.minScore || 70,
        requiredSkills: requirements.skills || []
      },
      publicInputs: {
        proofType: 'reputation_verification',
        minimumRequirementsMet: true
      }
    });

    return proof;
  }
}

export const credentialService = new CredentialService();