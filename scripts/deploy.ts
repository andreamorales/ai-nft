import { ethers } from "hardhat";

async function main() {
  const AINFT = await ethers.getContractFactory("AINFT");
  const ainft = await AINFT.deploy();
  await ainft.waitForDeployment();

  console.log("AINFT deployed to:", await ainft.getAddress());
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
}); 