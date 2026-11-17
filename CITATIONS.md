# Citations, Licensing & AI Disclosure

This file supports **CDS528 Rubric R6 — Citations/licensing (2 pts)**.  
Copy the APA references below into the project report as needed.

---

## 1. Project license

This repository is released under the **MIT License**.  
See the [`LICENSE`](./LICENSE) file in the repository root.

---

## 2. Third-party licenses (summary)

| Dependency | Used for | License |
|---|---|---|
| OpenZeppelin Contracts v5 (`ReentrancyGuard`, `Pausable`) | Smart-contract security primitives | MIT |
| Hardhat / Hardhat Toolbox | Compile, test, deploy | MIT |
| Next.js | Frontend framework | MIT |
| wagmi / viem | Wallet & Ethereum client integration | MIT |
| React / React DOM | UI rendering | MIT |
| MetaMask | Wallet (external product; not vendored in this repo) | Proprietary (user-installed) |
| Ethereum / Sepolia tooling & docs | Development guidance | Content licenses of ethereum.org |

All third-party libraries used in this project are license-compatible with our MIT project license.

---

## 3. APA 7th references (for the report)

OpenZeppelin. (2024). *OpenZeppelin Contracts* (Version 5.0.2) [Computer software]. https://github.com/OpenZeppelin/openzeppelin-contracts

Nomic Foundation. (2024). *Hardhat* (Version 2.22) [Computer software]. https://hardhat.org/

Vercel. (2024). *Next.js* (Version 14.2) [Computer software]. https://nextjs.org/

Wei, A., & Contributors. (2024). *wagmi* (Version 2.12) [Computer software]. https://wagmi.sh/

Wevm. (2024). *viem* (Version 2.21) [Computer software]. https://viem.sh/

MetaMask. (n.d.). *MetaMask* [Computer software]. https://metamask.io/

Ethereum Foundation. (n.d.). *Ethereum developer tutorials*. https://ethereum.org/developers/tutorials/

Ethereum Foundation. (n.d.). *Deploying your first smart contract*. https://ethereum.org/developers/tutorials/

Cyfrin. (n.d.). *Solidity smart contract development*. https://updraft.cyfrin.io/courses/solidity

Speed Run Ethereum. (n.d.). *Challenge: Multi-sig wallet*. https://speedrunethereum.com/

---

## 4. In-text citation examples (APA)

- We reuse OpenZeppelin’s `ReentrancyGuard` and `Pausable` modules rather than re-implementing them (OpenZeppelin, 2024).
- Contracts were compiled, tested, and deployed with Hardhat (Nomic Foundation, 2024).
- The optional dApp uses Next.js with wagmi/viem for wallet connectivity (Vercel, 2024; Wei & Contributors, 2024; Wevm, 2024).
- Development guidance was informed by ethereum.org tutorials (Ethereum Foundation, n.d.).

---

## 5. AI-assisted development disclosure

In accordance with the CDS528 academic-integrity requirements:

- Generative AI tools (including Cursor / large language models) were used to assist with drafting documentation, presentation materials, boilerplate configuration, and selected code suggestions during development.
- **All AI-assisted outputs were reviewed by the team** for correctness, security assumptions, and license compatibility before use.
- Core policy logic (tiered thresholds, cooldown/veto, Guardian pause) was designed and verified by the group; automated tests (`npm test`, 6 passing cases) and Sepolia deployment/verification were used as correctness checks.
- No third-party copyrighted material was pasted verbatim into the repository beyond properly attributed open-source dependencies listed above.

---

## 6. Suggested short paragraph for the report (English)

> This project uses OpenZeppelin Contracts (MIT) for `ReentrancyGuard` and `Pausable`, Hardhat for compilation/testing/deployment, and an optional Next.js frontend with wagmi/viem. All third-party components are cited in APA format below and are MIT-licensed (or otherwise compatible). Our own source code is released under the MIT License (see `LICENSE`). Where generative AI tools assisted with documentation or code suggestions, the team reviewed and validated all outputs before inclusion.
