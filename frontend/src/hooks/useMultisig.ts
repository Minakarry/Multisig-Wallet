"use client";

import { useEffect, useMemo, useState } from "react";
import {
  useAccount,
  useBalance,
  useConnect,
  useDisconnect,
  useReadContract,
  useReadContracts,
  useSwitchChain,
  useWaitForTransactionReceipt,
  useWriteContract,
} from "wagmi";
import { zeroAddress } from "viem";
import { sepolia } from "wagmi/chains";
import { contractConfig, MULTISIG_ADDRESS } from "@/lib/contracts";
import { multisigAbi } from "@/lib/abi";

export type TxRow = {
  index: number;
  to: `0x${string}`;
  value: bigint;
  executed: boolean;
  vetoed: boolean;
  numConfirmations: bigint;
  cooldownEnd: bigint;
  cooldownArmed: boolean;
  required: bigint;
  canExecute: boolean;
  iConfirmed: boolean;
};

export function statusOf(tx: TxRow, now: number) {
  if (tx.executed) return { label: "已执行", cls: "ok" as const };
  if (tx.vetoed) return { label: "已否决", cls: "danger" as const };
  if (tx.numConfirmations < tx.required)
    return { label: "待确认", cls: "warn" as const };
  if (tx.cooldownArmed && now < Number(tx.cooldownEnd))
    return { label: "冷却中", cls: "warn" as const };
  if (tx.canExecute) return { label: "可执行", cls: "ok" as const };
  return { label: "等待中", cls: "warn" as const };
}

