import { expect } from "chai";
import { ethers } from "hardhat";

describe("SkillCredentialFactory", function () {
  let factory: any;
  let owner: any;
  let issuer: any;
  let user: any;

  beforeEach(async function () {
    [owner, issuer, user] = await ethers.getSigners();
    
    const SkillCredentialFactory = await ethers.getContractFactory("SkillCredentialFactory");
    factory = await SkillCredentialFactory.deploy();
    
    await factory.grantRole(await factory.ISSUER_ROLE(), issuer.address);
  });

  it("Should create credential template", async function () {
    await factory.connect(issuer).createCredentialTemplate(
      "project_completion",
      "QmSchemaHash...",
      0
    );
    
    const template = await factory.credentialTemplates("project_completion");
    expect(template.issuer).to.equal(issuer.address);
  });

  it("Should issue credential", async function () {
    await factory.connect(issuer).createCredentialTemplate(
      "project_completion", 
      "QmSchemaHash...",
      0
    );
    
    const credentialHash = ethers.keccak256(ethers.toUtf8Bytes("test credential"));
    await factory.connect(issuer).issueCredential(
      user.address,
      "project_completion",
      credentialHash
    );
    
    const credentialCount = await factory.getCredentialCount();
    expect(credentialCount).to.equal(1);
  });
});