import { DeployFunction } from "hardhat-deploy/types";
import { HardhatRuntimeEnvironment } from "hardhat/types";

const func: DeployFunction = async function (hre: HardhatRuntimeEnvironment) {
  const { deployer } = await hre.getNamedAccounts();
  const { deploy, execute } = hre.deployments;

  const czama = await deploy("ConfidentialZama", {
    from: deployer,
    args: [deployer],
    log: true,
  });

  const swap = await deploy("CZamaSwap", {
    from: deployer,
    args: [deployer, czama.address],
    log: true,
  });

  await execute(
    "ConfidentialZama",
    { from: deployer, log: true },
    "setMinter",
    swap.address,
    true,
  );

  console.log(`ConfidentialZama contract: ${czama.address}`);
  console.log(`CZamaSwap contract: ${swap.address}`);
};

export default func;
func.id = "deploy_czamaSwap";
func.tags = ["CZamaSwap"];

