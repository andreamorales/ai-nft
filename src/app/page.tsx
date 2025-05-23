'use client';

import styles from './page.module.css';
import aiStyles from './aiNft.module.css';
import { useAccount, useConnect, useWriteContract, useChainId, useSwitchChain } from 'wagmi';
import { useState, useEffect, useRef } from 'react';
import Image from 'next/image';
import { NFTMintCard } from '@coinbase/onchainkit/nft';
import { NFTCreator, NFTCollectionTitle, NFTQuantitySelector, NFTAssetCost, NFTMintButton } from '@coinbase/onchainkit/nft/mint';
import { NFTMedia } from '@coinbase/onchainkit/nft/view';
import type { NFTData, LifecycleStatus } from '@coinbase/onchainkit/nft';
import { base, mainnet } from 'viem/chains';
import { parseEther } from 'viem';

// Use a different approach for window.ethereum type declaration
declare global {
  interface Window {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ethereum?: any;
  }
}

interface CustomNFTData {
  name: string;
  description: string;
  imageUrl: string | undefined;
}

// Simple ERC721 ABI for minting
const mintAbi = [
  {
    "inputs": [
      { "internalType": "address", "name": "to", "type": "address" },
      { "internalType": "uint256", "name": "tokenId", "type": "uint256" }
    ],
    "name": "mint",
    "outputs": [],
    "stateMutability": "payable",
    "type": "function"
  }
];

