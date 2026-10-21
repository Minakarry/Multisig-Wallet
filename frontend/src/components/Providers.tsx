"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { WagmiProvider } from "wagmi";
import { useState, type ComponentType, type ReactNode } from "react";
import { config } from "@/lib/wagmi";

export function Providers({ children }: { children: ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());
  const Provider = WagmiProvider as ComponentType<{
    config: typeof config;
    children?: ReactNode;
  }>;

  return (
    <Provider config={config}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </Provider>
  );
}
