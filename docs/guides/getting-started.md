# Getting Started with SkillSeal

## Overview
SkillSeal is a decentralized professional identity platform that uses zero-knowledge proofs to verify skills and reputation without exposing personal data.

## Quick Start

### 1. Prerequisites
- Node.js 18+ 
- PostgreSQL database
- Moca Network testnet account
- AIR Kit API keys

### 2. Installation

```bash
# Clone the repository
git clone https://github.com/GauravKarakoti/skillseal.git
cd skillseal

# Install dependencies
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your configuration
```

### 3. Database Setup
```bash
# Start PostgreSQL
docker-compose up -d database

# Run migrations
npm run db:migrate

# Seed sample data
npm run db:seed
```

### 4. Development
```bash
# Start all services
npm run dev

# Or start individually
npm run dev:backend
npm run dev:frontend
npm run dev:circuits
```

### 5. Deployment
```bash
# Build for production
npm run build

# Deploy to staging
npm run deploy:staging

# Deploy to production  
npm run deploy:production
```

## Project Structure
```text
skillseal/
├── frontend/          # React TypeScript frontend
├── backend/           # Node.js Express backend
├── contracts/         # Solidity smart contracts
├── circuits/          # Circom ZKP circuits
├── docs/              # Documentation
└── scripts/           # Deployment and utility scripts
```

## Key Features
### 1. AIR Account Integration
- Universal login with biometric authentication
- Multi-chain wallet support
- Single Sign-On across platforms

### 2. Verifiable Credentials
- Issue tamper-proof credentials
- Privacy-preserving verification
- Cross-chain compatibility

### 3. Zero-Knowledge Proofs
- Prove qualifications without revealing details
- Customizable proof templates
- Efficient proof generation

### 4. Reputation System
- Algorithmic reputation scoring
- Staking-based reputation boosting
- Tier-based access control

## Next Steps
1. Explore the API: Check the [REST API documentation](../api/rest-api.md)
2. Integrate Web3: Read the [Web3 integration guide](../api/web3-integration.md)
3. Understand ZKPs: Learn about [zero-knowledge proofs](./zero-knowledge-proofs.md)
4. Join Community: Join our Discord for support and updates