import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';

import { createWeb3Modal, defaultWagmiConfig } from '@web3modal/wagmi/react';
import { WagmiConfig } from 'wagmi';
import { mainnet, arbitrum } from 'wagmi/chains';
import type { Chain } from 'viem'; // Import Chain type from viem

// 1. Get projectId from WalletConnect Cloud
const projectId = process.env.REACT_APP_WALLET_CONNECT_PROJECT_ID!;
if (!projectId) {
    console.error("REACT_APP_WALLET_CONNECT_PROJECT_ID is not set in your environment variables.");
    // Handle the error appropriately, maybe render an error message or halt execution
}

// 2. Create wagmiConfig
const metadata = {
  name: 'SkillSeal',
  description: 'SkillSeal Example',
  url: 'https://skillseal.com', // origin must match your domain & subdomain
  icons: ['https://avatars.githubusercontent.com/u/37784886'],
};

// Explicitly type 'chains' as a non-empty readonly tuple using the imported Chain type.
const chains: readonly [Chain, ...Chain[]] = [mainnet, arbitrum]; // Add supported chains

// Ensure projectId is defined before calling defaultWagmiConfig
const wagmiConfig = projectId ? defaultWagmiConfig({ chains, projectId, metadata }) : undefined;

// 3. Create modal
if (wagmiConfig && projectId) {
    createWeb3Modal({ wagmiConfig, projectId }); // Pass projectId again as required by createWeb3Modal options
} else {
    console.error("WagmiConfig or Project ID is missing, cannot create Web3Modal.");
    // Handle this case - perhaps render a message indicating WalletConnect is unavailable
}


const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);

root.render(
  <React.StrictMode>
    {/* Wrap App with WagmiConfig only if config exists */}
    {wagmiConfig ? (
      <WagmiConfig config={wagmiConfig}>
        <App />
      </WagmiConfig>
    ) : (
      <div>Error: WalletConnect configuration is missing. Please check environment variables.</div>
    )}
  </React.StrictMode>
);

reportWebVitals();
