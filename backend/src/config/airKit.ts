import { AirAccount, AirCredential } from '@mocanetwork/airkit';

export const airKitConfig = {
  account: {
    apiKey: process.env.AIR_ACCOUNT_API_KEY!,
    environment: process.env.NODE_ENV === 'production' ? 'prod' : 'test',
    chainConfig: {
      moca: {
        chainId: parseInt(process.env.MOCA_CHAIN_ID || '12345'),
        rpcUrl: process.env.MOCA_RPC_URL!,
      }
    }
  },
  credential: {
    apiKey: process.env.AIR_CREDENTIAL_API_KEY!,
    issuerDid: process.env.ISSUER_DID!,
    privateKey: process.env.ISSUER_PRIVATE_KEY!,
    zkCircuitBaseUrl: process.env.ZK_CIRCUIT_BASE_URL || 'http://localhost:3002'
  }
};

export const airAccount = new AirAccount(airKitConfig.account);
export const airCredential = new AirCredential(airKitConfig.credential);