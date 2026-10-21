const { expect } = require("chai");
const { ethers } = require("hardhat");
const { time } = require("@nomicfoundation/hardhat-network-helpers");

describe("TieredMultisigWallet", function () {
  let wallet, owner1, owner2, owner3, outsider, recipient;
  const smallThreshold = 2n;
  const largeThreshold = 3n;
  const largeAmount = ethers.parseEther("0.1");
  const cooldown = 120n;

  beforeEach(async function () {
    [owner1, owner2, owner3, outsider, recipient] = await ethers.getSigners();
    const Factory = await ethers.getContractFactory("TieredMultisigWallet");
    wallet = await Factory.deploy(
      [owner1.address, owner2.address, owner3.address],
      smallThreshold,
      largeThreshold,
      largeAmount,
      cooldown,
      [owner1.address]
    );
    await wallet.waitForDeployment();

    await owner1.sendTransaction({
      to: await wallet.getAddress(),
      value: ethers.parseEther("1"),
    });
  });

  it("accepts deposits", async function () {
    expect(await ethers.provider.getBalance(await wallet.getAddress())).to.equal(
      ethers.parseEther("1")
    );
  });

  it("executes small transfers after smallThreshold confirmations (no cooldown)", async function () {
    const value = ethers.parseEther("0.05");
    await wallet.connect(owner1).submitTransaction(recipient.address, value, "0x");
    await wallet.connect(owner1).confirmTransaction(0);
    await wallet.connect(owner2).confirmTransaction(0);

    const before = await ethers.provider.getBalance(recipient.address);
    await wallet.connect(owner1).executeTransaction(0);
    const after = await ethers.provider.getBalance(recipient.address);
    expect(after - before).to.equal(value);
  });

  it("requires largeThreshold and cooldown for large transfers", async function () {
    const value = ethers.parseEther("0.2");
    await wallet.connect(owner1).submitTransaction(recipient.address, value, "0x");
    await wallet.connect(owner1).confirmTransaction(0);
    await wallet.connect(owner2).confirmTransaction(0);

    await expect(wallet.connect(owner1).executeTransaction(0)).to.be.reverted;

    await wallet.connect(owner3).confirmTransaction(0);
    await expect(wallet.connect(owner1).executeTransaction(0)).to.be.revertedWithCustomError(
      wallet,
      "CooldownNotElapsed"
    );

    await time.increase(cooldown + 1n);
    const before = await ethers.provider.getBalance(recipient.address);
    await wallet.connect(owner1).executeTransaction(0);
    const after = await ethers.provider.getBalance(recipient.address);
    expect(after - before).to.equal(value);
  });

  it("allows veto during cooldown on large txs", async function () {
    const value = ethers.parseEther("0.2");
    await wallet.connect(owner1).submitTransaction(recipient.address, value, "0x");
    await wallet.connect(owner1).confirmTransaction(0);
    await wallet.connect(owner2).confirmTransaction(0);
    await wallet.connect(owner3).confirmTransaction(0);

    await wallet.connect(owner2).vetoTransaction(0);
    await time.increase(cooldown + 1n);
    await expect(wallet.connect(owner1).executeTransaction(0)).to.be.revertedWithCustomError(
      wallet,
      "AlreadyVetoed"
    );
  });

  it("guardian can pause; owners unpause with largeThreshold votes", async function () {
    await wallet.connect(owner1).pause();
    expect(await wallet.paused()).to.equal(true);

    await expect(
      wallet.connect(owner1).submitTransaction(recipient.address, 1n, "0x")
    ).to.be.revertedWithCustomError(wallet, "EnforcedPause");

    await wallet.connect(owner1).voteToUnpause();
    await wallet.connect(owner2).voteToUnpause();
    expect(await wallet.paused()).to.equal(true);
    await wallet.connect(owner3).voteToUnpause();
    expect(await wallet.paused()).to.equal(false);
  });

  it("rejects non-owner actions", async function () {
    await expect(
      wallet.connect(outsider).submitTransaction(recipient.address, 1n, "0x")
    ).to.be.revertedWithCustomError(wallet, "NotOwner");
  });
});
