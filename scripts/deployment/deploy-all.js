const { execSync } = require('child_process');

async function deployAll() {
  console.log('Starting SkillSeal deployment...');
  
  // Step 1: Compile circuits
  console.log('1. Compiling ZKP circuits...');
  execSync('cd circuits && npm run compile', { stdio: 'inherit' });
  
  // Step 2: Deploy contracts
  console.log('2. Deploying smart contracts...');
  execSync('cd contracts && npx hardhat run scripts/deploy.ts --network moca_testnet', { stdio: 'inherit' });
  
  // Step 3: Build backend
  console.log('3. Building backend...');
  execSync('cd backend && npm run build', { stdio: 'inherit' });
  
  // Step 4: Build frontend
  console.log('4. Building frontend...');
  execSync('cd frontend && npm run build', { stdio: 'inherit' });
  
  console.log('Deployment completed!');
}

deployAll().catch(console.error);