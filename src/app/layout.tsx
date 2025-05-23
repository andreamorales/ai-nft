import '@coinbase/onchainkit/styles.css';
import './globals.css';
import type { Metadata } from 'next';
import { ClientProviders } from './ClientProviders';
import { refract } from './fonts';

export const metadata: Metadata = {
  title: 'AI NFT App',
  description: 'AI NFT Application built with Next.js and OnchainKit',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={refract.className}>
        <ClientProviders>
          {children}
        </ClientProviders>
      </body>
    </html>
  );
}
