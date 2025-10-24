# SkillSeal - Verifiable Professional Identity

## Project Overview
SkillSeal leverages the Moca Network to empower freelancers with a self-sovereign, portable, and privacy-preserving professional identity. We allow users to collect verifiable credentials from clients and prove their qualifications without exposing sensitive personal data.

## Live Demo
- **Demo Video**: 
- **Live Demo Site**: 

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
