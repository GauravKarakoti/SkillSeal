import { pool } from '../config/database';

async function seedDatabase() {
  const client = await pool.connect();
  
  try {
    console.log('Starting database seeding...');

    // Create sample users
    await client.query(`
      INSERT INTO users (air_id, wallet_address, email) VALUES
      ('did:moca:user1', '0x742d35Cc6634C0532925a3b8D5C2b2B8A5C5A5A5', 'freelancer1@example.com'),
      ('did:moca:user2', '0x842d35Cc6634C0532925a3b8D5C2b2B8A5C5A5A6', 'client1@example.com'),
      ('did:moca:user3', '0x942d35Cc6634C0532925a3b8D5C2b2B8A5C5A5A7', 'freelancer2@example.com')
      ON CONFLICT (air_id) DO NOTHING;
    `);

    // Create sample credentials
    const sampleCredentials = [
      {
        user_id: 1,
        credential_id: 'cred_project_react_1',
        credential_type: 'project_completion',
        credential_data: {
          projectName: 'E-commerce Website',
          skills: ['React', 'TypeScript', 'Node.js'],
          rating: 5,
          duration: '3 months',
          client: 'Tech Corp Inc.'
        },
        on_chain_hash: '0x' + Buffer.from('project_react_1').toString('hex')
      },
      {
        user_id: 1,
        credential_id: 'cred_skill_web3_1',
        credential_type: 'skill_assessment',
        credential_data: {
          skill: 'Web3 Development',
          level: 'Advanced',
          assessmentScore: 92,
          assessor: 'Web3 Academy'
        },
        on_chain_hash: '0x' + Buffer.from('skill_web3_1').toString('hex')
      }
    ];

    for (const cred of sampleCredentials) {
      await client.query(
        `INSERT INTO credentials 
         (user_id, credential_id, credential_type, credential_data, on_chain_hash) 
         VALUES ($1, $2, $3, $4, $5)
         ON CONFLICT (credential_id) DO NOTHING`,
        [cred.user_id, cred.credential_id, cred.credential_type, cred.credential_data, cred.on_chain_hash]
      );
    }

    console.log('Database seeded successfully!');
  } catch (error) {
    console.error('Error seeding database:', error);
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

// Run if this script is executed directly
if (require.main === module) {
  seedDatabase().catch(console.error);
}

export { seedDatabase };