import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAccount } from 'wagmi';
import { createPublicClient, formatUnits, http, parseEther } from 'viem';
import { sepolia } from 'viem/chains';
import { Contract, type JsonRpcSigner } from 'ethers';
import { createInstance, initSDK, SepoliaConfig } from '@zama-fhe/relayer-sdk/bundle';

import { Header } from './Header';
import { useEthersSigner } from '../hooks/useEthersSigner';
import { CZAMA_SWAP_ABI, CZAMA_SWAP_ADDRESS, CZAMA_TOKEN_ABI, CZAMA_TOKEN_ADDRESS } from '../config/contracts';
import '../styles/SwapApp.css';

const ZERO_ADDRESS = '0x0000000000000000000000000000000000000000';

function isConfiguredAddress(address: string) {
  return address.toLowerCase() !== ZERO_ADDRESS;
}

function toHex32(handle: string | bigint) {
  if (typeof handle === 'string') return handle;
  const hex = handle.toString(16);
  return `0x${hex.padStart(64, '0')}`;
}

export function SwapApp() {
  const { address, isConnected, chainId } = useAccount();
  const signerPromise = useEthersSigner({ chainId });

  const [ethAmount, setEthAmount] = useState('0.1');
  const [swapStatus, setSwapStatus] = useState<string | null>(null);
  const [swapError, setSwapError] = useState<string | null>(null);
  const [isSwapping, setIsSwapping] = useState(false);

  const [encryptedBalance, setEncryptedBalance] = useState<string | null>(null);
  const [isBalanceLoading, setIsBalanceLoading] = useState(false);
  const [balanceError, setBalanceError] = useState<string | null>(null);

  const [quoteOutUnits, setQuoteOutUnits] = useState<bigint | null>(null);
  const [quoteError, setQuoteError] = useState<string | null>(null);

  const [zamaInstance, setZamaInstance] = useState<any>(null);
  const [zamaError, setZamaError] = useState<string | null>(null);
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [decryptedBalanceUnits, setDecryptedBalanceUnits] = useState<bigint | null>(null);
  const [decryptError, setDecryptError] = useState<string | null>(null);

  const publicClient = useMemo(() => createPublicClient({ chain: sepolia, transport: http() }), []);

  const contractsReady = useMemo(() => {
    return isConfiguredAddress(CZAMA_TOKEN_ADDRESS) && isConfiguredAddress(CZAMA_SWAP_ADDRESS);
  }, []);

  useEffect(() => {
    let canceled = false;

    const init = async () => {
      try {
        setZamaError(null);
        await initSDK();

        const config = { ...SepoliaConfig, network: (window as any).ethereum };
        const instance = await createInstance(config);
        if (!canceled) setZamaInstance(instance);
      } catch (e) {
        console.error(e);
        if (!canceled) setZamaError('Failed to initialize Zama relayer SDK');
      }
    };

    init();
    return () => {
      canceled = true;
    };
  }, []);

  const refreshBalance = useCallback(async () => {
    if (!contractsReady) return;
    if (!address) return;

    setIsBalanceLoading(true);
    setBalanceError(null);
    setDecryptError(null);
    setDecryptedBalanceUnits(null);

    try {
      const handle = await publicClient.readContract({
        address: CZAMA_TOKEN_ADDRESS,
        abi: CZAMA_TOKEN_ABI,
        functionName: 'confidentialBalanceOf',
        args: [address],
      });

      setEncryptedBalance(toHex32(handle as any));
    } catch (e) {
      console.error(e);
      setBalanceError('Failed to read encrypted balance');
      setEncryptedBalance(null);
    } finally {
      setIsBalanceLoading(false);
    }
  }, [address, contractsReady, publicClient]);

  useEffect(() => {
    if (!isConnected) return;
    refreshBalance();
  }, [isConnected, refreshBalance]);

  useEffect(() => {
    const updateQuote = async () => {
      if (!contractsReady) return;
      setQuoteError(null);
      setQuoteOutUnits(null);

      try {
        const wei = parseEther(ethAmount || '0');
        const out = await publicClient.readContract({
          address: CZAMA_SWAP_ADDRESS,
          abi: CZAMA_SWAP_ABI,
          functionName: 'quote',
          args: [wei],
        });
        setQuoteOutUnits(out as bigint);
      } catch (e) {
        setQuoteError('Invalid amount');
      }
    };

    void updateQuote();
  }, [contractsReady, ethAmount, publicClient]);

  const doSwap = useCallback(async () => {
    setSwapError(null);
    setSwapStatus(null);

    if (!contractsReady) {
      setSwapError('Contracts are not configured. Deploy on Sepolia and sync the frontend config.');
      return;
    }
    if (!isConnected || !address) {
      setSwapError('Connect your wallet first');
      return;
    }
    if (!signerPromise) {
      setSwapError('Wallet signer is not ready');
      return;
    }

    let signer: JsonRpcSigner;
    try {
      signer = await signerPromise;
    } catch (e) {
      console.error(e);
      setSwapError('Failed to access wallet signer');
      return;
    }

    let valueWei: bigint;
    try {
      valueWei = parseEther(ethAmount);
    } catch {
      setSwapError('Invalid ETH amount');
      return;
    }

    setIsSwapping(true);
    try {
      const swap = new Contract(CZAMA_SWAP_ADDRESS, CZAMA_SWAP_ABI as any, signer);
      const tx = await swap['swap()']({ value: valueWei });
      setSwapStatus(`Transaction sent: ${tx.hash}`);
      await tx.wait();
      setSwapStatus('Swap confirmed');
      await refreshBalance();
    } catch (e) {
      console.error(e);
      setSwapError('Swap failed');
    } finally {
      setIsSwapping(false);
    }
  }, [address, contractsReady, ethAmount, isConnected, refreshBalance, signerPromise]);

  const decryptBalance = useCallback(async () => {
    setDecryptError(null);
    setDecryptedBalanceUnits(null);

    if (!contractsReady) {
      setDecryptError('Contracts are not configured');
      return;
    }
    if (!encryptedBalance) {
      setDecryptError('Encrypted balance is not loaded');
      return;
    }
    if (!isConnected || !address) {
      setDecryptError('Connect your wallet first');
      return;
    }
    if (!zamaInstance) {
      setDecryptError('Zama relayer SDK is not ready');
      return;
    }
    if (!signerPromise) {
      setDecryptError('Wallet signer is not ready');
      return;
    }

    const signer = await signerPromise;
    const signerAddress = await signer.getAddress();

    setIsDecrypting(true);
    try {
      const keypair = zamaInstance.generateKeypair();
      const handleContractPairs = [{ handle: encryptedBalance, contractAddress: CZAMA_TOKEN_ADDRESS }];
      const startTimeStamp = Math.floor(Date.now() / 1000).toString();
      const durationDays = '10';
      const contractAddresses = [CZAMA_TOKEN_ADDRESS];

      const eip712 = zamaInstance.createEIP712(keypair.publicKey, contractAddresses, startTimeStamp, durationDays);
      const signature = await signer.signTypedData(
        eip712.domain,
        { UserDecryptRequestVerification: eip712.types.UserDecryptRequestVerification },
        eip712.message,
      );

      const result = await zamaInstance.userDecrypt(
        handleContractPairs,
        keypair.privateKey,
        keypair.publicKey,
        signature.replace('0x', ''),
        contractAddresses,
        signerAddress,
        startTimeStamp,
        durationDays,
      );

      const decrypted = result[encryptedBalance];
      setDecryptedBalanceUnits(BigInt(decrypted));
    } catch (e) {
      console.error(e);
      setDecryptError('Failed to decrypt balance');
    } finally {
      setIsDecrypting(false);
    }
  }, [address, contractsReady, encryptedBalance, isConnected, signerPromise, zamaInstance]);

  return (
    <div className="swap-app">
      <Header />

      <main className="swap-main">
        <div className="swap-card">
          <div className="swap-card-header">
            <h2 className="swap-title">Swap ETH → cZama</h2>
            <p className="swap-subtitle">Fixed rate: 1 ETH = 1000 cZama</p>
          </div>

          {!contractsReady && (
            <div className="swap-warning">
              <div className="swap-warning-title">Contracts not configured</div>
              <div className="swap-warning-text">
                Deploy contracts on Sepolia and sync `app/src/config/contracts.ts` from `deployments/sepolia`.
              </div>
            </div>
          )}

          {!isConnected && (
            <div className="swap-info">
              <div className="swap-info-title">Connect wallet</div>
              <div className="swap-info-text">Connect your Sepolia wallet to swap and decrypt your encrypted balance.</div>
            </div>
          )}

          {zamaError && <div className="swap-error">Relayer: {zamaError}</div>}

          <div className="swap-row">
            <label className="swap-label" htmlFor="ethAmount">
              ETH amount
            </label>
            <input
              id="ethAmount"
              className="swap-input"
              inputMode="decimal"
              value={ethAmount}
              onChange={(e) => setEthAmount(e.target.value)}
              placeholder="0.1"
            />
            <div className="swap-quote">
              {quoteError && <span className="swap-muted">Quote: {quoteError}</span>}
              {!quoteError && quoteOutUnits !== null && (
                <span className="swap-muted">You receive ≈ {formatUnits(quoteOutUnits, 6)} cZama</span>
              )}
            </div>
          </div>

          <div className="swap-actions">
            <button className="swap-button" onClick={doSwap} disabled={!isConnected || isSwapping || !contractsReady}>
              {isSwapping ? 'Swapping…' : 'Swap'}
            </button>
            <button className="swap-secondary" onClick={refreshBalance} disabled={!isConnected || !contractsReady}>
              Refresh balance
            </button>
          </div>

          {swapStatus && <div className="swap-success">{swapStatus}</div>}
          {swapError && <div className="swap-error">{swapError}</div>}

          <div className="swap-divider" />

          <div className="balance-section">
            <h3 className="balance-title">Your balance</h3>

            {balanceError && <div className="swap-error">{balanceError}</div>}

            <div className="balance-grid">
              <div className="balance-item">
                <div className="balance-label">Encrypted balance handle</div>
                <div className="balance-mono">{isBalanceLoading ? 'Loading…' : encryptedBalance ?? '—'}</div>
              </div>

              <div className="balance-item">
                <div className="balance-label">Decrypted balance</div>
                <div className="balance-value">
                  {decryptedBalanceUnits === null ? '—' : `${formatUnits(decryptedBalanceUnits, 6)} cZama`}
                </div>
              </div>
            </div>

            <div className="balance-actions">
              <button
                className="swap-button"
                onClick={decryptBalance}
                disabled={!isConnected || !contractsReady || isDecrypting || !encryptedBalance}
              >
                {isDecrypting ? 'Decrypting…' : 'Decrypt'}
              </button>
              {decryptError && <div className="swap-error">{decryptError}</div>}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}

