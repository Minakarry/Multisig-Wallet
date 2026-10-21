# TieredGuard Multisig Wallet

CDS528 小组项目：**带策略的共享托管多签钱包**（Ethereum Sepolia）。

## 创新点

1. **金额分级阈值** — 小额低门槛，大额高门槛  
2. **大额冷却 + 否决** — 达阈值后等待冷却，期间任意 Owner 可 veto  
3. **紧急 Pause** — Guardian 可熔断；解冻需达到大额阈值的 Owner 投票  

## 技术栈

Solidity · OpenZeppelin · Hardhat · Next.js · wagmi/viem · MetaMask · Sepolia  

---

## 当前 Sepolia 部署（在用）

| 项 | 值 |
|---|---|
| **金库合约** | `0xxxxxxxxxxxxxxxxxxxx` |
| Owner 1 | `0xxxxxxxxxxxxxxxxxxx` |
| Owner 2 | `0xxxxxxxxxxxxxxxxxxxx` |
| Owner 3 | `0xxxxxxxxxxxxxxxxxxxx` |
| Guardian | Owner 1（同上） |
| 小额 / 大额阈值 | 2 / 3 |
| 大额线 | 0.1 ETH |
| 冷却 | 120 秒 |

Etherscan：  
https://sepolia.etherscan.io/address/0xxxxxxxxxxxxxxx  

> 不要随意再跑 `npm run deploy:sepolia`。每部署一次都会生成**新空合约**，前端地址也会被改掉；若误部署，把 `frontend/src/lib/contracts.ts` 改回上表地址即可。

---

## 仓库结构

```text
contracts/TieredMultisigWallet.sol   # 核心合约
scripts/deploy.js                    # 部署到 Sepolia
scripts/confirm.js                   # 命令行确认提案（绕过 MetaMask UI）
scripts/verify.js                    # Etherscan 验证
test/TieredMultisigWallet.js         # 单元测试
frontend/                            # dApp（按角色显示功能）
deployments/sepolia.json             # 当前部署信息
```

---

## 一、环境准备

在项目根目录下
npm install
npm run frontend:install
copy .env.example .env


编辑 `.env`（**不要提交到 Git**）：

| 变量 | 说明 |
|---|---|
| `PRIVATE_KEY` | 部署账户（通常 Owner1）私钥 |
| `SEPOLIA_RPC_URL` | Sepolia RPC，可用公共节点 |
| `OWNERS` | 三个 Owner 地址，逗号分隔 |
| `GUARDIANS` | 监护人，建议填 Owner1 |
| `SMALL_THRESHOLD` / `LARGE_THRESHOLD` | 演示用 `2` / `3` |
| `LARGE_AMOUNT_THRESHOLD` | `100000000000000000`（0.1 ETH） |
| `COOLDOWN_PERIOD` | `120`（秒） |
| `OWNER2_PRIVATE_KEY` | 可选；命令行确认时用 |

MetaMask：切到 **Sepolia**，三个 Owner 都要有一点测试 ETH 付 gas（可从 Owner1 转 `0.05` 给 Owner2/3）。

---

## 二、编译与测试

```powershell
npm run compile
npm test
```

预期：`6 passing`。

---

## 三、部署（仅需换 Owners 时）

```powershell
npm run deploy:sepolia
```

成功后会更新 `deployments/sepolia.json` 与前端 `MULTISIG_ADDRESS`。

可选验证：

```powershell
npx hardhat run scripts/verify.js --network sepolia
```

---

## 四、在 Remix 里跑（推荐连现有金库）

适合不装 Hardhat、或 MetaMask 网页确认卡住时，用 Remix 调合约。

### 4.1 准备

1. 打开 https://remix.ethereum.org/  
2. 新建 `TieredMultisigWallet.sol`，粘贴仓库 `contracts/TieredMultisigWallet.sol` 全文  
3. 若 `@openzeppelin` 编译报错，把文件顶部 import 改成：

```solidity
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts@5.0.2/utils/Pausable.sol";
```

4. Solidity Compiler 选 **0.8.20** → Compile  

