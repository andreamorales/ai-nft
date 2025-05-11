'use client';

import { WagmiProvider, createConfig, http } from 'wagmi';
import { baseSepolia, base } from 'wagmi/chains';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { useState, useEffect } from 'react';
import { injected, coinbaseWallet } from 'wagmi/connectors';

// Your Web3Modal Project ID
const projectId = '63bc98f7-06ff-45a7-b661-5f5e9c111801';

const metadata = {
  name: 'AI NFT Platform',
  description: 'AI NFT Platform for minting unique NFTs',
  url: 'https://your-url.com',
  icons: ['https://avatars.githubusercontent.com/u/37784886']
};

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const [mounted, setMounted] = useState(false);
  
  const [config] = useState(() => 
    createConfig({
      chains: [base, baseSepolia],
      connectors: [
        injected(),
        coinbaseWallet({
          appName: 'AI NFT Platform',
          appLogoUrl: 'https://your-url.com/logo.png',
        }),
      ],
      transports: {
        [base.id]: http(),
        [baseSepolia.id]: http(),
      },
    })
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    </WagmiProvider>
  );
} 