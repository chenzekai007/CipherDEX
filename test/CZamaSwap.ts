import { HardhatEthersSigner } from "@nomicfoundation/hardhat-ethers/signers";
import { expect } from "chai";
import { ethers, fhevm } from "hardhat";
import { FhevmType } from "@fhevm/hardhat-plugin";

import { ConfidentialZama, ConfidentialZama__factory, CZamaSwap, CZamaSwap__factory } from "../types";

type Signers = {
  deployer: HardhatEthersSigner;
  alice: HardhatEthersSigner;
  bob: HardhatEthersSigner;
};

async function deployFixture(deployer: HardhatEthersSigner) {
  const czamaFactory = (await ethers.getContractFactory("ConfidentialZama")) as ConfidentialZama__factory;
  const czama = (await czamaFactory.deploy(deployer.address)) as ConfidentialZama;
  const czamaAddress = await czama.getAddress();

  const swapFactory = (await ethers.getContractFactory("CZamaSwap")) as CZamaSwap__factory;
  const swap = (await swapFactory.deploy(deployer.address, czamaAddress)) as CZamaSwap;
  const swapAddress = await swap.getAddress();

  await (await czama.connect(deployer).setMinter(swapAddress, true)).wait();

  return { czama, czamaAddress, swap, swapAddress };
}

describe("CZamaSwap", function () {
  let signers: Signers;
  let czama: ConfidentialZama;
  let czamaAddress: string;
  let swap: CZamaSwap;

  before(async function () {
    const ethSigners: HardhatEthersSigner[] = await ethers.getSigners();
    signers = { deployer: ethSigners[0], alice: ethSigners[1], bob: ethSigners[2] };
  });

  beforeEach(async function () {
    if (!fhevm.isMock) {
      console.warn(`This hardhat test suite cannot run on Sepolia Testnet`);
      this.skip();
    }

    ({ czama, czamaAddress, swap } = await deployFixture(signers.deployer));
  });

  it("quotes 1 ETH -> 1000 cZama", async function () {
    const outUnits = await swap.quote(ethers.parseEther("1"));
    expect(outUnits).to.eq(1000n * 10n ** 6n);
  });

  it("swaps 1 ETH for 1000 cZama", async function () {
    const tx = await swap.connect(signers.alice)["swap()"]({ value: ethers.parseEther("1") });
    await tx.wait();

    const encryptedBalance = await czama.confidentialBalanceOf(signers.alice.address);
    expect(encryptedBalance).to.not.eq(ethers.ZeroHash);

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      czamaAddress,
      signers.alice,
    );

    expect(clearBalance).to.eq(1000n * 10n ** 6n);
  });

  it("reverts on zero output", async function () {
    await expect(swap.connect(signers.alice)["swap()"]({ value: 0n })).to.be.revertedWithCustomError(
      swap,
      "CZamaSwapZeroOutput",
    );
  });

  it("only owner can withdraw ETH", async function () {
    await (await swap.connect(signers.alice)["swap()"]({ value: ethers.parseEther("0.5") })).wait();
    expect(await ethers.provider.getBalance(await swap.getAddress())).to.eq(ethers.parseEther("0.5"));

    await expect(
      swap.connect(signers.bob).withdrawETH(signers.bob.address, ethers.parseEther("0.1")),
    ).to.be.reverted;

    await (await swap.connect(signers.deployer).withdrawETH(signers.deployer.address, ethers.parseEther("0.1"))).wait();
    expect(await ethers.provider.getBalance(await swap.getAddress())).to.eq(ethers.parseEther("0.4"));
  });
});

