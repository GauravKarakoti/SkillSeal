import { AirAccount, AirCredential } from '@mocanetwork/airkit';

export const airAccountConfig = {
  chainConfig: {
    moca: {
      chainId: 12345, // Moca Testnet
      rpcUrl: process.env.REACT_APP_MOCA_RPC_URL!,
    }
  },
  sessionTimeout: 86400,
  biometricAuth: true
};

export const airCredentialConfig = {
  zkCircuitBaseUrl: process.env.REACT_APP_ZK_CIRCUIT_BASE_URL!,
  verificationKey: process.env.REACT_APP_VERIFICATION_KEY!
};

// Initialize AIR Kit instances
export const airAccount = new AirAccount(airAccountConfig);
export const airCredential = new AirCredential(airCredentialConfig);