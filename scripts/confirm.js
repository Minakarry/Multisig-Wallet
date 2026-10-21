/**
 * Bypass MetaMask UI: confirm a proposal from an owner key in .env
 *
 * Usage:
 *   1. Put Account2 private key in .env as OWNER2_PRIVATE_KEY=0x...
 *   2. npx hardhat run scripts/confirm.js --network sepolia
 *
 * Optional: TX_INDEX=0 (default 0)
 */
require("dotenv").config();
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const deployment = JSON.parse(
    fs.readFileSync(path.join(__dirname, "..", "deployments", "sepolia.json"), "utf8")
  );
  const address = deployment.address;
  const txIndex = BigInt(process.env.TX_INDEX || "0");

  const key = process.env.OWNER2_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!key) throw new Error("Missing OWNER2_PRIVATE_KEY or PRIVATE_KEY in .env");

  const wallet = new hre.ethers.Wallet(
    key.startsWith("0x") ? key : `0x${key}`,
    hre.ethers.provider
  );
  const bal = await hre.ethers.provider.getBalance(wallet.address);
  console.log("Signer:", wallet.address);
  console.log("Balance:", hre.ethers.formatEther(bal), "ETH");
  console.log("Contract:", address);
  console.log("Confirming txIndex:", txIndex.toString());

  if (bal === 0n) {
    throw new Error(
      "This account has 0 ETH. Send some SepoliaETH from Account1 first (for gas)."
    );
  }

  const walletContract = await hre.ethers.getContractAt(
    "TieredMultisigWallet",
    address,
    wallet
  );

  const tx = await walletContract.confirmTransaction(txIndex);
  console.log("Sent:", tx.hash);
  await tx.wait();
  console.log("✅ Confirmed on-chain");

  const t = await walletContract.getTransaction(txIndex);
  console.log("Confirmations now:", t.numConfirmations.toString(), "/", t.required.toString());
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
