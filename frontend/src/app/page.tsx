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
      m.setToast("仅 Owner 可发起转账提案");
      return;
    }
    if (!isAddress(to)) {
      m.setToast("收款地址无效");
      return;
    }
    let value: bigint;
    try {
      value = parseEther(amount || "0");
    } catch {
      m.setToast("金额无效");
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
          合约地址尚未配置。
        </div>
      )}

      {m.paused && m.canTransfer && (
        <div className="banner" style={{ marginBottom: "1rem" }}>
          金库已暂停，暂时无法发起新提案。请到审批页投票解冻。
        </div>
      )}

      <section className={`grid ${m.canTransfer ? "grid-2" : ""}`}>
        <VaultOverview m={m} />

        {m.canTransfer ? (
          <div className="panel">
            <h2>发起转账</h2>
            <div className="form">
              <div className="field">
                <label>收款地址</label>
                <input
                  placeholder="0x...（例如 Account 2）"
                  value={to}
                  onChange={(e) => setTo(e.target.value.trim())}
                />
              </div>
              <div className="field">
                <label>金额 (ETH)</label>
                <input
                  placeholder="0.05"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                />
              </div>
              <p className="muted">
                金库余额为 0 时，请先用 MetaMask「发送」向合约充值。收款地址请填其他账户，不要填合约自己。
              </p>
              <button
                className="btn btn-primary"
                disabled={m.busy || m.paused}
                onClick={submitProposal}
              >
                {m.busy ? "处理中…" : "提交转账提案"}
              </button>
              <Link
                href="/approvals"
                className="btn btn-secondary"
                style={{ textAlign: "center" }}
              >
                去审批确认页 →
              </Link>
            </div>
          </div>
        ) : (
          <div className="panel">
            <h2>权限说明</h2>
            {!m.isConnected && (
              <p className="muted">连接钱包后，将按 Owner / Guardian / 访客显示对应功能。</p>
            )}
            {m.role === "guardian" && (
              <>
                <p className="muted">Guardian 不能发起或确认转账，只能紧急冻结金库。</p>
                <Link href="/approvals" className="btn btn-primary">
                  前往安全控制 →
                </Link>
              </>
            )}
            {m.role === "visitor" && (
              <p className="muted">
                当前账户不在 Owners / Guardians 列表中，因此不显示转账与审批操作。
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
