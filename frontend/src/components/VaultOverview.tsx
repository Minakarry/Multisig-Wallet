"use client";

import { formatEther } from "viem";
import { MULTISIG_ADDRESS, shortAddress } from "@/lib/contracts";
import type { useMultisig } from "@/hooks/useMultisig";

type MultisigApi = ReturnType<typeof useMultisig>;

export function VaultOverview({ m }: { m: MultisigApi }) {
  return (
    <div className="panel">
      <h2>金库概览</h2>
      <div className="stat-row">
        <div className="stat">
          <span className="label">余额</span>
          <span className="value">
            {m.balance ? Number(formatEther(m.balance.value)).toFixed(4) : "—"} ETH
          </span>
        </div>
        <div className="stat">
          <span className="label">小额 / 大额阈值</span>
          <span className="value">
            {m.smallThreshold?.toString() ?? "—"} / {m.largeThreshold?.toString() ?? "—"}
          </span>
        </div>
        <div className="stat">
          <span className="label">大额线 · 冷却</span>
          <span className="value" style={{ fontSize: "1rem" }}>
            {m.largeAmountThreshold ? `${formatEther(m.largeAmountThreshold)} ETH` : "—"} ·{" "}
            {m.cooldownPeriod ? `${m.cooldownPeriod.toString()}s` : "—"}
          </span>
        </div>
      </div>

      <p className="muted" style={{ marginTop: "1rem" }}>
        合约 {shortAddress(MULTISIG_ADDRESS, 6)}
      </p>

      <div style={{ marginTop: "1rem" }}>
        <p className="muted" style={{ marginBottom: "0.45rem" }}>
          Owners
        </p>
        <div className="owners">
          {m.owners.length === 0 && <span className="pill">暂无</span>}
          {m.owners.map((o) => (
            <span className="pill" key={o}>
              {shortAddress(o)}
            </span>
          ))}
        </div>
      </div>

      <div style={{ marginTop: "0.9rem" }}>
        <p className="muted" style={{ marginBottom: "0.45rem" }}>
          Guardians
        </p>
        <div className="owners">
          {m.guardians.length === 0 && <span className="pill">暂无</span>}
          {m.guardians.map((g) => (
            <span className="pill warn" key={g}>
              {shortAddress(g)}
            </span>
          ))}
        </div>
      </div>
    </div>
  );
}
