# SkillSeal REST API Documentation

## Base URL
[https://api.skillseal.com/v1](https://api.skillseal.com/v1)

## Authentication
All endpoints require AIR Account authentication. Include the token in the Authorization header:

```http
Authorization: Bearer <air_account_token>
```

## Endpoints
### Authentication
- `POST /api/auth/login` - Login with AIR Account
- `POST /api/auth/logout` - Logout user
- `GET /api/auth/profile` - Get user profile

### Credentials
- POST /api/credentials/issue - Issue a new credential
- `GET /api/credentials` - Get user's credentials
- `GET /api/credentials/:id` - Get specific credential
- `POST /api/credentials/verify` - Verify a credential
- `DELETE /api/credentials/:id` - Revoke a credential

### Zero-Knowledge Proofs
- `POST /api/zkp/generate` - Generate ZKP
- `POST /api/zkp/verify` - Verify ZKP
- `GET /api/zkp/proofs` - Get user's proofs

### Reputation
- `GET /api/reputation/score` - Get reputation score
- `GET /api/reputation/tier` - Get current tier
- `POST /api/reputation/calculate` - Recalculate reputation

## Example Requests
### Issue Credential
```bash
curl -X POST https://api.skillseal.com/v1/credentials/issue \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "credentialType": "project_completion",
    "attributes": {
      "projectName": "E-commerce Platform",
      "skills": ["React", "Node.js"],
      "rating": 5
    }
  }'
```

### Generate ZKP
```bash
curl -X POST https://api.skillseal.com/v1/zkp/generate \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "circuit": "reputation_scoring",
    "privateInputs": {
      "minimumScore": 70
    },
    "publicInputs": {
      "proofType": "reputation_verification"
    }
  }'
```

### Error Responses
All errors follow this format:
```json
{
  "error": "Error message",
  "code": "ERROR_CODE",
  "details": {}
}
```

### Rate Limiting
- Authentication: 5 requests per 15 minutes
- API endpoints: 60 requests per minute
- ZKP generation: 10 requests per 5 minutes