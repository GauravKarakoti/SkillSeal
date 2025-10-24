const circom = require('circom');
const snarkjs = require('snarkjs');
const fs = require('fs');

async function compileCircuit() {
  console.log('Compiling reputation scoring circuit...');
  
  // Compile the circuit
  const circuit = await circom.compile('circom/reputation_scoring.circom');
  
  // Save the circuit
  fs.writeFileSync('artifacts/circuit.json', JSON.stringify(circuit));
  
  // Setup trusted ceremony
  console.log('Setting up trusted ceremony...');
  const zkey = await snarkjs.zKey.newZKey(
    circuit,
    'artifacts/pot12_final.ptau',
    'artifacts/circuit_final.zkey'
  );
  
  // Export verification key
  const vKey = await snarkjs.zKey.exportVerificationKey(zkey);
  fs.writeFileSync('artifacts/verification_key.json', JSON.stringify(vKey));
  
  console.log('Circuit compilation completed!');
}

compileCircuit().catch(console.error);