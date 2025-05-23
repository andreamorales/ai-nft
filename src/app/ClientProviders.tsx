'use client';

import { OnchainKitProvider } from '@coinbase/onchainkit';
import { base } from 'viem/chains';
import { Providers } from './providers';

export function ClientProviders({ children }: { children: React.ReactNode }) {
  return (
    <Providers>
      <OnchainKitProvider 
        apiKey={process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}
        chain={base}
      >
        {children}
      </OnchainKitProvider>
    </Providers>
  );
} 