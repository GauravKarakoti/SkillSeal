#!/usr/bin/env node

const { execSync } = require('child_process');
const axios = require('axios');

class IntegrationTester {
  constructor() {
    this.baseUrl = process.env.TEST_BASE_URL || 'http://localhost:3001';
    this.authToken = null;
  }

  async runAllTests() {
    console.log('🚀 Starting SkillSeal Integration Tests\n');
    
    try {
      await this.testAuthentication();
      await this.testCredentialFlow();
      await this.testZKPGeneration();
      await this.testReputationSystem();
      
      console.log('\n✅ All integration tests passed!');
    } catch (error) {
      console.error('\n❌ Integration tests failed:', error.message);
      process.exit(1);
    }
  }

  async testAuthentication() {
    console.log('🔐 Testing Authentication...');
    
    // This would normally use AIR Kit test credentials
    const testPayload = {
      airId: 'test:user:123',
      signature: 'test-signature'
    };

    try {
      const response = await axios.post(`${this.baseUrl}/api/auth/login`, testPayload);
      
      if (response.data.success && response.data.token) {
        this.authToken = response.data.token;
        console.log('✅ Authentication test passed');
      } else {
        throw new Error('Authentication failed');
      }
    } catch (error) {
      throw new Error(`Authentication test failed: ${error.message}`);
    }
  }

  async testCredentialFlow() {
    console.log('📜 Testing Credential Flow...');
    
    const credentialData = {
      credentialType: 'test_credential',
      attributes: {
        testField: 'testValue',
        score: 95
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/credentials/issue`,
        credentialData,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );

      if (!response.data.success) {
        throw new Error('Credential issuance failed');
      }

      // Test credential verification
      const verifyResponse = await axios.post(
        `${this.baseUrl}/api/credentials/verify`,
        { credential: response.data.credential },
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );

      if (!verifyResponse.data.valid) {
        throw new Error('Credential verification failed');
      }

      console.log('✅ Credential flow test passed');
    } catch (error) {
      throw new Error(`Credential flow test failed: ${error.message}`);
    }
  }

  async testZKPGeneration() {
    console.log('🔒 Testing ZKP Generation...');
    
    const proofRequest = {
      circuit: 'test_circuit',
      privateInputs: {
        testInput: 'testValue'
      },
      publicInputs: {
        proofType: 'test_proof'
      }
    };

    try {
      const response = await axios.post(
        `${this.baseUrl}/api/zkp/generate`,
        proofRequest,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );

      if (!response.data.success || !response.data.proof) {
        throw new Error('ZKP generation failed');
      }

      console.log('✅ ZKP generation test passed');
    } catch (error) {
      throw new Error(`ZKP generation test failed: ${error.message}`);
    }
  }

  async testReputationSystem() {
    console.log('📊 Testing Reputation System...');
    
    try {
      const response = await axios.get(
        `${this.baseUrl}/api/reputation/score`,
        { headers: { Authorization: `Bearer ${this.authToken}` } }
      );

      if (typeof response.data.score !== 'number') {
        throw new Error('Invalid reputation score response');
      }

      console.log('✅ Reputation system test passed');
    } catch (error) {
      throw new Error(`Reputation system test failed: ${error.message}`);
    }
  }
}

// Run tests if this script is executed directly
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests();
}

module.exports = IntegrationTester;