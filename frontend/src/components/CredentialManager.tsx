import React, { useState } from 'react';
import { useAirKit } from '../hooks/useAirKit';

export const CredentialManager: React.FC = () => {
  const { userProfile, airCredential } = useAirKit();
  const [credentials, setCredentials] = useState<any[]>([]);
  const [isGeneratingProof, setIsGeneratingProof] = useState(false);

  const issueSampleCredential = async () => {
    try {
      const credential = await airCredential.issue({
        type: 'project_completion',
        subject: userProfile.address,
        attributes: {
          projectId: 'proj_' + Date.now(),
          skills: ['react', 'typescript'],
          rating: 5,
          completionDate: new Date().toISOString()
        },
        privacyLevel: 'zk_proof_only'
      });
      
      setCredentials(prev => [...prev, credential]);
      return credential;
    } catch (error) {
      console.error('Failed to issue credential:', error);
    }
  };

  const generateZKP = async (credentialId: string, proofRequirements: any) => {
    setIsGeneratingProof(true);
    try {
      const proof = await airCredential.generateZKProof({
        circuit: 'reputation_scoring',
        privateInputs: {
          credentialId,
          minimumRating: proofRequirements.minRating || 4
        },
        publicInputs: {
          proofType: 'skill_verification'
        }
      });
      
      return proof;
    } catch (error) {
      console.error('Failed to generate ZKP:', error);
    } finally {
      setIsGeneratingProof(false);
    }
  };

  return (
    <div className="p-6">
      <h2 className="text-xl font-bold mb-4">Your Credentials</h2>
      
      <button
        onClick={issueSampleCredential}
        className="bg-green-500 text-white px-4 py-2 rounded mb-4"
      >
        Issue Sample Credential
      </button>

      <div className="grid gap-4">
        {credentials.map((cred, index) => (
          <div key={index} className="border p-4 rounded">
            <h3 className="font-semibold">{cred.type}</h3>
            <p>Issued: {new Date(cred.issuanceDate).toLocaleDateString()}</p>
            <button
              onClick={() => generateZKP(cred.id, { minRating: 4 })}
              disabled={isGeneratingProof}
              className="bg-purple-500 text-white px-3 py-1 rounded mt-2"
            >
              {isGeneratingProof ? 'Generating...' : 'Generate ZKP'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};