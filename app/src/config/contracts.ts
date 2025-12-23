// This file is intended to be auto-updated by a Hardhat task after deployment.
// It must not import JSON files.

export const CZAMA_TOKEN_ADDRESS = '0xc690a88373Bf0E788e3B53015b87A58AF7A31D5b' as const;
export const CZAMA_SWAP_ADDRESS = '0x25240e7849c919Ac81F4382d98c2A0908651342e' as const;

export const CZAMA_TOKEN_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'account', type: 'address' }],
    name: 'confidentialBalanceOf',
    outputs: [{ internalType: 'euint64', name: '', type: 'bytes32' }],
    stateMutability: 'view',
    type: 'function',
  },
  { inputs: [], name: 'decimals', outputs: [{ internalType: 'uint8', name: '', type: 'uint8' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'name', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
  { inputs: [], name: 'symbol', outputs: [{ internalType: 'string', name: '', type: 'string' }], stateMutability: 'view', type: 'function' },
] as const;

export const CZAMA_SWAP_ABI = [
  {
    inputs: [{ internalType: 'address', name: 'recipient', type: 'address' }],
    name: 'swap',
    outputs: [{ internalType: 'uint64', name: 'czamaOutUnits', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [],
    name: 'swap',
    outputs: [{ internalType: 'uint64', name: 'czamaOutUnits', type: 'uint64' }],
    stateMutability: 'payable',
    type: 'function',
  },
  {
    inputs: [{ internalType: 'uint256', name: 'ethInWei', type: 'uint256' }],
    name: 'quote',
    outputs: [{ internalType: 'uint64', name: 'czamaOutUnits', type: 'uint64' }],
    stateMutability: 'pure',
    type: 'function',
  },
] as const;

