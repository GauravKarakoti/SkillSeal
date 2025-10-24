const snarkjs = require('snarkjs');
const fs = require('fs');

async function setupCeremony() {
  console.log('Setting up trusted ceremony...');
  
  // Define file paths
  const r1csFilePath = 'artifacts/reputation_scoring.r1cs';
  const ptauFilePath = 'artifacts/pot12_final.ptau';
  const zkeyOutputPath = 'artifacts/reputation_scoring_0001.zkey';
  const vkeyOutputPath = 'artifacts/verification_key.json';

  // 1. Generate the zkey
  // Note: snarkjs.zKey.newZKey doesn't return the zkey, it writes it to a file.
  // We pass 'console' as the 4th argument for verbose logging.
  await snarkjs.zKey.newZKey(
    r1csFilePath,
    ptauFilePath,
    zkeyOutputPath,
    console 
  );

  console.log(`ZKey successfully generated at: ${zkeyOutputPath}`);

  // 2. Export the verification key
  // This command reads the zkey file and exports the verification key part.
  const vKey = await snarkjs.zKey.exportVerificationKey(zkeyOutputPath, console);
  fs.writeFileSync(vkeyOutputPath, JSON.stringify(vKey, null, 2)); // Added 'null, 2' for nice formatting

  console.log(`Verification key exported to: ${vkeyOutputPath}`);
  console.log('Trusted setup completed!');
}

setupCeremony().catch(console.error);