### 4.2 连接现有金库（不要乱点 Deploy）

新版 Remix（约 2.6）界面说明：

1. 打开 **Deploy & Run**  
2. Environment 选 **Browser Extension**，旁侧选 **MetaMask**（不要选 WalletConnect）  
3. 若已连过，可能**不会再弹窗**，只要 Account 里能看到你的地址、网络显示 **Sepolia** 即可  
4. 确认已 Compile 成功，Contract 选 `TieredMultisigWallet`  
5. **不要填构造函数、不要点 Deploy**（那是新建空合约）  
6. 点顶部标签 **Deployed Contracts**  
7. 点蓝色 **+ Add Contract**  
8. 粘贴当前金库地址：

```text
0xxxxxxxxxxxxx
```

9. 合约类型选 `TieredMultisigWallet`（如有选项，没有就不管）→ 确认添加  
10. 列表里出现合约后点开，即可调用函数  

| 目的 | 函数 | 参数 |
|---|---|---|
| 发起转账 | `submitTransaction` | `to`=收款地址；`value`=金额(wei)；`data`=`0x` |
| 确认 | `confirmTransaction` | 提案编号，如 `0` |
| 执行 | `executeTransaction` | 提案编号 |
| 否决 | `vetoTransaction` | 提案编号（大额冷却中） |
| 暂停 | `pause` | 仅 Guardian |
| 投票解冻 | `voteToUnpause` | 仅 Owner |

金额必须用 **wei**（不是 ETH 小数）：

- `0.05 ETH` → `50000000000000000`  
- `0.1 ETH` → `100000000000000000`  
- `0.2 ETH` → `200000000000000000`  

函数左边有颜色点：

- **橙色点** = 要改链上状态（写入），右边按钮是 **Transact**（点它才会弹 MetaMask）  
- **蓝色点** = 只读查询，右边按钮是 **Call**（一般不弹窗）  

例如确认提案：找到 `confirmTransaction` → 填提案编号 `0` → 点 **Transact**。  
发起转账：`submitTransaction` 填 `to` / `value`(wei) / `data` 填 `0x` → 点 **Transact**。

切换 Account 到其他 Owner 后再点对应的 **Transact** 即可。

> 旧版 Remix 若仍显示 **At Address**，填同一地址后点 At Address 即可，效果相同。

### 4.3 若要在 Remix 新部署

回到 **Deploy** 标签，填构造函数后点 Deploy。参数示例：

```text
["0xxxxxxxxxxxxxxxxxxxxxxxxx","0xxxxxxxxxxxxxxxxxxxxxxxxxxx","0xxxxxxxxxxxxxxxxxxxxxxxxx"], 2, 3, 100000000000000000, 120, ["0xxxxxxxxxxxxxxxxxxxxxxxxx"]
```

Deploy 成功后：复制新地址 → 写入 `frontend/src/lib/contracts.ts` → 给**新地址**充值。  
**注意：** 新部署是空金库，旧地址里的钱不会自动过来。

---

## 五、给金库充值（钱进金库）

金库余额 ≠ MetaMask 个人余额。充值步骤：

1. MetaMask → **发送** → 选 **SepoliaETH**  
2. 收款地址填**合约地址**（当前为 `0xf206…80c4`）  
3. 金额例如 `0.3` → 确认  
4. 打开前端点 **刷新**，金库余额应增加  

任何人都可以往合约地址充值；**转出**必须走多签提案。

---

## 六、启动前端

```powershell
npm run frontend:dev
```

打开 http://localhost:3000  

| 页面 | 路径 | 谁能用 |
|---|---|---|
| 转账 / 金库总览 | `/` | Owner 可发起提案；访客只读 |
| 审批确认 / 安全控制 | `/approvals` | Owner 确认执行；Guardian 可暂停 |

角色由链上 `isOwner` / `isGuardian` 自动识别，换 MetaMask 账户后刷新即可。

---

## 七、完整演示：金库转账给其他账户

### 小额（&lt; 0.1 ETH，需 2 人确认）

