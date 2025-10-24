import { ethers } from "hardhat";
import dotenv from "dotenv";
dotenv.config();

async function main() {
  console.log("Deploying SkillCredentialFactory...");
  
  const SkillCredentialFactory = await ethers.getContractFactory("SkillCredentialFactory");
  const factory = await SkillCredentialFactory.deploy();
  
  await factory.waitForDeployment();
  
  console.log("SkillCredentialFactory deployed to:", await factory.getAddress());
  
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