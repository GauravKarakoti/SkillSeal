import { ethers } from "hardhat";

async function main() {
  console.log("Deploying SkillCredentialFactory...");
  
  const SkillCredentialFactory = await ethers.getContractFactory("SkillCredentialFactory");
  const factory = await SkillCredentialFactory.deploy();
  
  await factory.deployed();
  
  console.log("SkillCredentialFactory deployed to:", factory.address);
  
  // Create sample credential templates
  console.log("Creating credential templates...");
  await factory.createCredentialTemplate(
    "project_completion",
    "QmSampleSchemaHash...",
    0
  );
  
  await factory.createCredentialTemplate(
    "skill_assessment", 
    "QmAnotherSchemaHash...",
    0
  );
  
  console.log("Deployment completed!");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});