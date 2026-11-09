"use client";

import { useState } from "react";
import Link from "next/link";
import { isAddress, parseEther } from "viem";
import { contractConfig } from "@/lib/contracts";
import { useMultisig } from "@/hooks/useMultisig";
import { AppHeader } from "@/components/AppHeader";
import { VaultOverview } from "@/components/VaultOverview";

export default function TransferPage() {
  const m = useMultisig();
  const [to, setTo] = useState("");
  const [amount, setAmount] = useState("0.05");

  function submitProposal() {
    if (!m.requireReady()) return;
    if (!m.canTransfer) {
      m.setToast("Only Owners can submit transfer proposals");
      return;
    }
    if (!isAddress(to)) {
      m.setToast("Invalid recipient address");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(amount || "0");
    } catch {
      m.setToast("Invalid amount");
      return;
    }
    m.writeContract({
      ...contractConfig,
      functionName: "submitTransaction",
      args: [to as `0x${string}`, value, "0x"],
    });
  }

  return (
    <main className="app-shell">
      <AppHeader m={m} />

      {!m.configured && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          Contract address is not configured.
        </div>
      )}

      {m.paused && m.canTransfer && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          Vault is paused. New proposals are blocked. Go to Approvals to vote for unpause.
        </div>
      )}

      <section className={`grid ${m.canTransfer ? "grid-2" : ""}`}>
        <VaultOverview m={m} />

        {m.canTransfer ? (
          <div className="panel">
            <h2>New Transfer</h2>
            <div className="form">
              <div className="field">
                <label>Recipient</label>
                <input
                  placeholder="0x... (e.g. Account 2)"
                  value={to}
                  onChange={(e) => setTo(e.target.value.trim())}
                />
              </div>
              <div className="field">
                <label>Amount (ETH)</label>
                <input
                  placeholder="0.05"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="muted">
                If vault balance is 0, first send SepoliaETH to the contract via MetaMask.
                Use another account as recipient — not the contract itself.
              </p>
              <button
                className="btn btn-primary"
                disabled={m.busy || m.paused}
                onClick={submitProposal}
              >
                {m.busy ? "Processing…" : "Submit Proposal"}
              </button>
              <Link
                href="/approvals"
                className="btn btn-secondary"
                style={{ textAlign: "center" }}
              >
                Go to Approvals →
              </Link>
            </div>
          </div>
        ) : (
          <div className="panel">
            <h2>Permissions</h2>
            {!m.isConnected && (
              <p className="muted">
                Connect a wallet to see Owner / Guardian / Visitor features.
              </p>
            )}
            {m.role === "guardian" && (
              <>
                <p className="muted">
                  Guardians cannot submit or confirm transfers. They can only pause the vault
                  in an emergency.
                </p>
                <Link href="/approvals" className="btn btn-primary">
                  Go to Security →
                </Link>
              </>
            )}
            {m.role === "visitor" && (
              <p className="muted">
                This account is not in the Owners or Guardians list, so transfer and approval
                actions are hidden.
              </p>
            )}
          </div>
        )}
      </section>

      {m.toast && (
        <div className="toast" onClick={() => m.setToast(null)}>
          {m.toast}
        </div>
      )}
    </main>
  );
}