1. **充值**：见第五节，金库有余额  
2. **Owner1** 打开转账页  
   - 收款地址：填 Account2 / Account3（**不要填合约自己**）  
   - 金额：`0.05`  
   - 提交提案 → MetaMask 确认  
3. **审批页**：Owner1 点「确认」  
4. 切换到 **Owner2**，再点「确认」  
5. 任一 Owner 点 **执行**  
6. 结果：金库余额减少，收款账户增加  

### 大额（≥ 0.1 ETH，需 3 人 + 冷却）

1. 提案金额例如 `0.2`  
2. Owner1/2/3 都确认 → 进入 **冷却中**（120s，期间可否决）  
3. 冷却结束后点 **执行**  

### 命令行确认（MetaMask「查看提醒」点不了时）

在 `.env` 写入对应 Owner 私钥为 `OWNER2_PRIVATE_KEY`，然后：

```powershell
npx hardhat run scripts/confirm.js --network sepolia
```

默认确认提案 `#0`。确认 `#1`：

```powershell
$env:TX_INDEX="1"; npx hardhat run scripts/confirm.js --network sepolia
```

---

## 八、Owner 与 Guardian

| | Owner | Guardian |
|---|---|---|
| 发起 / 确认 / 执行转账 | ✅ | ❌ |
| 大额冷却期内否决 | ✅ | ❌ |
| 紧急暂停 | ❌ | ✅ |
| 投票解冻 | ✅（需凑齐大额阈值） | ❌ |

当前部署：Owner1 同时是 Guardian。

---

## 九、答辩演示清单

| 步骤 | 操作 | 预期 |
|---|---|---|
| 1 | 向合约充值 | 金库余额 &gt; 0 |
| 2 | Owner1 提交 0.05 ETH 转出 | 出现待确认提案 |
| 3 | Owner1 + Owner2 确认 → 执行 | 收款账户到账 |
| 4 | 提交 ≥0.1 ETH 大额 | 需 3 人确认 |
| 5 | 三人确认后 | 显示冷却中 |
| 6 | 冷却内否决 / 或等待后执行 | 已否决或转出成功 |
| 7 | Guardian 暂停 | 无法新提案 |
| 8 | Owners 投票解冻 | 恢复正常 |

---

## 十、安全说明（报告用）

| 威胁 | 缓解 |
|---|---|
| 重入 | `ReentrancyGuard` + CEI |
| 权限 | `onlyOwner` / `onlyGuardian` |
| 大额胁迫 | 冷却窗口 + `veto` |
| 密钥泄露应急 | Guardian `pause` |
| 粗粒度阈值 | 按金额切换 small/large |

合约选择 **不可升级（immutable）**；应急依赖 Pause。

建议报告附 [Slither](https://github.com/crytic/slither) 扫描截图：

```powershell
pip install slither-analyzer
slither .
```

---

## 十一、常见问题

**网页余额是 0，但我 MetaMask 有币？**  
网页显示的是**金库合约**余额；需先「发送」到合约地址充值。

**确认后人数还是 0？**  
「提交提案」≠「确认」。提交后还要在审批页再点确认，并在 MetaMask 里批准。

**Account2 确认不了 / 没 gas？**  
先从 Account1 给 Account2 转一点 SepoliaETH；或用 `scripts/confirm.js`；或用 Remix 调 `confirmTransaction`。

**Remix 编译找不到 OpenZeppelin？**  
用带版本号的 import（见第四节），或安装 Remix 的 OpenZeppelin 相关支持。

**Remix 里找不到 At Address？**  
新版在 **Deployed Contracts** → **+ Add Contract** 里粘贴合约地址（见第四节）。

**又部署了一次，钱不见了？**  
钱还在旧合约里。把前端 `MULTISIG_ADDRESS` 改回有余额的那个地址（见上文「当前部署」）。

**要不要把前端部署上网？**  
答辩用一台电脑切换 3 个 Owner 即可。多人异地再用 Vercel 等免费部署 `frontend/`。

---

## 十二、学术诚信

- 引用 OpenZeppelin（MIT）等外部代码时使用 APA  
- 使用 AI 辅助请在报告中披露并自行复核  

---

## License

MIT（课程作业用途）
