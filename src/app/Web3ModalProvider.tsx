'use client';

import { createWeb3Modal } from '@web3modal/wagmi/react';
import { type ReactNode, useEffect } from 'react';
import { type Config } from 'wagmi';

// Your Web3Modal Project ID
const projectId = '63bc98f7-06ff-45a7-b661-5f5e9c111801';

interface Web3ModalProviderProps {
  children: ReactNode;
  config: Config;
}

export function Web3ModalProvider({ children, config }: Web3ModalProviderProps) {
  useEffect(() => {
    createWeb3Modal({
      wagmiConfig: config,
      projectId,
      themeMode: 'dark',
      themeVariables: {
        '--w3m-font-family': 'Recursive, sans-serif',
        '--w3m-accent-color': '#F3EAD6',
        '--w3m-background-color': '#252022',
        '--w3m-text-big-bold-font-weight': '600',
      } as any // Type assertion needed due to theme variable type limitations
    });
  }, [config]);

  return <>{children}</>;
} 