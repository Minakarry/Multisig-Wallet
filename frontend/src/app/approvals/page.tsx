"use client";

import Link from "next/link";
import { formatEther } from "viem";
import { contractConfig, shortAddress } from "@/lib/contracts";
import { statusOf, useMultisig } from "@/hooks/useMultisig";
import { AppHeader } from "@/components/AppHeader";

export default function ApprovalsPage() {
  const m = useMultisig();
  const allowed = m.canApprove || m.canPause;

  return (
    <main className="app-shell">
      <AppHeader m={m} />

      {!m.configured && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          Contract address is not configured.
        </div>
      )}

      {m.paused && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          Vault is paused.
          {m.canVoteUnpause
            ? ` Owner unpause votes: ${m.unpauseVoteCount?.toString() ?? "0"} / ${m.largeThreshold?.toString() ?? "—"}`
            : " Waiting for Owners to vote for unpause."}
        </div>
      )}

      {!m.isConnected && (
        <section className="panel">
          <h2>Connect Wallet</h2>
          <p className="muted">
            Connect MetaMask to use approval or security features for your role.
          </p>
        </section>
      )}

      {m.isConnected && !allowed && (
        <section className="panel">
          <h2>Access Denied</h2>
          <p className="muted">
            You are neither an Owner nor a Guardian, so this page has no actions for you.
          </p>
          <Link href="/" className="btn btn-secondary">
            ← Back to Vault Overview
          </Link>
        </section>
      )}

      {allowed && (
        <>
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <h2>{m.canApprove ? "Admin Actions" : "Guardian Security"}</h2>
            <p className="muted">
              Vault balance{" "}
              {m.balance
                ? `${Number(formatEther(m.balance.value)).toFixed(4)} ETH`
                : "—"}
              .{" "}
              {m.canApprove
                ? "Review proposals below. Submit new transfers from the Transfer page."
                : "You can only pause the vault. Transfers and confirmations require Owners."}
            </p>
            <div className="tx-actions" style={{ marginTop: "0.85rem" }}>
              {m.canPause && !m.paused && (
                <button
                  className="btn btn-danger"
                  disabled={m.busy}
                  onClick={() => {
                    if (!m.requireReady()) return;
                    m.writeContract({ ...contractConfig, functionName: "pause" });
                  }}
                >
                  Emergency Pause
                </button>
              )}
              {m.canVoteUnpause && m.paused && (
                <button
                  className="btn btn-primary"
                  disabled={m.busy}
                  onClick={() => {
                    if (!m.requireReady()) return;
                    m.writeContract({
                      ...contractConfig,
                      functionName: "voteToUnpause",
                    });
                  }}
                >
                  Vote to Unpause
                </button>
              )}
              <Link href="/" className="btn btn-secondary">
                {m.canTransfer ? "← Back to Transfer" : "← Back to Vault Overview"}
              </Link>
            </div>
          </section>

          <section className="panel">
            <h2>{m.canApprove ? "Pending Proposals" : "Proposals (Read-only)"}</h2>
            {!m.canApprove && (
              <p className="muted" style={{ marginTop: 0 }}>
                Guardians can view proposal status but cannot confirm or execute.
              </p>
            )}
            {m.transactions.length === 0 ? (
              <p className="muted">
                No proposals yet.
                {m.canTransfer
                  ? " Submit one from the Transfer page."
                  : " Waiting for an Owner to submit a transfer."}
              </p>
            ) : (
              <div className="tx-list">
                {m.transactions.map((tx) => {
                  const st = statusOf(tx, m.now);
                  const inCooldown =
                    tx.cooldownArmed &&
                    !tx.executed &&
                    !tx.vetoed &&
                    m.now < Number(tx.cooldownEnd);
                  const remain = Math.max(0, Number(tx.cooldownEnd) - m.now);
                  return (
                    <article className="tx-card" key={tx.index}>
                      <div className="tx-top">
                        <div>
                          <strong>#{tx.index}</strong>{" "}
                          <span className="muted">→ {shortAddress(tx.to, 6)}</span>
                          <div style={{ marginTop: "0.35rem", fontWeight: 650 }}>
                            {formatEther(tx.value)} ETH
                          </div>
                        </div>
                        <span className={`pill ${st.cls}`}>{st.label}</span>
                      </div>
                      <p className="muted">
                        Confirmations {tx.numConfirmations.toString()} /{" "}
                        {tx.required.toString()}
                        {inCooldown ? ` · Cooldown ${remain}s left` : ""}
                        {tx.iConfirmed ? " · You confirmed" : ""}
                      </p>
                      {m.canApprove && (
                        <div className="tx-actions">
                          {!tx.executed && !tx.vetoed && !tx.iConfirmed && (
                            <button
                              className="btn btn-primary"
                              disabled={m.busy || m.paused}
                              onClick={() => {
                                if (!m.requireReady()) return;
                                m.writeContract({
                                  ...contractConfig,
                                  functionName: "confirmTransaction",
                                  args: [BigInt(tx.index)],
                                });
                              }}
                            >
                              Confirm
                            </button>
                          )}
                          {!tx.executed && !tx.vetoed && tx.iConfirmed && (
                            <button
                              className="btn btn-ghost"
                              disabled={m.busy || m.paused}
                              onClick={() => {
                                if (!m.requireReady()) return;
                                m.writeContract({
                                  ...contractConfig,
                                  functionName: "revokeConfirmation",
                                  args: [BigInt(tx.index)],
                                });
                              }}
                            >
                              Revoke
                            </button>
                          )}
                          {inCooldown && (
                            <button
                              className="btn btn-danger"
                              disabled={m.busy || m.paused}
                              onClick={() => {
                                if (!m.requireReady()) return;
                                m.writeContract({
                                  ...contractConfig,
                                  functionName: "vetoTransaction",
                                  args: [BigInt(tx.index)],
                                });
                              }}
                            >
                              Veto
                            </button>
                          )}
                          {tx.canExecute && (
                            <button
                              className="btn btn-secondary"
                              disabled={m.busy || m.paused}
                              onClick={() => {
                                if (!m.requireReady()) return;
                                m.writeContract({
                                  ...contractConfig,
                                  functionName: "executeTransaction",
                                  args: [BigInt(tx.index)],
                                });
                              }}
                            >
                              Execute
                            </button>
                          )}
                        </div>
                      )}
                    </article>
                  );
                })}
              </div>
            )}
          </section>
        </>
      )}

      {m.toast && (
        <div className="toast" onClick={() => m.setToast(null)}>
          {m.toast}
        </div>
      )}
    </main>
  );
}