export default function Home() {
  const { address, isConnected, connector } = useAccount();
  const { connect, connectors } = useConnect();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const [mounted, setMounted] = useState(false);
  const [tokenId, setTokenId] = useState("1");
  const [mintingWithMetaMask, setMintingWithMetaMask] = useState(false);
  const [mintPrice, setMintPrice] = useState("0.001");
  const [walletNetwork, setWalletNetwork] = useState<string>("unknown");
  const [walletType, setWalletType] = useState<string>("unknown");
  const [nftData, setNftData] = useState<CustomNFTData>({
    name: 'AI Generated NFT',
    description: 'AI Generated NFT created with Base',
    imageUrl: undefined
  });
  const [mintStatus, setMintStatus] = useState<string>('');

  // Contract write hook for direct MetaMask minting
  const { writeContract, isPending: isMetaMaskMinting, isSuccess: isMetaMaskMintSuccess } = useWriteContract();

  // AI NFT state
  const [prompt, setPrompt] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [generatedImageUrl, setGeneratedImageUrl] = useState('');
  
  // Inpainting state
  const [isInpaintMode, setIsInpaintMode] = useState(false);
  const [inpaintPrompt, setInpaintPrompt] = useState('');
  const [inpaintModePreset, setInpaintModePreset] = useState('object');
  const [isInpainting, setIsInpainting] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const maskCanvasRef = useRef<HTMLCanvasElement>(null);
  const [popupPosition, setPopupPosition] = useState({ x: 0, y: 0, show: false });
  const [isDrawing, setIsDrawing] = useState(false);
  const [lastX, setLastX] = useState(0);
  const [lastY, setLastY] = useState(0);
  const [brushSize, setBrushSize] = useState(40);
  const [isImageLoading, setIsImageLoading] = useState(false);
  const [currentImage, setCurrentImage] = useState<HTMLImageElement | null>(null);
  const [hasSetupCanvas, setHasSetupCanvas] = useState(false);

  // Create mounted ref for safe async operations
  const isMountedRef = useRef(true);
  
  // Set up the mounted ref
  useEffect(() => {
    isMountedRef.current = true;
    return () => {
      isMountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Update network name
  useEffect(() => {
    if (chainId === base.id) {
      setWalletNetwork("Base");
    } else if (chainId === mainnet.id) {
      setWalletNetwork("Ethereum Mainnet");
    } else if (chainId) {
      setWalletNetwork(`Chain ID ${chainId}`);
    } else {
      setWalletNetwork("unknown");
    }
  }, [chainId]);

  // Detect wallet type
  useEffect(() => {
    if (!isConnected || !connector) {
      setWalletType("unknown");
      return;
    }
    
    if (connector.name.toLowerCase().includes("metamask")) {
      setWalletType("metamask");
    } else if (connector.name.toLowerCase().includes("coinbase")) {
      setWalletType("coinbase");
    } else {
      setWalletType("other");
    }
  }, [isConnected, connector]);

  // Auto switch to Base network when using MetaMask
  useEffect(() => {
    if (isConnected && walletType === "metamask" && chainId !== base.id) {
      // Don't auto-switch immediately on load to avoid bad UX
      // Instead wait until the user has seen the UI
      const timer = setTimeout(() => {
        if (window.confirm("This app works on Base network. Would you like to switch to Base network?")) {
          addBaseNetwork();
        }
      }, 1500);
      
      return () => clearTimeout(timer);
    }
  }, [isConnected, walletType, chainId]);

  // Canvas functions
  const initMaskCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    
    const maskCanvas = maskCanvasRef.current;
    if (!maskCanvas) return;
    
    // Match dimensions with main canvas
    maskCanvas.width = canvas.width;
    maskCanvas.height = canvas.height;
    
    // Get context and clear
    const maskCtx = maskCanvas.getContext('2d', { willReadFrequently: true });
    if (maskCtx) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  };

  const resetCanvasState = () => {
    setHasSetupCanvas(false);
    setCurrentImage(null);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && canvas) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    if (maskCtx && maskCanvas) {
      maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
      maskCtx.fillStyle = 'black';
      maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    }
  };

  const getCanvasPoint = (event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY
    };
  };

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isInpaintMode) return;
    
    setIsDrawing(true);
    const point = getCanvasPoint(event.nativeEvent);
    if (!point) return;
    
    setLastX(point.x);
    setLastY(point.y);
    
    // Draw a single dot if they just click
    drawBrushStroke(point.x, point.y, point.x, point.y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const point = getCanvasPoint(event.nativeEvent);
    if (!point) return;
    
    drawBrushStroke(lastX, lastY, point.x, point.y);
    setLastX(point.x);
    setLastY(point.y);
  };

  const drawBrushStroke = (fromX: number, fromY: number, toX: number, toY: number) => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    
    if (!ctx || !canvas || !currentImage || !maskCtx) return;

    // Draw on preview canvas
    ctx.globalAlpha = 0.5;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = brushSize;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.beginPath();
    ctx.moveTo(fromX, fromY);
    ctx.lineTo(toX, toY);
    ctx.stroke();

    // Draw on mask canvas
    maskCtx.strokeStyle = 'white';
    maskCtx.lineWidth = brushSize;
    maskCtx.lineCap = 'round';
    maskCtx.lineJoin = 'round';
    maskCtx.beginPath();
    maskCtx.moveTo(fromX, fromY);
    maskCtx.lineTo(toX, toY);
    maskCtx.stroke();
  };

  const stopDrawing = (event: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    
    const point = getCanvasPoint(event.nativeEvent);
    if (point) {
      drawBrushStroke(lastX, lastY, point.x, point.y);
      
      // Show the prompt popup
      const canvas = canvasRef.current;
      if (canvas) {
        const rect = canvas.getBoundingClientRect();
        setPopupPosition({
          x: event.nativeEvent.clientX - rect.left,
          y: event.nativeEvent.clientY - rect.top,
          show: true
        });
      }
    }
    
    setIsDrawing(false);
  };

  const clearMask = () => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    
    if (!ctx || !canvas || !currentImage || !maskCtx || !maskCanvas) return;
    
    // Clear and reset main canvas
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(currentImage, 0, 0, canvas.width, canvas.height);
    
    // Clear and reset mask canvas
    maskCtx.clearRect(0, 0, maskCanvas.width, maskCanvas.height);
    maskCtx.fillStyle = 'black';
    maskCtx.fillRect(0, 0, maskCanvas.width, maskCanvas.height);
    
    // Reset UI state
    setPopupPosition({ ...popupPosition, show: false });
    setInpaintPrompt('');
  };

  // Update error handlers to use correct types
  const handleImageError: React.ReactEventHandler<HTMLImageElement> = (event) => {
    console.error('Image load error:', event);
    setError('Failed to load image');
  };

  // Fix the event handlers in the image loading promises
  const resizeImageToDataUrl = async (dataUrl: string, maxDimension: number = 1024): Promise<string> => {
    return new Promise<string>((resolve, reject) => {
      const img = document.createElement('img');
      img.onload = () => {
        let width = img.width;
        let height = img.height;
        if (width > height && width > maxDimension) {
          height = (height * maxDimension) / width;
          width = maxDimension;
        } else if (height > maxDimension) {
          width = (width * maxDimension) / height;
          height = maxDimension;
        }

        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Could not get canvas context'));
          return;
        }

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = 'high';
        
        ctx.drawImage(img, 0, 0, width, height);
        
        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error('Failed to create image blob'));
            return;
          }
          
          const reader = new FileReader();
          reader.onloadend = () => {
            const base64data = reader.result as string;
            resolve(base64data);
          };
          reader.onerror = () => reject(new Error('Failed to convert image to base64'));
          reader.readAsDataURL(blob);
        }, 'image/png');
      };
      img.onerror = () => {
        console.error('Image load error');
        reject(new Error('Failed to load image'));
      };
      img.src = dataUrl;
    });
  };

  const getMaskDataUrl = async (): Promise<string | null> => {
    const maskCanvas = maskCanvasRef.current;
    const maskCtx = maskCanvas?.getContext('2d');
    if (!maskCanvas || !maskCtx) return null;

    console.log('Creating mask...');
    
    // Check if there are any white pixels in the mask
    const maskData = maskCtx.getImageData(0, 0, maskCanvas.width, maskCanvas.height);
    let hasChanges = false;
    
    for (let i = 0; i < maskData.data.length; i += 4) {
      if (maskData.data[i] === 255) { // If any pixel is white
        hasChanges = true;
        break;
      }
    }

    if (!hasChanges) {
      console.warn('No changes detected in mask');
      return null;
    }

    return new Promise<string>((resolve, reject) => {
      maskCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create mask blob'));
          return;
        }
        
        const reader = new FileReader();
        reader.onloadend = () => {
          const base64data = reader.result as string;
          resolve(base64data);
        };
        reader.onerror = () => reject(new Error('Failed to convert mask to base64'));
        reader.readAsDataURL(blob);
      }, 'image/png');
    });
  };

  const applyInpainting = async () => {
    if (!inpaintPrompt.trim()) {
      setError('Please enter a prompt for inpainting');
      return;
    }

    setIsInpainting(true);
    setError('');

    try {
      const maskDataUrl = await getMaskDataUrl();
      if (!maskDataUrl) {
        throw new Error('Failed to create mask');
      }

      // Validate data URLs
      if (!maskDataUrl.startsWith('data:image/') || !generatedImageUrl) {
        throw new Error('Invalid image format');
      }

      console.log('Resizing images...');
      const [resizedImage, resizedMask] = await Promise.all([
        resizeImageToDataUrl(generatedImageUrl, 1024),
        resizeImageToDataUrl(maskDataUrl, 1024)
      ]);

      // Validate resized images
      if (!resizedImage.startsWith('data:image/') || !resizedMask.startsWith('data:image/')) {
        throw new Error('Invalid image format after resizing');
      }

      // Enhance the prompt to ensure proper scaling
      const enhancedPrompt = `a complete ${inpaintPrompt.trim()} centered and fully visible in frame`;

      console.log('Sending inpainting request...');
      const response = await fetch('/api/inpaint', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          image_url: resizedImage,
          mask_url: resizedMask,
          prompt: enhancedPrompt,
          mode: inpaintModePreset
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to inpaint image');
      }

      // Create a temporary URL for the new image blob
      const blob = await response.blob();
      if (generatedImageUrl) {
        URL.revokeObjectURL(generatedImageUrl);
      }
      const newImageUrl = URL.createObjectURL(blob);
      setGeneratedImageUrl(newImageUrl);

      // Reset UI state
      setPopupPosition({ ...popupPosition, show: false });
      setInpaintPrompt('');
      
      // Reset canvas state completely
      setHasSetupCanvas(false);
      setCurrentImage(null);
      const canvas = canvasRef.current;
      const ctx = canvas?.getContext('2d');
      if (ctx && canvas) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }
      
      // Wait for a tick to ensure reactive updates
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Set up canvas with new image
      await setupCanvas();
      
      // Keep inpaint mode enabled for further edits
      setIsInpaintMode(true);
      
    } catch (e: any) {
      console.error('Inpainting error:', e);
      setError(e.message || 'Failed to inpaint image');
    } finally {
      setIsInpainting(false);
    }
  };

  const generateImage = async () => {
    if (!prompt.trim()) {
      setError('Please enter a prompt');
      return;
    }

    setIsLoading(true);
    setError('');
    setGeneratedImageUrl('');

    try {
      console.log('Generating image with prompt:', prompt.trim());
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: prompt.trim(),
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate image');
      }

      const blob = await response.blob();
      const newImageUrl = URL.createObjectURL(blob);
      setGeneratedImageUrl(newImageUrl);
      
      // Increment tokenId for next mint
      setTokenId(prev => String(Number(prev) + 1));
      
      console.log('Image generated successfully');
    } catch (e: any) {
      console.error('Image generation error:', e);
      setError(e.message || 'Failed to generate image');
    } finally {
      setIsLoading(false);
    }
  };

  // Update the setupCanvas function to check mounted state
  const setupCanvas = async () => {
    if (hasSetupCanvas || !isMountedRef.current) {
      console.log('Canvas already set up or component unmounted, skipping...');
      return;
    }

    console.log('Starting canvas setup...', { generatedImageUrl });
    const canvas = canvasRef.current;
    if (!canvas || !generatedImageUrl || !isMountedRef.current) {
      console.error('Missing canvas or image URL:', { canvas: !!canvas, hasUrl: !!generatedImageUrl });
      return;
    }
    
    setIsImageLoading(true);
    setError('');
    
    try {
      // Initialize context with willReadFrequently
      console.log('Getting canvas context...');
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (!ctx) {
        throw new Error('Could not get canvas context');
      }

      // Load image
      console.log('Loading image...');
      const img = document.createElement('img');
      await new Promise((resolve, reject) => {
        img.onload = () => {
          if (!isMountedRef.current) {
            resolve(null);
            return;
          }
          console.log('Image loaded successfully:', {
            width: img.width,
            height: img.height,
            src: img.src.substring(0, 100) + '...'
          });
          resolve(null);
        };
        img.onerror = () => {
          console.error('Image load error');
          reject(new Error('Failed to load image'));
        };
        img.src = generatedImageUrl;
      });

      if (!isMountedRef.current) return;
      setCurrentImage(img);

      // Set canvas size to match image
      console.log('Setting canvas dimensions...');
      const maxWidth = 800;
      const scale = Math.min(1, maxWidth / img.width);
      canvas.width = img.width * scale;
      canvas.height = img.height * scale;
      console.log('Canvas dimensions set:', { width: canvas.width, height: canvas.height, scale });

      // Draw image
      console.log('Drawing image to canvas...');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      console.log('Image drawn to canvas');

      // Initialize mask canvas
      initMaskCanvas();

      console.log('Canvas setup complete');
      if (isMountedRef.current) {
        setHasSetupCanvas(true);
      }
    } catch (e) {
      console.error('Canvas setup error:', e);
      if (isMountedRef.current) {
        setError('Failed to load image for editing');
        setIsInpaintMode(false);
        setHasSetupCanvas(false);
      }
    } finally {
      if (isMountedRef.current) {
        setIsImageLoading(false);
      }
    }
  };

  useEffect(() => {
    if (isInpaintMode && canvasRef.current && (!hasSetupCanvas || !currentImage)) {
      console.log('Canvas needs setup, initializing...', { hasCanvas: !!canvasRef.current, hasSetup: hasSetupCanvas, hasImage: !!currentImage });
      setupCanvas();
    }
  }, [isInpaintMode, hasSetupCanvas, currentImage, generatedImageUrl]);

  useEffect(() => {
    if (!isInpaintMode) {
      resetCanvasState();
    }
  }, [isInpaintMode]);

  // Custom hook for NFT data
  const useNFTData = () => {
    return nftData;
  };

  // Function to update NFT data
  const updateNFTData = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    // Get the current canvas image
    const imageUrl = canvas.toDataURL('image/png');
    setNftData(prev => ({
      ...prev,
      imageUrl
    }));
  };

  // NFT Status handler
  const handleNFTStatus = (status: LifecycleStatus) => {
    console.log('NFT Status:', status);
    const { statusName, statusData } = status;
    
    setMintStatus(statusName);
    
    if (statusName === 'error' && statusData) {
      setError(`Mint error: ${statusData.message || 'Unknown error'}`);
    } else if (statusName === 'success') {
      // Handle success - maybe show a success message
      console.log('Mint successful!', statusData);
    }
  };

  // Update NFT data when image changes
  useEffect(() => {
    if (generatedImageUrl) {
      setNftData(prev => ({
        ...prev,
        imageUrl: generatedImageUrl
      }));
    }
  }, [generatedImageUrl]);

  // Update NFT data after inpainting
  useEffect(() => {
    if (isInpaintMode && hasSetupCanvas && !isInpainting) {
      updateNFTData();
    }
  }, [isInpaintMode, hasSetupCanvas, isInpainting]);

  // Function to add Base network to MetaMask
  const addBaseNetwork = async () => {
    if (!window.ethereum) {
      setError('MetaMask not detected');
      return;
    }
    
    try {
      setError('Switching to Base network...');
      
      // First try to simply switch to the network
      try {
        await window.ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x2105' }] // 8453 in hex
        });
        setError('');
        return; // Success, we're done
      } catch (switchError: any) {
        // This error code indicates that the chain has not been added to MetaMask
        if (switchError.code === 4902 || switchError.message.includes('wallet_addEthereumChain')) {
          console.log('Network not found, attempting to add it');
          // Network doesn't exist, add it
        } else {
          // For other errors, just throw and let the catch below handle it
          throw switchError;
        }
      }
      
      // If we get here, we need to add the network
      await window.ethereum.request({
        method: 'wallet_addEthereumChain',
        params: [{
          chainId: '0x2105', // 8453 in hex
          chainName: 'Base',
          nativeCurrency: {
            name: 'Ethereum',
            symbol: 'ETH',
            decimals: 18
          },
          rpcUrls: ['https://mainnet.base.org'],
          blockExplorerUrls: ['https://basescan.org']
        }]
      });
      
      // After adding, try to switch to it again
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: '0x2105' }]
      });
      
      setError('');
    } catch (error: any) {
      console.error('Error adding/switching to Base network', error);
      setError(`Failed to switch to Base network: ${error.message || 'Unknown error'}`);
    }
  };

  // Handle direct MetaMask mint
  const handleMetaMaskMint = async () => {
    if (!isConnected) {
      setError('Please connect your wallet first');
      return;
    }

    // Check if on correct network - don't proceed if not on Base
    if (chainId !== base.id) {
      await addBaseNetwork();
      // Check again if we're on Base network after the attempt to switch
      if (chainId !== base.id) {
        setError('You must be on Base network to mint. Please switch networks in your wallet.');
        return;
      }
    }

    setMintingWithMetaMask(true);
    setError('');
    
    try {
      writeContract({
        abi: mintAbi,
        address: '0xb4703a3a73aec16e764cbd210b0fde9efdab8941',
        functionName: 'mint',
        args: [address, BigInt(tokenId)],
        value: parseEther(mintPrice)
      });
    } catch (error: any) {
      console.error('MetaMask mint error:', error);
      setError(`MetaMask mint error: ${error.message || 'Unknown error'}`);
      setMintingWithMetaMask(false);
    }
  };

  // Check for successful MetaMask mint
  useEffect(() => {
    if (isMetaMaskMintSuccess) {
      setMintStatus('success');
      setMintingWithMetaMask(false);
      // Increment token ID for next mint
      setTokenId(prev => String(Number(prev) + 1));
    }
  }, [isMetaMaskMintSuccess]);

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

        {generatedImageUrl ? (
          <div className={aiStyles.sideLayout}>
            {/* Left Column - Prompt */}
            <div className={aiStyles.leftColumn}>
              <div className={`${aiStyles.inputGroup} ${aiStyles.inSideLayout}`}>
                <textarea
                  className={aiStyles.textarea}
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Enter your prompt here... Be descriptive! For example: 'A serene Japanese garden with a small wooden bridge over a koi pond, cherry blossoms falling gently in the morning mist'"
                  onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateImage()}
                  rows={4}
                />
                <button 
                  onClick={generateImage} 
                  disabled={isLoading}
                  className={styles.button}
                >
                  {isLoading ? 'Generating...' : 'Generate'}
                </button>
              </div>
              
              {error && (
                <div className={aiStyles.error}>{error}</div>
              )}
        </div>
            
            {/* Right Column - Image and Minting */}
            <div className={aiStyles.rightColumn}>
              <div className={`${aiStyles.imageContainer} ${aiStyles.inSideLayout}`}>
                {!isInpaintMode ? (
                  <>
                    <img 
                      src={generatedImageUrl} 
                      alt={prompt} 
                      className={aiStyles.generatedImage}
                      onError={handleImageError}
                    />
                    <div className={aiStyles.imageActions}>
                      <button
                        className={`${styles.button} ${aiStyles.editButton}`}
                        onClick={() => {
                          resetCanvasState();
                          setIsInpaintMode(true);
                        }}
                      >
                        Edit Image
                      </button>
                      
                      <div className={aiStyles.mintOptions}>
                        <h3>Mint Your NFT</h3>
                        {!isConnected ? (
                          <div className={aiStyles.connectWalletPrompt}>
                            <p>Connect your wallet to mint this NFT</p>
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
                          </div>
                        ) : (
                          <>
                            {walletType === "coinbase" ? (
                              <div className={aiStyles.mintCards}>
                                <div>
                                  <NFTMintCard
                                    contractAddress="0xb4703a3a73aec16e764cbd210b0fde9efdab8941"
                                    tokenId={tokenId}
                                    useNFTData={useNFTData}
                                    className={aiStyles.mintCard}
                                    onStatus={handleNFTStatus}
                                  >
                                    <NFTMedia />
                                    <NFTCollectionTitle />
                                    <NFTQuantitySelector />
                                    <NFTAssetCost />
                                    <NFTMintButton />
                                  </NFTMintCard>
                                </div>
                              </div>
                            ) : (
                              <div className={aiStyles.mintCards}>
                                <div className={aiStyles.metaMaskMintCard}>
                                  <div className={aiStyles.metaMaskMintContent}>
                                    <div className={aiStyles.networkInfo}>
                                      <span>Current network: <span className={chainId === base.id ? aiStyles.correctNetwork : aiStyles.wrongNetwork}>
                                        {walletNetwork}
                                      </span></span>
                                      
                                      {chainId !== base.id && (
                                        <div className={aiStyles.networkWarning}>
                                          <span>⚠️ You must be on Base network to mint</span>
                                          <button 
                                            onClick={addBaseNetwork}
                                            className={aiStyles.addNetworkButton}
                                          >
                                            Switch to Base Network
                                          </button>
                                        </div>
                                      )}
                                    </div>
                                    <div className={aiStyles.priceInput}>
                                      <label>
                                        Price (ETH)
                                        <input 
                                          type="number" 
                                          value={mintPrice}
                                          onChange={(e) => setMintPrice(e.target.value)}
                                          step="0.001"
                                          min="0.001"
                                        />
                                      </label>
                                    </div>
                                    <button
                                      onClick={chainId !== base.id ? addBaseNetwork : handleMetaMaskMint}
                                      disabled={!isConnected || isMetaMaskMinting || mintingWithMetaMask}
                                      className={`${styles.button} ${chainId !== base.id ? aiStyles.switchNetworkButton : aiStyles.metaMaskMintButton}`}
                                    >
                                      {chainId !== base.id ? (
                                        <>Switch to Base Network</>
                                      ) : (
                                        <>
          <Image
                                            src="/MetaMask-icon-fox.svg"
                                            alt="MetaMask"
                                            width={20}
                                            height={20}
                                          />
                                          {isMetaMaskMinting || mintingWithMetaMask ? 'Minting...' : 'Mint with MetaMask'}
                                        </>
                                      )}
                                    </button>
                                  </div>
                                </div>
                              </div>
                            )}
                          </>
                        )}
                      </div>
                      
                      {mintStatus === 'success' && (
                        <div className={aiStyles.success}>NFT minted successfully!</div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={aiStyles.canvasWrapper}>
                    {isImageLoading && (
                      <div className={aiStyles.loadingOverlay}>
                        Loading image...
                      </div>
                    )}

                    <div className={aiStyles.canvasTools}>
                      <div className={aiStyles.brushControls}>
                        <label>
                          Brush Size: {brushSize}px
                          <input 
                            type="range" 
                            min="5" 
                            max="100" 
                            value={brushSize}
                            onChange={(e) => setBrushSize(Number(e.target.value))}
                          />
                        </label>
                      </div>
                    </div>

                    <canvas
                      ref={canvasRef}
                      className={aiStyles.canvas}
                      onMouseDown={startDrawing}
                      onMouseMove={draw}
                      onMouseUp={stopDrawing}
                      onMouseLeave={stopDrawing}
                    />
                    
                    <canvas
                      ref={maskCanvasRef}
                      style={{ display: 'none' }}
                    />
                    
                    {popupPosition.show && (
                      <div 
                        className={aiStyles.inpaintPopup}
                        style={{ left: `${popupPosition.x}px`, top: `${popupPosition.y}px` }}
                      >
                        <textarea
                          value={inpaintPrompt}
                          onChange={(e) => setInpaintPrompt(e.target.value)}
                          placeholder="Describe what to add or change..."
                          className={aiStyles.textarea}
                        />
                        <div className={aiStyles.presetGroup}>
                          <label>
                            <input 
                              type="radio" 
                              name="inpaintModePreset" 
                              value="edit" 
                              checked={inpaintModePreset === 'edit'}
                              onChange={(e) => setInpaintModePreset(e.target.value)}
                            />
                            Slight Edit
                          </label>
                          <label>
                            <input 
                              type="radio" 
                              name="inpaintModePreset" 
                              value="object" 
                              checked={inpaintModePreset === 'object'}
                              onChange={(e) => setInpaintModePreset(e.target.value)}
                            />
                            Add New Object
                          </label>
                        </div>
                        <button 
                          onClick={applyInpainting} 
                          disabled={isInpainting}
                          className={styles.button}
                        >
                          {isInpainting ? 'Applying...' : 'Apply'}
                        </button>
                        <button 
                          onClick={clearMask}
                          disabled={isInpainting}
                          className={`${styles.button} ${styles.secondary}`}
                        >
                          Clear
                        </button>
                      </div>
                    )}

                    <div className={aiStyles.canvasControls}>
                      <button 
                        onClick={() => setIsInpaintMode(false)}
                        className={`${styles.button} ${styles.secondary}`}
                      >
                        Done Editing
                      </button>
                      <button 
                        onClick={clearMask}
                        className={`${styles.button} ${styles.secondary}`}
                      >
                        Clear Selection
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ) : (
          // Initial state - just the prompt input centered
          <>
            <div className={aiStyles.inputGroup}>
              <textarea
                className={aiStyles.textarea}
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder="Enter your prompt here... Be descriptive! For example: 'A serene Japanese garden with a small wooden bridge over a koi pond, cherry blossoms falling gently in the morning mist'"
                onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && generateImage()}
                rows={4}
              />
              <button 
                onClick={generateImage} 
                disabled={isLoading}
                className={styles.button}
              >
                {isLoading ? 'Generating...' : 'Generate'}
              </button>
            </div>

            {error && (
              <div className={aiStyles.error}>{error}</div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
