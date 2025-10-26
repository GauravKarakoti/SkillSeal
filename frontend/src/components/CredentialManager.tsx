import React, { useState } from 'react';
// FIX: Import the new hook
import { useAirKit } from '../hooks/useAirKit';

export const CredentialManager: React.FC = () => {
  // FIX: Use 'airService' from the hook. 'airCredential' no longer exists.
  const { userProfile, airService } = useAirKit();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  // This component logic is now updated to call the BACKEND API,
  // which is the pattern used in your 'ZKPGenerator.tsx' component.
  const issueSampleCredential = async () => {
    if (!userProfile) return;

    try {
      // Get auth token from the new airService
      const { token } = await airService.getAccessToken();
      
      const attributes = {
        projectId: 'proj_' + Date.now(),
        skills: ['react', 'typescript'],
        rating: 5,
        completionDate: new Date().toISOString()
      };

      // Call your backend API to issue the credential
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/credential/issue`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          credentialType: 'project_completion',
          attributes: attributes
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to issue credential from backend');
      }

      const credential = result.credential;
      setCredentials(prev => [...prev, credential]);
      return credential;

    } catch (error) {
      console.error('Failed to issue credential:', error);
    }
  };

  const generateZKP = async (credential: any, proofRequirements: any) => {
    if (!userProfile) return;
    setIsGeneratingProof(true);
    
    try {
      // Get auth token from the new airService
      const { token } = await airService.getAccessToken();

      // Call your backend API to generate the proof
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/zkp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          circuit: 'reputation_scoring', // Note: your ZKPGenerator uses 'reputation_scoring_v2'
          privateInputs: {
            // The backend API expects credentials, not just an ID
            credentials: [credential], 
            minimumRating: proofRequirements.minRating || 4
          },
          publicInputs: {
            proofType: 'skill_verification'
          }
        })
      });

      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to generate ZKP from backend');
      }

      return result.proof;

    } catch (error) {
      console.error('Failed to generate ZKP:', error);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  if (!userProfile) {
    return <div className='text-gray-800'>Please log in to manage credentials.</div>;
  }

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4 text-gray-800">Your Credentials</h2>
      
      <button
        onClick={issueSampleCredential}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
      >
        Issue Sample Credential (via API)
      </button>

      <div className="grid gap-4">
        {credentials.map((cred, index) => (
          <div key={index} className="border p-4 rounded">
            <h3 className="font-semibold">{cred.type}</h3>
            {/* The backend returns 'attributes', not 'issuanceDate' directly */}
            <p>Issued: {new Date(cred.attributes.issuanceDate).toLocaleDateString()}</p>
            <button
              onClick={() => generateZKP(cred, { minRating: 4 })}
              disabled={isGeneratingProof}
              className="bg-purple-500 text-white px-3 py-1 rounded mt-2"
            >
              {isGeneratingProof ? 'Generating...' : 'Generate ZKP (via API)'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};