"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sepolia } from "wagmi/chains";
import { shortAddress } from "@/lib/contracts";
import type { useMultisig } from "@/hooks/useMultisig";

type MultisigApi = ReturnType<typeof useMultisig>;

export function AppHeader({ m }: { m: MultisigApi }) {
  const pathname = usePathname();
  const showApprovals = !m.isConnected || m.canApprove || m.canPause;

  return (
    <header className="hero">
      <p className="pill ok">Sepolia · Shared Custody</p>
      <h1 className="brand">
        Tiered<span>Guard</span>
      </h1>
      <p className="lede">
        带金额分级阈值、大额冷却否决与紧急熔断的共享托管多签钱包。
      </p>

      <nav className="nav-tabs">
        <Link href="/" className={`nav-tab ${pathname === "/" ? "active" : ""}`}>
          {m.canTransfer ? "转账" : "金库总览"}
        </Link>
        {showApprovals && (
          <Link
            href="/approvals"
            className={`nav-tab ${pathname === "/approvals" ? "active" : ""}`}
          >
            {m.canApprove ? "审批确认" : "安全控制"}
          </Link>
        )}
      </nav>

      <div className="toolbar">
        {!m.isConnected ? (
          <button
            className="btn btn-primary"
            disabled={m.busy}
            onClick={() => m.connect({ connector: m.connectors[0] })}
          >
            连接 MetaMask
          </button>
        ) : (
          <>
            <span className="pill">{shortAddress(m.address)}</span>
            {m.wrongNetwork && (
              <button
                className="btn btn-secondary"
                onClick={() => m.switchChain({ chainId: sepolia.id })}
              >
                切换到 Sepolia
              </button>
            )}
            {m.isOwner && <span className="pill ok">Owner</span>}
            {m.isGuardian && <span className="pill warn">Guardian</span>}
            {m.role === "visitor" && <span className="pill">访客</span>}
            <button className="btn btn-ghost" onClick={() => m.disconnect()}>
              断开
            </button>
          </>
        )}
        <button className="btn btn-secondary" onClick={() => void m.refreshAll()}>
          刷新
        </button>
      </div>
    </header>
  );
}
