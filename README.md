# Escrow Contract — Shardeum EVM Testnet

A trustless escrow smart contract where funds are locked until **both** the buyer and seller confirm the deal.

## How It Works

| Step | Action | Who |
|------|--------|-----|
| 1 | `createDeal(seller)` — deposit SHM and name a seller | Buyer |
| 2 | `confirm(dealId)` — confirm the deal terms are met | Buyer **and** Seller |
| 3 | `releaseFunds(dealId)` — send locked funds to seller | Buyer |
| ↩️ | `refund(dealId)` — cancel & get funds back (before both confirm) | Buyer |

## Network Details

| Field | Value |
|-------|-------|
| Network | Shardeum EVM Testnet |
| RPC URL | https://api-mezame.shardeum.org |
| Chain ID | 8119 |
| Explorer | https://explorer-mezame.shardeum.org |

## Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Copy .env.example → .env and paste your private key
cp .env.example .env

# 3. Compile the contract
npx hardhat compile

# 4. Run tests (local Hardhat network)
npx hardhat test

# 5. Deploy to Shardeum Testnet
npx hardhat run scripts/deploy.js --network shardeum
```

> **Tip:** Get free testnet SHM from the [Shardeum faucet](https://faucet.shardeum.org/) before deploying.

## Project Structure

```
contracts/
  Escrow.sol          ← main escrow contract
scripts/
  deploy.js           ← deployment script
test/
  Escrow.test.js      ← unit tests
hardhat.config.js     ← Hardhat + Shardeum network config
```
