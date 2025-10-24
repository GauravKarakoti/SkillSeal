import React, { useState, useEffect } from 'react';
// FIX: Import 'airService' from the hook
import { useAirKit } from '../hooks/useAirKit';

interface ZKProofTemplate {
  id: string;
  name: string;
  description: string;
  circuit: string;
  requirements: {
    minCredentials?: number;
    requiredTypes?: string[];
    minReputation?: number;
  };
  inputs: {
    private: Array<{ key: string; label: string; type: string }>;
    public: Array<{ key: string; label: string; type: string }>;
  };
}

interface GeneratedProof {
  proofId: string;
  circuit: string;
  proofData: any;
  publicInputs: any;
  createdAt: string;
  verificationUrl?: string;
}

export const ZKPGenerator: React.FC = () => {
  // FIX: Use 'airService' from the hook. 'airCredential' no longer exists.
  const { userProfile, airService } = useAirKit();
  const [activeStep, setActiveStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<ZKProofTemplate | null>(null);
  const [privateInputs, setPrivateInputs] = useState<Record<string, any>>({});
  const [publicInputs, setPublicInputs] = useState<Record<string, any>>({});
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedProofs, setGeneratedProofs] = useState<GeneratedProof[]>([]);
  const [userCredentials, setUserCredentials] = useState<any[]>([]);

  // Available proof templates
  const proofTemplates: ZKProofTemplate[] = [
    {
      id: 'reputation_threshold',
      name: 'Reputation Threshold Proof',
      description: 'Prove your reputation meets a minimum threshold without revealing the exact score',
      circuit: 'reputation_scoring_v2',
      requirements: {
        minCredentials: 1,
        minReputation: 0
      },
      inputs: {
        private: [
          { key: 'minimumScore', label: 'Minimum Required Score', type: 'number' },
          { key: 'requiredSkills', label: 'Required Skills (comma separated)', type: 'text' }
        ],
        public: [
          { key: 'proofType', label: 'Proof Purpose', type: 'text' },
          { key: 'expiresAfter', label: 'Expiration Days', type: 'number' }
        ]
      }
    },
    {
      id: 'skill_verification',
      name: 'Skill Verification Proof',
      description: 'Prove you possess specific skills without revealing all your credentials',
      circuit: 'skill_verification_v2',
      requirements: {
        minCredentials: 1,
        requiredTypes: ['skill_assessment', 'project_completion']
      },
      inputs: {
        private: [
          { key: 'requiredSkillTypes', label: 'Required Skill Types', type: 'text' },
          { key: 'minimumExperience', label: 'Minimum Experience (months)', type: 'number' }
        ],
        public: [
          { key: 'verificationContext', label: 'Verification Context', type: 'text' },
          { key: 'audience', label: 'Intended Audience', type: 'text' }
        ]
      }
    },
    {
      id: 'identity_age',
      name: 'Identity Age Verification',
      description: 'Prove your identity meets age requirements without revealing your birth date',
      circuit: 'identity_proof_v2',
      requirements: {
        minCredentials: 1,
        requiredTypes: ['identity_verification']
      },
      inputs: {
        private: [
          { key: 'minimumAge', label: 'Minimum Age', type: 'number' },
          { key: 'countryCode', label: 'Country Code', type: 'text' }
        ],
        public: [
          { key: 'verificationPurpose', label: 'Purpose of Verification', type: 'text' }
        ]
      }
    },
    {
      id: 'project_completion',
      name: 'Project Completion Proof',
      description: 'Prove you have completed a certain number of projects with minimum ratings',
      circuit: 'project_history_v2',
      requirements: {
        minCredentials: 1,
        requiredTypes: ['project_completion']
      },
      inputs: {
        private: [
          { key: 'minimumProjects', label: 'Minimum Projects', type: 'number' },
          { key: 'minimumRating', label: 'Minimum Average Rating', type: 'number' },
          { key: 'requiredClientTypes', label: 'Required Client Types', type: 'text' }
        ],
        public: [
          { key: 'projectType', label: 'Project Type', type: 'text' },
          { key: 'timeframe', label: 'Timeframe (months)', type: 'number' }
        ]
      }
    }
  ];

  useEffect(() => {
    // Only fetch if logged in
    if (userProfile) {
      fetchUserCredentials();
      fetchRecentProofs();
    } else {
      // Clear data if logged out
      setUserCredentials([]);
      setGeneratedProofs([]);
    }
  }, [userProfile]); // Rerun when userProfile changes

  const fetchUserCredentials = async () => {
    if (!userProfile) return;
    
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();
      const response = await fetch('/api/credentials', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setUserCredentials(data.credentials || []);
      } else {
        console.error('API failed to fetch credentials:', data.error);
        setUserCredentials([]);
      }
    } catch (error) {
      console.error('Failed to fetch credentials:', error);
      setUserCredentials([]);
    }
  };

  const fetchRecentProofs = async () => {
    if (!userProfile) return;
    
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();
      const response = await fetch('/api/zkp/proofs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      if (data.success) {
        setGeneratedProofs(data.proofs || []);
      } else {
        console.error('API failed to fetch proofs:', data.error);
        setGeneratedProofs([]);
      }
    } catch (error) {
      console.error('Failed to fetch proofs:', error);
      setGeneratedProofs([]);
    }
  };

  const handleTemplateSelect = (template: ZKProofTemplate) => {
    setSelectedTemplate(template);
    setActiveStep(1);
    
    // Initialize inputs with default values
    const defaultPrivate: Record<string, any> = {};
    const defaultPublic: Record<string, any> = {};
    
    template.inputs.private.forEach(input => {
      defaultPrivate[input.key] = input.type === 'number' ? 0 : '';
    });
    
    template.inputs.public.forEach(input => {
      defaultPublic[input.key] = input.type === 'number' ? 0 : '';
    });
    
    setPrivateInputs(defaultPrivate);
    setPublicInputs(defaultPublic);
  };

  const handleInputChange = (inputType: 'private' | 'public', key: string, value: any) => {
    if (inputType === 'private') {
      setPrivateInputs(prev => ({ ...prev, [key]: value }));
    } else {
      setPublicInputs(prev => ({ ...prev, [key]: value }));
    }
  };

  // Memoize this function to avoid recalculating on every render
  const canGenerateProofForTemplate = React.useCallback((template: ZKProofTemplate | null) => {
    if (!template) return false;
    
    const { requirements } = template;
    
    if (requirements.minCredentials && userCredentials.length < requirements.minCredentials) {
      return false;
    }
    
    if (requirements.requiredTypes) {
      const hasRequiredTypes = requirements.requiredTypes.some(type =>
        userCredentials.some(cred => cred.type === type) // Check 'type', not 'credentialType' from backend
      );
      if (!hasRequiredTypes) return false;
    }
    
    // Add reputation check if needed (requires fetching reputation score)
    // if (requirements.minReputation && userReputation < requirements.minReputation) {
    //   return false;
    // }

    return true;
  }, [userCredentials]); // Dependency: userCredentials

  const generateProof = async () => {
    // Check template, profile, and ability to generate *before* proceeding
    if (!selectedTemplate || !userProfile || !canGenerateProofForTemplate(selectedTemplate)) return;
    
    setIsGenerating(true);
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();
      
      const response = await fetch('/api/airkit/zkp/generate', { // Correct API endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          circuit: selectedTemplate.circuit,
          privateInputs: {
            ...privateInputs,
            // Pass credentials as expected by the backend
             credentials: userCredentials.map(cred => ({
               id: cred.id, // Assuming 'id' is the property name
               type: cred.type,
               data: cred.attributes, // Assuming 'attributes' holds the data
               issuedAt: cred.issuedAt
             }))
          },
          publicInputs: {
            ...publicInputs,
            // FIX: Cast userProfile to 'any' to access '.address'
            subject: (userProfile as any).address,
            generationDate: new Date().toISOString()
          }
        })
      });

      const result = await response.json();
      
      if (result.success) {
        // Use the proof structure returned by the backend API
        const newProof: GeneratedProof = {
          proofId: result.proof.proofId,
          circuit: result.proof.circuit,
          proofData: result.proof.proofData,
          publicInputs: result.proof.publicInputs,
          createdAt: result.proof.generatedAt, // Use backend generated time
          verificationUrl: result.proof.verificationUrl
        };
        
        setGeneratedProofs(prev => [newProof, ...prev]);
        setActiveStep(2);
      } else {
        throw new Error(result.error || 'Failed to generate proof');
      }
    } catch (error) {
      console.error('Proof generation failed:', error);
      
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Proof generation failed: ${errorMessage}`);

    } finally {
      setIsGenerating(false);
    }
  };

  const resetGenerator = () => {
    setSelectedTemplate(null);
    setPrivateInputs({});
    setPublicInputs({});
    setActiveStep(0);
  };

  const copyProofToClipboard = (proof: GeneratedProof) => {
    const proofData = JSON.stringify({
      proofId: proof.proofId,
      circuit: proof.circuit,
      publicInputs: proof.publicInputs,
      verificationUrl: proof.verificationUrl
    }, null, 2);
    
    navigator.clipboard.writeText(proofData);
    alert('Proof data copied to clipboard!');
  };

  const downloadProof = (proof: GeneratedProof) => {
    const proofData = JSON.stringify({
      proofId: proof.proofId,
      circuit: proof.circuit,
      publicInputs: proof.publicInputs,
      verificationUrl: proof.verificationUrl,
      generationDate: proof.createdAt
    }, null, 2);
    
    const blob = new Blob([proofData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `proof-${proof.proofId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <div className="zkp-generator">
      <div className="card">
        <h2 className="card-header">Zero-Knowledge Proof Generator</h2>
        
        {/* Step 1: Template Selection */}
        {activeStep === 0 && (
          <div className="template-selection">
            <p className="text-secondary mb-6">
              Select a proof template to generate zero-knowledge proofs that verify your credentials 
              without revealing sensitive information.
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {proofTemplates.map(template => {
                const canGenerate = canGenerateProofForTemplate(template); // Check eligibility here
                return (
                  <div
                    key={template.id}
                    className={`zkp-option ${canGenerate ? 'cursor-pointer hover:border-blue-500' : 'opacity-50 cursor-not-allowed'}`}
                    onClick={() => canGenerate && handleTemplateSelect(template)}
                  >
                    <h3 className="font-semibold text-lg mb-2">{template.name}</h3>
                    <p className="text-sm text-secondary mb-3">{template.description}</p>
                    
                    <div className="requirements">
                      <span className="text-xs font-medium text-primary">Requirements:</span>
                      <ul className="text-xs text-secondary mt-1 space-y-1">
                        {template.requirements.minCredentials && (
                          <li>• Minimum {template.requirements.minCredentials} credential(s)</li>
                        )}
                        {template.requirements.requiredTypes && (
                          <li>• Needs: {template.requirements.requiredTypes.join(', ')}</li>
                        )}
                        {template.requirements.minReputation && (
                          <li>• Minimum {template.requirements.minReputation} reputation</li>
                        )}
                      </ul>
                    </div>
                    
                    {!canGenerate && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                        You don't meet the requirements for this proof template.
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Step 2: Input Configuration */}
        {activeStep === 1 && selectedTemplate && (
          <div className="input-configuration">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-semibold">{selectedTemplate.name}</h3>
              <button 
                onClick={resetGenerator}
                className="btn btn-secondary"
              >
                Choose Different Template
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Private Inputs */}
              <div>
                <h4 className="font-semibold mb-4 text-primary">Private Inputs</h4>
                <p className="text-sm text-secondary mb-4">
                  These inputs will be kept private and won't be revealed in the proof.
                </p>
                
                <div className="space-y-4">
                  {selectedTemplate.inputs.private.map(input => (
                    <div key={input.key} className="form-group">
                      <label className="form-label">{input.label}</label>
                      {input.type === 'number' ? (
                        <input
                          type="number"
                          value={privateInputs[input.key] ?? ''} // Use nullish coalescing for default empty string
                          onChange={(e) => handleInputChange('private', input.key, e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="form-input"
                          min="0"
                        />
                      ) : (
                        <input
                          type="text"
                          value={privateInputs[input.key] ?? ''}
                          onChange={(e) => handleInputChange('private', input.key, e.target.value)}
                          className="form-input"
                          placeholder={`Enter ${input.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Public Inputs */}
              <div>
                <h4 className="font-semibold mb-4 text-success">Public Inputs</h4>
                <p className="text-sm text-secondary mb-4">
                  These inputs will be included in the proof and can be verified by anyone.
                </p>
                
                <div className="space-y-4">
                  {selectedTemplate.inputs.public.map(input => (
                    <div key={input.key} className="form-group">
                      <label className="form-label">{input.label}</label>
                      {input.type === 'number' ? (
                        <input
                          type="number"
                          value={publicInputs[input.key] ?? ''}
                          onChange={(e) => handleInputChange('public', input.key, e.target.value === '' ? '' : parseInt(e.target.value))}
                          className="form-input"
                          min="0"
                        />
                      ) : (
                        <input
                          type="text"
                          value={publicInputs[input.key] ?? ''}
                          onChange={(e) => handleInputChange('public', input.key, e.target.value)}
                          className="form-input"
                          placeholder={`Enter ${input.label.toLowerCase()}`}
                        />
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-8 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h5 className="font-semibold text-blue-800 mb-2">Proof Statement</h5>
              <p className="text-sm text-blue-700">
                This proof will verify that you meet the specified criteria without revealing your actual credentials or scores.
              </p>
            </div>

            <div className="mt-6 flex justify-end space-x-4">
              <button onClick={resetGenerator} className="btn btn-secondary">
                Cancel
              </button>
              <button 
                onClick={generateProof}
                // Disable if generating or if requirements not met
                disabled={isGenerating || !canGenerateProofForTemplate(selectedTemplate)} 
                className="btn btn-primary"
              >
                {isGenerating ? (
                  <>
                    <div className="spinner mr-2"></div>
                    Generating Proof...
                  </>
                ) : (
                  'Generate Zero-Knowledge Proof'
                )}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Proof Generated */}
        {activeStep === 2 && generatedProofs.length > 0 && (
          <div className="proof-generated">
            <div className="text-center mb-6">
              <div className="text-4xl mb-4">🎉</div>
              <h3 className="text-2xl font-bold text-success mb-2">Proof Generated Successfully!</h3>
              <p className="text-secondary">
                Your zero-knowledge proof has been generated and is ready to use.
              </p>
            </div>

            <div className="card bg-green-50 border border-green-200 mb-6">
              <div className="flex justify-between items-start">
                <div>
                  <h4 className="font-semibold text-green-800 mb-2">Proof Details</h4>
                  <div className="space-y-1 text-sm text-green-700">
                    <div><strong>Proof ID:</strong> {generatedProofs[0].proofId}</div>
                    <div><strong>Circuit:</strong> {generatedProofs[0].circuit}</div>
                    <div><strong>Generated:</strong> {new Date(generatedProofs[0].createdAt).toLocaleString()}</div>
                    {generatedProofs[0].verificationUrl && (
                      <div>
                        <strong>Verification URL:</strong>{' '}
                        <a 
                          href={generatedProofs[0].verificationUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="underline"
                        >
                          Click to verify
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <button 
                    onClick={() => copyProofToClipboard(generatedProofs[0])}
                    className="btn btn-secondary text-sm"
                  >
                    Copy Proof
                  </button>
                  <button 
                    onClick={() => downloadProof(generatedProofs[0])}
                    className="btn btn-primary text-sm"
                  >
                    Download
                  </button>
                </div>
              </div>
            </div>

            <div className="flex justify-center space-x-4">
              <button 
                onClick={resetGenerator}
                className="btn btn-primary"
              >
                Generate Another Proof
              </button>
              <button 
                onClick={() => setActiveStep(0)}
                className="btn btn-secondary"
              >
                View All Templates
              </button>
            </div>
          </div>
        )}

        {/* Recent Proofs Section */}
        {generatedProofs.length > 0 && activeStep !== 2 && (
          <div className="mt-8">
            <h3 className="text-lg font-semibold mb-4">Recent Proofs</h3>
            <div className="space-y-3">
              {generatedProofs.slice(0, 5).map((proof, index) => (
                <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                  <div>
                    <div className="font-medium">{proof.circuit}</div>
                    <div className="text-sm text-secondary">
                      {proof.proofId} • {new Date(proof.createdAt).toLocaleDateString()}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button 
                      onClick={() => copyProofToClipboard(proof)}
                      className="btn btn-secondary text-sm"
                    >
                      Copy
                    </button>
                    <button 
                      onClick={() => downloadProof(proof)}
                      className="btn btn-primary text-sm"
                    >
                      Download
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};