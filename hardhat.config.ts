import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";
import * as dotenv from "dotenv";

dotenv.config();

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0000000000000000000000000000000000000000000000000000000000000000";

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
    // Base Sepolia (testnet)
    "base-sepolia": {
      url: 'https://sepolia.base.org',
      accounts: [PRIVATE_KEY],
      gasPrice: 1000000000,
    },
    // Base Mainnet
    base: {
      url: 'https://mainnet.base.org',
      accounts: [PRIVATE_KEY],
      gasPrice: 1000000000,
    }
  }
};

export default config; 