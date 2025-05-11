'use client';

import styles from './page.module.css';
import { useAccount, useConnect } from 'wagmi';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function Home() {
  const { address, isConnected } = useAccount();
  const { connect, connectors } = useConnect();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.content}>
        {/* Header Section */}
        <header className={styles.header}>
          <h1>AI NFT Platform</h1>
          <div className={styles.buttonContainer}>
            {!isConnected ? (
              <div className={styles.walletButtons}>
                <button 
                  onClick={() => connect({ connector: connectors[0] })}
                  className={styles.walletButton}
                  title="Connect with MetaMask"
                >
                  <Image
                    src="/MetaMask-icon-fox.svg"
                    alt="MetaMask"
                    width={24}
                    height={24}
                  />
                  <span>MetaMask</span>
                </button>
                <button 
                  onClick={() => connect({ connector: connectors[1] })}
                  className={styles.walletButton}
                  title="Connect with Coinbase Wallet"
                >
                  <Image
                    src="/BrandLogo.org - Coinbase Wallet Logo.svg"
                    alt="Coinbase Wallet"
                    width={24}
                    height={24}
                  />
                  <span>Coinbase Wallet</span>
                </button>
              </div>
            ) : (
              <button className={styles.button}>
                Connected: {address?.slice(0, 6)}...{address?.slice(-4)}
              </button>
            )}
          </div>
        </header>

        {/* NFT Gallery Section */}
        <section className={styles.section}>
          <h2>Featured NFTs</h2>
          <div className={styles.nftGrid}>
            <div className={styles.nftCard}>
              <h3>NFT #1</h3>
              <p>Coming Soon</p>
            </div>
            <div className={styles.nftCard}>
              <h3>NFT #2</h3>
              <p>Coming Soon</p>
            </div>
            <div className={styles.nftCard}>
              <h3>NFT #3</h3>
              <p>Coming Soon</p>
            </div>
          </div>
        </section>

        {/* Call to Action */}
        <section className={`${styles.section} ${styles.cta}`}>
          <h2>Ready to Create Your NFT?</h2>
          <p>Connect your wallet to start minting your AI-generated NFTs</p>
          {!isConnected && (
            <div className={styles.walletButtons}>
              <button 
                onClick={() => connect({ connector: connectors[0] })}
                className={styles.walletButton}
                title="Connect with MetaMask"
              >
                <Image
                  src="/MetaMask-icon-fox.svg"
                  alt="MetaMask"
                  width={24}
                  height={24}
                />
                <span>MetaMask</span>
              </button>
              <button 
                onClick={() => connect({ connector: connectors[1] })}
                className={styles.walletButton}
                title="Connect with Coinbase Wallet"
              >
                <Image
                  src="/BrandLogo.org - Coinbase Wallet Logo.svg"
                  alt="Coinbase Wallet"
                  width={24}
                  height={24}
                />
                <span>Coinbase Wallet</span>
              </button>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
