# TieredGuard Multisig Wallet

CDS528 group project — shared-custody multisig on Ethereum Sepolia.

GitHub: https://github.com/Minakarry/Multisig-Wallet

Current Sepolia contract: `0xf206100780e987311d4f534c29EE5C6d4DD880c4`  
Etherscan (verified): https://sepolia.etherscan.io/address/0xf206100780e987311d4f534c29EE5C6d4DD880c4#code

This project is released under the MIT License (`LICENSE`). Third-party libraries (including OpenZeppelin and Hardhat) and APA citations are listed in `CITATIONS.md`.

---

## 1. Install

Requirements: Node.js 18+, npm, MetaMask (Sepolia).

```powershell
git clone https://github.com/Minakarry/Multisig-Wallet.git
cd Multisig-Wallet
npm install
npm run frontend:install
```

For **deploy / verify** only, copy env and fill secrets (do not commit `.env`):

```powershell
copy .env.example .env
```

| Variable | Purpose |
|---|---|
| `PRIVATE_KEY` | Deployer account private key |
| `SEPOLIA_RPC_URL` | Sepolia RPC URL |
| `ETHERSCAN_API_KEY` | Needed for contract verification |
| `OWNERS` | Three owner addresses, comma-separated |
| `GUARDIANS` | Guardian addresses (e.g. Owner1) |
| `SMALL_THRESHOLD` / `LARGE_THRESHOLD` | e.g. `2` / `3` |
| `LARGE_AMOUNT_THRESHOLD` | e.g. `100000000000000000` (0.1 ETH) |
| `COOLDOWN_PERIOD` | e.g. `120` (seconds) |

To run the existing vault with the frontend only, env keys are **not** required.

---

## 2. Compile

```powershell
npm run compile
```

---

## 3. Test

```powershell
npm test
```

Expected: `6 passing`.

---

## 4. Deploy

The active vault is already deployed and verified on Sepolia. Prefer that address; avoid casual redeploy (a new deploy creates an empty vault).

If you must redeploy:

```powershell
npm run deploy:sepolia
```

This updates `deployments/sepolia.json` and the frontend contract address.

Verify on Etherscan (after deploy, with `ETHERSCAN_API_KEY` set):

```powershell
npx hardhat run scripts/verify.js --network sepolia
```

Optional backup without the Next.js UI: in Remix, use **Deployed Contracts → Add Contract** with address `0xf206100780e987311d4f534c29EE5C6d4DD880c4`, then Transact with MetaMask.

---

## 5. Run frontend (optional)

```powershell
npm run frontend:dev
```

Open http://localhost:3000 and connect MetaMask on **Sepolia**.
