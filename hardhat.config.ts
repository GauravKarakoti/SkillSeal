import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from "dotenv";
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.20",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    moca_testnet: {
      url: process.env.MOCA_TESTNET_RPC_URL || "https://testnet-rpc.mocachain.org",
      accounts: process.env.TESTNET_PRIVATE_KEY ? [process.env.TESTNET_PRIVATE_KEY] : []
    }
  }
};

export default config;