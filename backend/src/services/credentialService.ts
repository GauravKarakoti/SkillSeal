import axios from 'axios';

// This is a LIKELY endpoint. You MUST find the correct URL
// in the Moca Network developer documentation.
const MOCA_API_BASE_URL = 'https://api.moca.network'; // Or similar

export class CredentialService {
  private apiKey: string;
  private issuerDid: string;
  private issuerPrivateKey: string;

  constructor() {
    this.apiKey = process.env.AIR_CREDENTIAL_API_KEY!;
    this.issuerDid = process.env.ISSUER_DID!;
    this.issuerPrivateKey = process.env.ISSUER_PRIVATE_KEY!; // May be used to sign a request, or may not be needed if API key is enough.
  }

  /**
   * Issues a new credential via the Moca REST API.
   */
  async issueCredential(credentialData: any) {
    // This is an example structure. Refer to the Moca API docs.
    const payload = {
      type: credentialData.type,
      subject: credentialData.subject,
      issuer: this.issuerDid, // Your issuer DID
      attributes: credentialData.attributes,
      expiration: credentialData.expiration,
      // The API may handle privacy/ZK settings automatically
    };

    try {
      const response = await axios.post(
        `${MOCA_API_BASE_URL}/v1/credentials/issue`, // This URL is a GUESS
        payload,
        {
          headers: {
            // Use the API key for authentication
            'Authorization': `Bearer ${this.apiKey}`,
            'Content-Type': 'application/json'
          }
        }
      );
      
      // Return the API response (which should contain the issued credential)
      return response.data;

    } catch (error) {
      // --- FIX for 'unknown' error type ---
      if (axios.isAxiosError(error)) {
        // This is an error from Axios
        console.error("Error issuing credential (Axios):", error.response?.data || error.message);
      } else if (error instanceof Error) {
        // This is a standard JavaScript error
        console.error("Error issuing credential (General):", error.message);
      } else {
        // This is an unknown error type
        console.error("An unknown error occurred:", error);
      }
      // --- End of fix ---
      
      throw new Error("Failed to issue credential.");
    }
  }

  // Verification might also be an API call, or it might be done
  // using the FRONTEND airkit SDK. You will need to check the docs.
  async verifyCredential(credential: any, proof?: any) {
    // ... logic to call the Moca /verify endpoint ...
    console.warn("Verification logic needs to be implemented via REST API.");
    return true; 
  }

  // ZK Proof generation is almost certainly a CLIENT-SIDE (frontend)
  // operation, as it requires the user's private credentials.
  // This function should probably be removed from the backend.
  async generateReputationProof(credentials: any[], requirements: any) {
    throw new Error(
      "ZK Proof generation is a client-side (frontend) task and should not be on the backend."
    );
  }
}

export const credentialService = new CredentialService();