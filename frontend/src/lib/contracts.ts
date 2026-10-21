import { multisigAbi } from "./abi";

/** Updated automatically by `npm run deploy:sepolia` — or paste your Remix address here */
export const MULTISIG_ADDRESS = '0xf206100780e987311d4f534c29EE5C6d4DD880c4' as const;

export const SEPOLIA_CHAIN_ID = 11155111;

export const contractConfig = {
  address: MULTISIG_ADDRESS,
  abi: multisigAbi,
} as const;

export function shortAddress(addr?: string, size = 4) {
  if (!addr) return "—";
  return `${addr.slice(0, 2 + size)}…${addr.slice(-size)}`;
}