export function useMultisig() {
  const { address, isConnected, chainId } = useAccount();
  const { connect, connectors, isPending: connecting } = useConnect();
  const { disconnect } = useDisconnect();
  const { switchChain } = useSwitchChain();
  const { writeContract, data: txHash, isPending: writing, error: writeError, reset } =
    useWriteContract();
  const { isLoading: waiting, isSuccess } = useWaitForTransactionReceipt({
    hash: txHash,
  });

  const [toast, setToast] = useState<string | null>(null);
  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  const configured = MULTISIG_ADDRESS !== zeroAddress;
  const wrongNetwork = isConnected && chainId !== sepolia.id;
  const busy = writing || waiting || connecting;

  useEffect(() => {
    const id = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(id);
  }, []);

  useEffect(() => {
    if (isSuccess) {
      setToast("链上交易已成功（请点刷新查看最新状态）");
      reset();
    }
  }, [isSuccess, reset]);

  useEffect(() => {
    if (writeError) setToast(writeError.message.slice(0, 180));
  }, [writeError]);

  const { data: balance, refetch: refetchBalance } = useBalance({
    address: configured ? MULTISIG_ADDRESS : undefined,
    chainId: sepolia.id,
    query: { enabled: configured },
  });

  const reads = useReadContracts({
    contracts: configured
      ? [
          { ...contractConfig, functionName: "getOwners" },
          { ...contractConfig, functionName: "getGuardians" },
          { ...contractConfig, functionName: "smallThreshold" },
          { ...contractConfig, functionName: "largeThreshold" },
          { ...contractConfig, functionName: "largeAmountThreshold" },
          { ...contractConfig, functionName: "cooldownPeriod" },
          { ...contractConfig, functionName: "paused" },
          { ...contractConfig, functionName: "getTransactionCount" },
          { ...contractConfig, functionName: "unpauseVoteCount" },
        ]
      : [],
    query: { enabled: configured, refetchInterval: 8_000 },
  });

  const owners = (reads.data?.[0]?.result as `0x${string}`[] | undefined) ?? [];
  const guardians = (reads.data?.[1]?.result as `0x${string}`[] | undefined) ?? [];
  const smallThreshold = reads.data?.[2]?.result as bigint | undefined;
  const largeThreshold = reads.data?.[3]?.result as bigint | undefined;
  const largeAmountThreshold = reads.data?.[4]?.result as bigint | undefined;
  const cooldownPeriod = reads.data?.[5]?.result as bigint | undefined;
  const paused = Boolean(reads.data?.[6]?.result);
  const txCount = Number((reads.data?.[7]?.result as bigint | undefined) ?? 0n);
  const unpauseVoteCount = reads.data?.[8]?.result as bigint | undefined;

  const { data: isOwner } = useReadContract({
    ...contractConfig,
    functionName: "isOwner",
    args: address ? [address] : undefined,
    query: { enabled: configured && !!address },
  });

  const { data: isGuardian } = useReadContract({
    ...contractConfig,
    functionName: "isGuardian",
    args: address ? [address] : undefined,
    query: { enabled: configured && !!address },
  });

  const txContracts = useMemo(() => {
    if (!configured || txCount === 0) return [];
    const list = [];
    for (let i = 0; i < txCount; i++) {
      list.push({
        address: MULTISIG_ADDRESS,
        abi: multisigAbi,
        functionName: "getTransaction" as const,
        args: [BigInt(i)] as const,
      });
      list.push({
        address: MULTISIG_ADDRESS,
        abi: multisigAbi,
        functionName: "canExecute" as const,
        args: [BigInt(i)] as const,
      });
      if (address) {
        list.push({
          address: MULTISIG_ADDRESS,
          abi: multisigAbi,
          functionName: "isConfirmed" as const,
          args: [BigInt(i), address] as const,
        });
      }
    }
    return list;
  }, [configured, txCount, address]);

  const txReads = useReadContracts({
    contracts: txContracts,
    query: { enabled: configured && txCount > 0, refetchInterval: 8_000 },
  });

  const transactions: TxRow[] = useMemo(() => {
    if (!txReads.data) return [];
    const stride = address ? 3 : 2;
    const rows: TxRow[] = [];
    for (let i = 0; i < txCount; i++) {
      const base = i * stride;
      const t = txReads.data[base]?.result as
        | readonly [
            `0x${string}`,
            bigint,
            `0x${string}`,
            boolean,
            boolean,
            bigint,
            bigint,
            boolean,
            bigint,
          ]
        | undefined;
      if (!t) continue;
      rows.push({
        index: i,
        to: t[0],
        value: t[1],
        executed: t[3],
        vetoed: t[4],
        numConfirmations: t[5],
        cooldownEnd: t[6],
        cooldownArmed: t[7],
        required: t[8],
        canExecute: Boolean(txReads.data[base + 1]?.result),
        iConfirmed: address ? Boolean(txReads.data[base + 2]?.result) : false,
      });
    }
    return rows.reverse();
  }, [txReads.data, txCount, address]);

  async function refreshAll() {
    await Promise.all([reads.refetch(), txReads.refetch(), refetchBalance()]);
  }

  useEffect(() => {
    if (isSuccess) void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isSuccess]);

  function requireReady() {
    if (!configured) {
      setToast("请先在 frontend/src/lib/contracts.ts 填入合约地址");
      return false;
    }
    if (!isConnected) {
      setToast("请先连接 MetaMask");
      return false;
    }
    if (wrongNetwork) {
      setToast("请切换到 Sepolia");
      return false;
    }
    return true;
  }

  const role = !isConnected
    ? ("disconnected" as const)
    : isOwner && isGuardian
      ? ("owner_guardian" as const)
      : isOwner
        ? ("owner" as const)
        : isGuardian
          ? ("guardian" as const)
          : ("visitor" as const);

  const canTransfer = Boolean(isOwner);
  const canApprove = Boolean(isOwner);
  const canPause = Boolean(isGuardian);
  const canVoteUnpause = Boolean(isOwner);

  return {
    address,
    isConnected,
    connect,
    connectors,
    disconnect,
    switchChain,
    writeContract,
    busy,
    toast,
    setToast,
    now,
    configured,
    wrongNetwork,
    balance,
    owners,
    guardians,
    smallThreshold,
    largeThreshold,
    largeAmountThreshold,
    cooldownPeriod,
    paused,
    unpauseVoteCount,
    isOwner,
    isGuardian,
    role,
    canTransfer,
    canApprove,
    canPause,
    canVoteUnpause,
    transactions,
    refreshAll,
    requireReady,
  };
}
