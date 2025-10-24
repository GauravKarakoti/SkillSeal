import { pool } from '../config/database';
import { CredentialModel } from '../models/Credential';

export async function calculateUserReputation(userId: number): Promise<number> {
  const client = await pool.connect();
  
  try {
    // Get all user credentials
    const credentials = await CredentialModel.findByUserId(userId);
    
    let totalScore = 0;
    let credentialCount = 0;

    // Calculate score based on credentials
    for (const cred of credentials) {
      let credentialScore = 0;
      
      switch (cred.credentialType) {
        case 'project_completion':
          credentialScore = (cred.credentialData.rating || 0) * 20;
          break;
        case 'skill_assessment':
          credentialScore = (cred.credentialData.assessmentScore || 0) * 0.8;
          break;
        case 'client_endorsement':
          credentialScore = 85; // Base score for endorsements
          break;
        default:
          credentialScore = 50; // Default score for other credentials
      }
      
      totalScore += credentialScore;
      credentialCount++;
    }

    const averageScore = credentialCount > 0 ? totalScore / credentialCount : 0;
    
    // Update reputation score in database
    await client.query(
      `INSERT INTO reputation_scores (user_id, overall_score, last_calculated) 
       VALUES ($1, $2, CURRENT_TIMESTAMP) 
       ON CONFLICT (user_id) 
       DO UPDATE SET overall_score = $2, last_calculated = CURRENT_TIMESTAMP`,
      [userId, Math.round(averageScore)]
    );

    return Math.round(averageScore);
  } finally {
    client.release();
  }
}

export async function updateAllReputationScores(): Promise<void> {
  const client = await pool.connect();
  
  try {
    const result = await client.query('SELECT id FROM users');
    
    for (const row of result.rows) {
      await calculateUserReputation(row.id);
    }
    
    console.log(`Updated reputation scores for ${result.rows.length} users`);
  } finally {
    client.release();
  }
}