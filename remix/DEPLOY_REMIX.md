# 在 Remix 里跑通 TieredGuard

两种用法：

- **A. 连接已有金库**（推荐，不新建合约）  
- **B. 在 Remix 重新部署一个新金库**

---

## 准备工作

1. 打开 https://remix.ethereum.org/  
2. MetaMask 切到 **Sepolia**，账户有一点测试 ETH  
3. 把仓库里的 `contracts/TieredMultisigWallet.sol` 全文复制到 Remix  
   - 左侧文件树新建 `contracts/TieredMultisigWallet.sol` 再粘贴  

### 让 OpenZeppelin 能编译

合约开头有：

```solidity
import {ReentrancyGuard} from "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import {Pausable} from "@openzeppelin/contracts/utils/Pausable.sol";
```

任选一种方式：

1. Remix 左侧插件管理器搜索安装 **OpenZeppelin** / 启用 GitHub import；或  
2. 把 import 改成（Remix 常能直接拉）：

```solidity
import "@openzeppelin/contracts@5.0.2/utils/ReentrancyGuard.sol";
import "@openzeppelin/contracts@5.0.2/utils/Pausable.sol";
```

### 编译

- 插件：**Solidity Compiler**  
- 版本：`0.8.20`  
- 勾选 Auto compile 或点 Compile  
- 成功后无红色报错即可  

---

## A. 连接现有金库（不重新部署）

当前在用地址：

```text
0xf206100780e987311d4f534c29EE5C6d4DD880c4
```

1. 打开 **Deploy & Run Transactions**  
2. Environment：选 **Injected Provider - MetaMask**（同意连接）  
3. 确认网络是 Sepolia  
4. 合约下拉选 `TieredMultisigWallet`  
5. 在 **At Address** 输入框填上面的地址，点 **At Address**  
6. 下方会出现已部署合约，可直接调函数  

### 常用操作

| 目的 | 函数 | 参数示例 |
|---|---|---|
| 看 Owner | `getOwners` | 无 |
| 看提案数 | `getTransactionCount` | 无 |
| 看某笔提案 | `getTransaction` | `0` |
| 发起转账 | `submitTransaction` | `to`=收款地址，`value`=金额(wei)，`data`=`0x` |
| 确认 | `confirmTransaction` | 提案编号，如 `0` |
| 执行 | `executeTransaction` | 提案编号 |
| 否决（大额冷却中） | `vetoTransaction` | 提案编号 |
| 暂停 | `pause` | 仅 Guardian |
| 投票解冻 | `voteToUnpause` | 仅 Owner |

**金额换算：**  
- `0.05 ETH` = `50000000000000000`  
- `0.1 ETH` = `100000000000000000`  
- `0.2 ETH` = `200000000000000000`  

Remix 里 `value` 填的是 **wei**，不是 ETH 小数。

切换 MetaMask 账户后，在 Remix 里再点一次对应按钮即可（不同 Owner 确认）。

给金库充值：仍用 MetaMask「发送」SepoliaETH 到合约地址（不要用 submit 充值）。

---

## B. 在 Remix 新部署一个金库

1. Environment：`Injected Provider - MetaMask`（Sepolia）  
2. 构造函数参数（按顺序一次填完，或分栏填）：

```text
_owners: ["0x你的Owner1","0x你的Owner2","0x你的Owner3"]
_smallThreshold: 2
_largeThreshold: 3
_largeAmountThreshold: 100000000000000000
_cooldownPeriod: 120
_guardians: ["0x你的Owner1"]
```

一行写法示例：

```text
["0x6E0A53428Eb6f4d6af9D2a5FAc288b94f30f699a","0xee69C9701394e48A8b7Ad859575c6FcEef0b3F38","0x9E9c328dC68A45408432d02a5AE6345619149489"], 2, 3, 100000000000000000, 120, ["0x6E0A53428Eb6f4d6af9D2a5FAc288b94f30f699a"]
```

3. 点 **Deploy** → MetaMask 确认  
4. 复制新合约地址  
5. 若要用网页前端：把地址写入 `frontend/src/lib/contracts.ts` 的 `MULTISIG_ADDRESS`  
6. MetaMask 向**新地址**充值后再转账  

---

## 常见问题

**编译失败找不到 @openzeppelin？**  
用带版本号的 import（见上文），或安装 Remix OpenZeppelin 相关插件。

**Deploy 按钮灰色？**  
检查是否已 Compile 成功、Environment 是否已连上 MetaMask。

**调用 confirm 失败？**  
当前 MetaMask 账户必须是 Owner；账户要有 SepoliaETH 付 gas。

**网页和 Remix 不是同一个金库？**  
两边必须用同一个合约地址；前端看 `contracts.ts`，Remix 看 At Address。

**只想演示、不想搞乱现有金库？**  
用 **A. At Address 连接** `0xf206…`，不要再 Deploy 新的。
