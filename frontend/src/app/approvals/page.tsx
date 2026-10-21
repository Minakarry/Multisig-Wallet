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
          合约地址尚未配置。
        </div>
      )}

      {m.paused && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          金库已暂停。
          {m.canVoteUnpause
            ? ` Owner 投票解冻进度：${m.unpauseVoteCount?.toString() ?? "0"} / ${m.largeThreshold?.toString() ?? "—"}`
            : " 等待 Owner 投票解冻。"}
        </div>
      )}

      {!m.isConnected && (
        <section className="panel">
          <h2>需要连接钱包</h2>
          <p className="muted">连接后才会按角色显示审批或安全功能。</p>
        </section>
      )}

      {m.isConnected && !allowed && (
        <section className="panel">
          <h2>无权限访问</h2>
          <p className="muted">你不是 Owner 也不是 Guardian，无法使用此页功能。</p>
          <Link href="/" className="btn btn-secondary">
            ← 回金库总览
          </Link>
        </section>
      )}

      {allowed && (
        <>
          <section className="panel" style={{ marginBottom: "1rem" }}>
            <h2>{m.canApprove ? "管理操作" : "Guardian 安全操作"}</h2>
            <p className="muted">
              金库余额{" "}
              {m.balance
                ? `${Number(formatEther(m.balance.value)).toFixed(4)} ETH`
                : "—"}
              。
              {m.canApprove
                ? "下方可审批提案；发起新转账请回转账页。"
                : "你只能暂停金库；转账与确认需由 Owner 完成。"}
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
                  紧急暂停
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
                  投票解冻
                </button>
              )}
              <Link href="/" className="btn btn-secondary">
                {m.canTransfer ? "← 回转账页" : "← 回金库总览"}
              </Link>
            </div>
          </section>

          <section className="panel">
            <h2>{m.canApprove ? "待审批提案" : "提案一览（只读）"}</h2>
            {!m.canApprove && (
              <p className="muted" style={{ marginTop: 0 }}>
                Guardian 只能查看提案状态，不能确认或执行。
              </p>
            )}
            {m.transactions.length === 0 ? (
              <p className="muted">
                还没有提案。
                {m.canTransfer ? "请先到转账页提交。" : "等待 Owner 发起转账提案。"}
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
                        确认 {tx.numConfirmations.toString()} / {tx.required.toString()}
                        {inCooldown ? ` · 冷却剩余 ${remain}s` : ""}
                        {tx.iConfirmed ? " · 你已确认" : ""}
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
                              确认
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
                              撤销确认
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
                              否决
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
                              执行
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
