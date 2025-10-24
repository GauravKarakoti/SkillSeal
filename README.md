# SkillSeal - Verifiable Professional Identity

## Project Overview
SkillSeal leverages the Moca Network to empower freelancers with a self-sovereign, portable, and privacy-preserving professional identity. We allow users to collect verifiable credentials from clients and prove their qualifications without exposing sensitive personal data.

## Live Demo
- **Demo Video**: 
- **Live Demo Site**: 
- **Contract**: `0x4Ba3C92D96Cc2C377a5ffca32e0BC43CF67a83b3`
- **SnarkJS**: `["0x0e452a4166585b8a81e2a0149fcf7b45adcfaab7c5e3b35753191f72055ba541", "0x123795ffbd6b89eec36ed0fa0f8e906a8864d72d21b05713556bac25e53ea739"],[["0x1925e773c80b275038030072d57be4c428d4f132aff9e6b06aff03d95c23b352", "0x0beef0edd26e59f408c2732ded9330fabdf33019249b6275085eb60991e17dc3"],["0x0d96ac40b70251fe630bfe3b25fb93d5b64e0827d9334d6aebb78eefef0f60ef", "0x11124a71212de25b98abaa5f4d1fbbc57a2d9301da40be75d4a2f2d43445958a"]],["0x1a6c2e8095532eb57bf41d904e61fbb6e731171b689b7f37e4d8229e9150d38e", "0x07cd3fe973c0d0e6fdbbc7a1829d6ee8a6bd168fc02ef461d0d6b1f2a60d8433"],["0x0000000000000000000000000000000000000000000000000000000000000001","0x0000000000000000000000000000000000000000000000000000000000000032"]`

## Team
- [Gaurav Karakoti]
- **Contact**: [[GauravKara_Koti](https://x.com/GauravKara_Koti)/[GauravKarakoti](https://t.me/GauravKarakoti)]

## Features
- **AIR Account Single Sign-On**: Users log in seamlessly using Moca's AIR Account.
- **Issue Verifiable Credentials**: Clients can issue tamper-proof credentials for completed work.
- **Zero-Knowledge Proofs**: Freelancers generate ZKPs to validate skill claims privately.
- **Cross-Chain Verification**: Credentials are verifiable across any chain integrated with Moca's Identity Oracle.

## Technologies & Moca Stack Integration
This project is built on top of the **Moca Stack**:
- **`AIR Kit SDK`**: The core of our identity infrastructure.
- **`AIR Account Services`**: Used for user authentication and wallet management.
- **`AIR Credential Services`**: Used to issue and verify project completion credentials.

Additional Technologies:
- Frontend: React
- Backend: Node.js
- Blockchain: Moca Chain (for credential anchoring and verification)

## Setup Instructions

### Prerequisites
- Node.js (v18 or higher)
- A Moca Network developer account

### Installation
1.  Clone the repository:
    ```bash
    git clone https://github.com/GauravKarakoti/skillseal.git
    cd skillseal
    ```
2.  Install dependencies:
    ```bash
    npm install
    ```
3.  Set up environment variables:
    Create a `.env` file and add your Moca Network API keys:
    ```
    MOCA_AIR_KIT_API_KEY=your_api_key_here
    ```
4.  Run the development server:
    ```bash
    npm run dev
    ```
5.  Open [http://localhost:3000](http://localhost:3000) to view the application.

## Project Milestones & Updates
- **Milestone 1 (Initial Submission)**: Core functionality implemented - users can log in with AIR Account and receive a basic credential.
- **Milestone 2 (Final Submission)**: Full ZKP flow implemented for skill verification, along with a polished UI and live demo.
