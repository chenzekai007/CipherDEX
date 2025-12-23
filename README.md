# CipherDEX

CipherDEX is a privacy-focused ETH to cZama swap built on Zama's FHEVM. It offers a fixed 1 ETH = 1000 cZama rate and
stores balances in encrypted form on-chain. Users see their encrypted balance by default and can decrypt it on demand in
the frontend.

## Project Goals

- Provide a simple, deterministic swap from ETH to cZama at a fixed rate.
- Keep user balances encrypted on-chain using FHEVM.
- Demonstrate an end-to-end flow: contract, deployment, tasks/tests, and a React frontend.
- Make privacy visible in the UI by showing ciphertext and enabling user-controlled decryption.

## Key Features

- Fixed-rate swap: 1 ETH always mints 1000 cZama.
- Encrypted balances stored in the contract; no plaintext balances are written on-chain.
- Frontend can show encrypted balances and trigger decryption for the actual value.
- Clear separation of read/write paths: viem for reads, ethers for writes.

## Advantages

- Deterministic pricing removes slippage and price-oracle dependency.
- Strong privacy guarantees for balances using FHE.
- Simple UX: a single swap action and a decryption action.
- Auditable contract behavior with a small, focused feature set.

## Problems Solved

- Prevents public visibility of user balances on-chain.
- Eliminates price volatility in the swap flow by using a fixed rate.
- Reduces UI complexity for a privacy-first token swap.
- Provides a reproducible reference implementation for FHE-enabled dApps.

## Architecture Overview

The system is composed of:

- Smart contracts in `contracts/` that implement the fixed-rate ETH to cZama swap and encrypted balances.
- Deployment scripts in `deploy/` for local testing and Sepolia deployment.
- Custom Hardhat tasks in `tasks/` for developer workflows.
- Tests in `test/` to validate contract behavior.
- A Vite + React frontend in `app/` that reads encrypted data and supports decryption.

Data flow:

1. User connects a wallet in the frontend.
2. The frontend reads encrypted balance data using viem.
3. The user swaps ETH for cZama using ethers to submit transactions.
4. The frontend can request decryption to reveal the actual balance.

## Smart Contract Design

- Fixed-rate formula: `cZama = ETH * 1000`.
- Encrypted balances are stored using FHEVM types and never written in plaintext.
- View functions accept an explicit address parameter; they do not use `msg.sender`.
- Events provide auditable swap activity without leaking plaintext balances.
- No price oracles, no external dependencies, and no dynamic pricing logic.

## Frontend Design

- React + Vite app living in `app/`.
- Wallet connection via Rainbow.
- Contract reads using viem; contract writes using ethers.
- Encrypted balance is displayed by default; a decrypt action reveals the actual value.
- ABI is sourced from `deployments/sepolia` to ensure consistency with the deployed contract.
- No Tailwind CSS; styling is custom.
- No frontend environment variables, no JSON imports, no local storage, and no localhost network.

## Tech Stack

- Smart contracts: Solidity + Hardhat
- Privacy layer: Zama FHEVM
- Frontend: React + Vite
- Wallet UI: Rainbow
- Reads: viem
- Writes: ethers
- Package manager: npm

## Project Structure

```
CipherDEX/
├── app/                # Frontend (React + Vite)
├── contracts/          # Smart contract sources
├── deploy/             # Deployment scripts
├── deployments/        # Deployment outputs and ABIs
├── tasks/              # Hardhat tasks
├── test/               # Contract tests
├── hardhat.config.ts   # Hardhat configuration
└── README.md
```

## Setup

### Prerequisites

- Node.js 20+
- npm

### Install dependencies

```bash
npm install
```

### Configure deployment credentials

Deployment uses a private key and an Infura API key. Do not use a mnemonic.

Create a `.env` file (used only by Hardhat scripts) with:

```
PRIVATE_KEY=your_private_key
INFURA_API_KEY=your_infura_api_key
```

### Compile contracts

```bash
npx hardhat compile
```

### Run tests

```bash
npx hardhat test
```

### Run tasks

Use Hardhat's task list to see available commands:

```bash
npx hardhat help
```

### Deploy locally

```bash
npx hardhat node
npx hardhat deploy --network localhost
```

### Deploy to Sepolia

```bash
npx hardhat deploy --network sepolia
```

## Usage (End User Flow)

1. Connect a wallet in the frontend.
2. Enter an ETH amount to swap.
3. Submit the swap transaction.
4. View the encrypted cZama balance.
5. Click decrypt to reveal the actual balance.

## Security and Privacy Notes

- This is a fixed-rate swap, not a price discovery mechanism.
- Encrypted balances protect user privacy, but transaction metadata remains public.
- Use test networks for development and validation.

## Future Plans

- Add multi-asset swaps with configurable fixed-rate pairs.
- Support advanced privacy-preserving analytics with opt-in disclosure.
- Improve UX for large ciphertexts with compact display modes.
- Add role-based admin controls for pausing or upgrading swap logic.
- Expand test coverage with adversarial and fuzz scenarios.
- Provide a lightweight metrics dashboard for non-sensitive contract health data.

## License

BSD-3-Clause-Clear. See `LICENSE`.
