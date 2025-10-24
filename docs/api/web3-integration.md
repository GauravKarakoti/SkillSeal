# Web3 Integration Guide

## Smart Contract Addresses

### Moca Testnet
```javascript
const CONTRACT_ADDRESSES = {
  SkillCredentialFactory: "0x1234567890abcdef...",
  ReputationStaking: "0x234567890abcdef1...",
  ZKPVerifier: "0x34567890abcdef12..."
};
```

## Contract ABIs
### SkillCredentialFactory ABI
```solidity
// Minimal ABI for frontend integration
[
  "function issueCredential(address,string,bytes32) returns (uint256)",
  "function verifyCredential(uint256) view returns (bool)",
  "function revokeCredential(uint256)",
  "event CredentialIssued(uint256 indexed, address indexed, string)"
]
```

### Web3 Integration Example
```javascript
import { ethers } from 'ethers';
import SkillCredentialFactory from './abis/SkillCredentialFactory.json';

class Web3Service {
  constructor() {
    this.provider = new ethers.providers.Web3Provider(window.ethereum);
    this.signer = this.provider.getSigner();
    
    this.credentialFactory = new ethers.Contract(
      CONTRACT_ADDRESSES.SkillCredentialFactory,
      SkillCredentialFactory.abi,
      this.signer
    );
  }

  async issueCredentialOnChain(subject, credentialType, credentialHash) {
    const tx = await this.credentialFactory.issueCredential(
      subject,
      credentialType,
      credentialHash
    );
    
    const receipt = await tx.wait();
    return receipt;
  }

  async listenForCredentialEvents(callback) {
    this.credentialFactory.on('CredentialIssued', (credentialId, subject, credentialType) => {
      callback({ credentialId, subject, credentialType });
    });
  }
}
```

### AIR Kit Web3 Integration
```javascript
import { AirAccount } from '@moca-network/air-kit-sdk';

const airAccount = new AirAccount({
  chainConfig: {
    moca: {
      chainId: 12345,
      rpcUrl: 'https://testnet-rpc.moca.network'
    }
  }
});

// Connect wallet
await airAccount.connectWallet();

// Get user's universal profile
const profile = await airAccount.getUniversalProfile();
```

### Cross-Chain Credential Verification
```javascript
// Verify credential across chains
async function verifyCrossChain(credentialHash, sourceChain, targetChain) {
  const mocaOracle = await airAccount.getIdentityOracle();
  
  const verification = await mocaOracle.verifyCredentialCrossChain(
    credentialHash,
    sourceChain,
    targetChain
  );
  
  return verification;
}
```