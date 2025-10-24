const chai = require('chai');
const { assert } = chai;
const circom = require('circom');
const snarkjs = require('snarkjs');

describe('Reputation Scoring Circuit', function() {
  this.timeout(10000);

  let circuit;
  
  before(async function() {
    // Load the compiled circuit
    circuit = await circom.importCircuit('artifacts/circuit.json');
  });

  it('should calculate reputation score correctly', async function() {
    const input = {
      credentials: [5, 4, 3, 5, 4, 0, 0, 0, 0, 0], // Ratings from 10 projects
      weights: [10, 10, 10, 10, 10, 0, 0, 0, 0, 0], // Weights for each project
      minimumScore: 70 // Minimum required score
    };

    // Calculate expected average
    const weightedSum = (5*10) + (4*10) + (3*10) + (5*10) + (4*10);
    const totalWeight = 10 + 10 + 10 + 10 + 10;
    const expectedAverage = weightedSum / totalWeight;
    const expectedMeetsThreshold = expectedAverage >= 70;

    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const output = await circuit.getOutput(witness);
    assert.equal(output.meetsThreshold, expectedMeetsThreshold ? 1 : 0);
  });

  it('should handle all zero credentials', async function() {
    const input = {
      credentials: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      weights: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0],
      minimumScore: 50
    };

    const witness = await circuit.calculateWitness(input);
    await circuit.checkConstraints(witness);

    const output = await circuit.getOutput(witness);
    assert.equal(output.meetsThreshold, 0); // Should not meet threshold
  });

  it('should verify proof generation', async function() {
    const input = {
      credentials: [5, 5, 5, 5, 5, 5, 5, 5, 5, 5],
      weights: [10, 10, 10, 10, 10, 10, 10, 10, 10, 10],
      minimumScore: 80
    };

    // Generate proof
    const { proof, publicSignals } = await snarkjs.groth16.fullProve(
      input,
      'artifacts/circuit.wasm',
      'artifacts/circuit_final.zkey'
    );

    // Verify proof
    const vKey = JSON.parse(fs.readFileSync('artifacts/verification_key.json'));
    const verified = await snarkjs.groth16.verify(vKey, publicSignals, proof);

    assert.isTrue(verified, 'Proof should be valid');
  });
});