"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { sepolia } from "wagmi/chains";
import { shortAddress } from "@/lib/contracts";
import type { useMultisig } from "@/hooks/useMultisig";

type MultisigApi = ReturnType<typeof useMultisig>;

function roleLabel(role: MultisigApi["role"]) {
  switch (role) {
    case "owner_guardian":
      return "Owner + Guardian";
    case "owner":
      return "Owner";
    case "guardian":
      return "Guardian";
    case "visitor":
      return "Visitor";
    default:
      return "Not connected";
  }
}

export function AppHeader({ m }: { m: MultisigApi }) {
  const pathname = usePathname();
  const showApprovals = !m.isConnected || m.canApprove || m.canPause;

  return (
    <header className="hero">
      <div className="topbar">
        <div className="topbar-brand">
          <p className="pill ok">Sepolia · Shared Custody</p>
          <h1 className="brand">
            Tiered<span>Guard</span>
          </h1>
        </div>

        <div className="topbar-auth">
          {!m.isConnected ? (
            <button
              className="btn btn-primary"
              disabled={m.busy}
              onClick={() => m.connect({ connector: m.connectors[0] })}
            >
              Connect MetaMask
            </button>
          ) : (
            <>
              <span className="pill auth-address">{shortAddress(m.address, 5)}</span>
              {m.wrongNetwork && (
                <button
                  className="btn btn-secondary"
                  onClick={() => m.switchChain({ chainId: sepolia.id })}
                >
                  Switch to Sepolia
                </button>
              )}
              <button className="btn btn-ghost" onClick={() => m.disconnect()}>
                Disconnect
              </button>
            </>
          )}
          <button className="btn btn-secondary" onClick={() => void m.refreshAll()}>
            Refresh
          </button>
        </div>
      </div>

      <p className="lede">
        Shared-custody multisig with amount-tiered thresholds, large-tx cooldown veto, and
        emergency pause.
      </p>

      <div className="chrome-row">
        <div className="chrome-block chrome-nav">
          <span className="chrome-label">Navigation</span>
          <nav className="nav-tabs">
            <Link href="/" className={`nav-tab ${pathname === "/" ? "active" : ""}`}>
              {m.canTransfer ? "Transfer" : "Vault Overview"}
            </Link>
            {showApprovals && (
              <Link
                href="/approvals"
                className={`nav-tab ${pathname === "/approvals" ? "active" : ""}`}
              >
                {m.canApprove ? "Approvals" : "Security"}
              </Link>
            )}
          </nav>
        </div>

        <div className="chrome-block chrome-role">
          <span className="chrome-label">Role</span>
          <div className="role-group">
            <span className="pill role-main">{roleLabel(m.role)}</span>
            {m.isOwner && <span className="pill ok">Owner</span>}
            {m.isGuardian && <span className="pill warn">Guardian</span>}
            {m.role === "visitor" && <span className="pill">Visitor</span>}
          </div>
        </div>
      </div>
    </header>
  );
}
