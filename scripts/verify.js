/**
 * Usage:
 *   npx hardhat run scripts/verify.js --network sepolia
 * Reads constructor args from deployments/sepolia.json
 */
const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const file = path.join(__dirname, "..", "deployments", "sepolia.json");
  if (!fs.existsSync(file)) {
    throw new Error("Missing deployments/sepolia.json — deploy first.");
  }
  const d = JSON.parse(fs.readFileSync(file, "utf8"));

  console.log("Verifying", d.address);
  await hre.run("verify:verify", {
    address: d.address,
    constructorArguments: [
      d.owners,
      d.smallThreshold,
      d.largeThreshold,
      d.largeAmountThreshold,
      d.cooldownPeriod,
      d.guardians,
    ],
  });
}

main().catch((e) => {
  console.error(e);
  process.exitCode = 1;
});
