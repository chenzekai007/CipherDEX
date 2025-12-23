import { task } from "hardhat/config";
import type { TaskArguments } from "hardhat/types";
import { parseEther } from "ethers";
import { FhevmType } from "@fhevm/hardhat-plugin";

task("task:czama:addresses", "Prints the ConfidentialZama and CZamaSwap addresses").setAction(
  async function (_taskArguments: TaskArguments, hre) {
    const { deployments } = hre;

    const czama = await deployments.get("ConfidentialZama");
    const swap = await deployments.get("CZamaSwap");

    console.log("ConfidentialZama address is " + czama.address);
    console.log("CZamaSwap address is " + swap.address);
  },
);

task("task:czama:decrypt-balance", "Decrypts ConfidentialZama balance for the active signer")
  .addOptionalParam("user", "Optionally specify a user address (defaults to the first signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();
    const signer = signers[0];
    const user = (taskArguments.user as string | undefined) || signer.address;

    const czamaDeployment = await deployments.get("ConfidentialZama");
    const czama = await ethers.getContractAt("ConfidentialZama", czamaDeployment.address);

    const encryptedBalance = await czama.confidentialBalanceOf(user);
    if (encryptedBalance === ethers.ZeroHash) {
      console.log(`Encrypted balance: ${encryptedBalance}`);
      console.log(`Clear balance    : 0`);
      return;
    }

    const clearBalance = await fhevm.userDecryptEuint(
      FhevmType.euint64,
      encryptedBalance,
      czamaDeployment.address,
      signer,
    );

    console.log(`User             : ${user}`);
    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Clear balance    : ${clearBalance}`);
  });

task("task:swap", "Swaps ETH for cZama at 1 ETH = 1000 cZama")
  .addParam("eth", "ETH amount, e.g. 0.1")
  .addOptionalParam("recipient", "Recipient address (defaults to signer)")
  .setAction(async function (taskArguments: TaskArguments, hre) {
    const { ethers, deployments, fhevm } = hre;

    await fhevm.initializeCLIApi();

    const signers = await ethers.getSigners();
    const signer = signers[0];
    const recipient = (taskArguments.recipient as string | undefined) || signer.address;

    const swapDeployment = await deployments.get("CZamaSwap");
    const czamaDeployment = await deployments.get("ConfidentialZama");
    const swap = await ethers.getContractAt("CZamaSwap", swapDeployment.address);
    const czama = await ethers.getContractAt("ConfidentialZama", czamaDeployment.address);

    const valueWei = parseEther(taskArguments.eth as string);

    const tx =
      recipient.toLowerCase() === signer.address.toLowerCase()
        ? await swap.connect(signer)["swap()"]({ value: valueWei })
        : await swap.connect(signer)["swap(address)"](recipient, { value: valueWei });

    console.log(`Wait for tx:${tx.hash}...`);
    const receipt = await tx.wait();
    console.log(`tx:${tx.hash} status=${receipt?.status}`);

    const encryptedBalance = await czama.confidentialBalanceOf(recipient);
    const clearBalance =
      encryptedBalance === ethers.ZeroHash
        ? 0n
        : await fhevm.userDecryptEuint(FhevmType.euint64, encryptedBalance, czamaDeployment.address, signer);

    console.log(`Recipient        : ${recipient}`);
    console.log(`Encrypted balance: ${encryptedBalance}`);
    console.log(`Clear balance    : ${clearBalance}`);
  });

