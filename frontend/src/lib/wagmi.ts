import { http, createConfig } from "wagmi";
import { sepolia } from "wagmi/chains";
import { injected } from "@wagmi/connectors";

export const config = createConfig({
  chains: [sepolia],
  connectors: [injected({ shimDisconnect: true })],
  transports: {
    [sepolia.id]: http(
      process.env.NEXT_PUBLIC_SEPOLIA_RPC_URL ||
        "https://ethereum-sepolia-rpc.publicnode.com"
    ),
  },
  ssr: true,
});
