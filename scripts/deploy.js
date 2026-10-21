const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
  const [deployer] = await hre.ethers.getSigners();
  console.log("Deployer:", deployer.address);
  console.log(
    "Balance:",
    hre.ethers.formatEther(await hre.ethers.provider.getBalance(deployer.address)),
    "ETH"
  );

  let owners;
  if (process.env.OWNERS) {
    owners = process.env.OWNERS.split(",").map((a) => a.trim()).filter(Boolean);
  } else {
    // Local / fallback: use first 3 Hardhat accounts
    const signers = await hre.ethers.getSigners();
    owners = signers.slice(0, 3).map((s) => s.address);
  }

  const guardians = process.env.GUARDIANS
    ? process.env.GUARDIANS.split(",").map((a) => a.trim()).filter(Boolean)
    : [owners[0]];

  const smallThreshold = BigInt(process.env.SMALL_THRESHOLD || "2");
  const largeThreshold = BigInt(process.env.LARGE_THRESHOLD || "3");
  const largeAmountThreshold = BigInt(
    process.env.LARGE_AMOUNT_THRESHOLD || hre.ethers.parseEther("0.1").toString()
  );
  const cooldownPeriod = BigInt(process.env.COOLDOWN_PERIOD || "120");

  console.log("Owners:", owners);
  console.log("Guardians:", guardians);
  console.log("smallThreshold:", smallThreshold.toString());
  console.log("largeThreshold:", largeThreshold.toString());
  console.log("largeAmountThreshold:", largeAmountThreshold.toString());
  console.log("cooldownPeriod:", cooldownPeriod.toString(), "seconds");

  const Factory = await hre.ethers.getContractFactory("TieredMultisigWallet");
  const wallet = await Factory.deploy(
    owners,
    smallThreshold,
    largeThreshold,
    largeAmountThreshold,
    cooldownPeriod,
    guardians
  );
  await wallet.waitForDeployment();
  const address = await wallet.getAddress();

  console.log("\n✅ TieredMultisigWallet deployed to:", address);

  const network = await hre.ethers.provider.getNetwork();
  const deployment = {
    address,
    chainId: Number(network.chainId),
    network: hre.network.name,
    deployer: deployer.address,
    owners,
    guardians,
    smallThreshold: smallThreshold.toString(),
    largeThreshold: largeThreshold.toString(),
    largeAmountThreshold: largeAmountThreshold.toString(),
    cooldownPeriod: cooldownPeriod.toString(),
    deployedAt: new Date().toISOString(),
  };

  const outDir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `${hre.network.name}.json`);
  fs.writeFileSync(outFile, JSON.stringify(deployment, null, 2));
  console.log("Saved deployment info to", outFile);

  // Sync address into frontend config if present
  const frontendConfig = path.join(
    __dirname,
    "..",
    "frontend",
    "src",
    "lib",
    "contracts.ts"
  );
  if (fs.existsSync(frontendConfig)) {
    let content = fs.readFileSync(frontendConfig, "utf8");
    content = content.replace(
      /export const MULTISIG_ADDRESS =\s*['"`][^'"`]*['"`] as const;/,
      `export const MULTISIG_ADDRESS = '${address}' as const;`
    );
    fs.writeFileSync(frontendConfig, content);
    console.log("Updated frontend MULTISIG_ADDRESS");
  }

  console.log("\nNext steps:");
  console.log("1. Fund the multisig:", `await (await ethers.getSigner()).sendTransaction({ to: '${address}', value: ethers.parseEther('0.2') })`);
  console.log("2. Verify on Etherscan (optional):");
  console.log(
    `   npx hardhat verify --network sepolia ${address} "${owners.join(",")}" ...`
  );
  console.log("   Or use the constructor args in deployments/" + hre.network.name + ".json");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
