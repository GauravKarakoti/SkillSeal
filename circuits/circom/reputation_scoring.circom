pragma circom 2.1.0;

include "node_modules/circomlib/circuits/comparators.circom";

template ReputationScore() {
    signal input credentials[10];
    signal input weights[10];
    signal input minimumScore;
    signal output meetsThreshold;
    
    // Calculate weighted score
    signal weightedSum;
    signal totalWeight;
    
    weightedSum <== 0;
    totalWeight <== 0;
    
    for (var i = 0; i < 10; i++) {
        weightedSum += credentials[i] * weights[i];
        totalWeight += weights[i];
    }
    
    signal averageScore;
    averageScore <== weightedSum / totalWeight;
    
    // Compare with minimum threshold
    component scoreCheck = GreaterEqThan(32);
    scoreCheck.in[0] <== averageScore;
    scoreCheck.in[1] <== minimumScore;
    
    meetsThreshold <== scoreCheck.out;
}

template GreaterEqThan(bits) {
    signal input in[2];
    signal output out;
    
    component lt = LessThan(bits);
    lt.in[0] <== in[0];
    lt.in[1] <== in[1];
    
    out <== 1 - lt.out;
}

template LessThan(bits) {
    signal input in[2];
    signal output out;
    
    signal diff;
    diff <== in[0] - in[1];
    
    // Check if diff is negative (in[0] < in[1])
    component rangeCheck = Num2Bits(bits+1);
    rangeCheck.in <== diff + (1 << bits);
    
    out <== rangeCheck.out[bits];
}

component main = ReputationScore();