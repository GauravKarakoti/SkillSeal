pragma circom 2.1.0;

include "../../node_modules/circomlib/circuits/comparators.circom";

/*
* This circuit checks if a weighted average score meets a minimum threshold.
* The division is computed outside the circuit and verified inside.
*/
template ReputationScore() {
    // --- Public Inputs ---
    signal input minimumScore;
    
    // --- Private Inputs ---
    signal input credentials[10];
    signal input weights[10];
    signal input averageScore;

    // --- Output ---
    signal output meetsThreshold;
    
    // --- Constraints ---
    
    // 1. Calculate weightedSum and totalWeight
    
    // Use a signal array for the quadratic running sum (size N+1)
    signal weightedSum[11];
    
    // Use a 'var' for the linear sum (totalWeight)
    var totalWeight;
    
    // Initialize both
    weightedSum[0] <== 0;
    totalWeight = 0; 
    
    for (var i = 0; i < 10; i++) {
        // Create a constraint for each step of the quadratic sum
        weightedSum[i+1] <== weightedSum[i] + credentials[i] * weights[i];
        
        // Accumulate the linear var
        totalWeight += weights[i];
    }
    
    // 2. Create the final constraint
    // Use the *last element* of the signal array
    // This constraint is (weightedSum[10] === averageScore * totalWeight)
    // which is (signal === signal * linear_var), a valid quadratic constraint.
    weightedSum[10] === averageScore * totalWeight;
    
    // 3. Compare the verified averageScore with the public minimumScore
    component scoreCheck = GreaterEqThan(32);
    scoreCheck.in[0] <== averageScore;
    scoreCheck.in[1] <== minimumScore;
    
    // 4. Output the result (1 if >=, 0 if <)
    meetsThreshold <== scoreCheck.out;
}

component main { public [ minimumScore ] } = ReputationScore();