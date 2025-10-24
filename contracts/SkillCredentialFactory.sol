// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";
import "@openzeppelin/contracts/utils/Counters.sol";

contract SkillCredentialFactory is AccessControl {
    using Counters for Counters.Counter;
    
    bytes32 public constant ISSUER_ROLE = keccak256("ISSUER_ROLE");
    
    Counters.Counter private _credentialIdCounter;
    
    struct CredentialTemplate {
        string credentialType;
        string schema;
        address issuer;
        bool isActive;
        uint256 issuanceFee;
    }
    
    struct CredentialRecord {
        uint256 credentialId;
        address subject;
        string credentialType;
        bytes32 credentialHash;
        uint256 issuanceDate;
        address issuer;
        bool isRevoked;
    }
    
    mapping(string => CredentialTemplate) public credentialTemplates;
    mapping(uint256 => CredentialRecord) public credentialRecords;
    mapping(bytes32 => bool) public revokedCredentials;
    
    event CredentialTemplateCreated(string credentialType, address indexed issuer);
    event CredentialIssued(uint256 indexed credentialId, address indexed subject, string credentialType);
    event CredentialRevoked(uint256 indexed credentialId, address indexed revoker);
    
    constructor() {
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        _grantRole(ISSUER_ROLE, msg.sender);
    }
    
    function createCredentialTemplate(
        string memory _credentialType,
        string memory _schema,
        uint256 _issuanceFee
    ) external onlyRole(ISSUER_ROLE) {
        require(bytes(credentialTemplates[_credentialType].schema).length == 0, "Template already exists");
        
        credentialTemplates[_credentialType] = CredentialTemplate({
            credentialType: _credentialType,
            schema: _schema,
            issuer: msg.sender,
            isActive: true,
            issuanceFee: _issuanceFee
        });
        
        emit CredentialTemplateCreated(_credentialType, msg.sender);
    }
    
    function issueCredential(
        address _subject,
        string memory _credentialType,
        bytes32 _credentialHash
    ) external onlyRole(ISSUER_ROLE) returns (uint256) {
        CredentialTemplate memory template = credentialTemplates[_credentialType];
        require(template.isActive, "Credential template not active");
        
        _credentialIdCounter.increment();
        uint256 newCredentialId = _credentialIdCounter.current();
        
        credentialRecords[newCredentialId] = CredentialRecord({
            credentialId: newCredentialId,
            subject: _subject,
            credentialType: _credentialType,
            credentialHash: _credentialHash,
            issuanceDate: block.timestamp,
            issuer: msg.sender,
            isRevoked: false
        });
        
        emit CredentialIssued(newCredentialId, _subject, _credentialType);
        return newCredentialId;
    }
    
    function revokeCredential(uint256 _credentialId) external {
        CredentialRecord storage record = credentialRecords[_credentialId];
        require(
            record.issuer == msg.sender || hasRole(DEFAULT_ADMIN_ROLE, msg.sender),
            "Not authorized to revoke"
        );
        require(!record.isRevoked, "Credential already revoked");
        
        record.isRevoked = true;
        revokedCredentials[record.credentialHash] = true;
        
        emit CredentialRevoked(_credentialId, msg.sender);
    }
    
    function verifyCredential(uint256 _credentialId) external view returns (bool) {
        CredentialRecord memory record = credentialRecords[_credentialId];
        return record.issuer != address(0) && !record.isRevoked;
    }
    
    function getCredentialCount() external view returns (uint256) {
        return _credentialIdCounter.current();
    }
}