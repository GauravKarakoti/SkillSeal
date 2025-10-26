import React, { useState, useEffect } from 'react';
// FIX: Import 'airService' from the hook
import { useAirKit } from '../hooks/useAirKit';

interface ReputationScore {
  overallScore: number;
  skillDiversity: number;
  completionRate: number;
  clientSatisfaction: number;
  lastCalculated: string;
}

interface ReputationTier {
  level: 'BASIC' | 'VERIFIED' | 'PREMIUM';
  minScore: number;
  benefits: string[];
  stakingRequired: number;
}

interface CredentialImpact {
  type: string;
  count: number;
  averageImpact: number;
}

export const ReputationDashboard: React.FC = () => {
  // FIX: Destructure 'airService' from the hook
  const { userProfile, airService } = useAirKit();
  const [reputation, setReputation] = useState<ReputationScore | null>(null);
  const [currentTier, setCurrentTier] = useState<ReputationTier | null>(null);
  const [credentialImpacts, setCredentialImpacts] = useState<CredentialImpact[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'analysis'>('overview');
  const [isGeneratingProof, setIsGeneratingProof] = useState(false); // Add state for proof generation

  const reputationTiers: ReputationTier[] = [
    {
      level: 'BASIC',
      minScore: 0,
      benefits: ['Profile Visibility', 'Basic ZKP Generation', 'Standard Access'],
      stakingRequired: 0
    },
    {
      level: 'VERIFIED',
      minScore: 70,
      benefits: ['Priority Listing', 'Advanced ZKP Circuits', 'Enhanced Visibility', 'Staking Rewards'],
      stakingRequired: 100
    },
    {
      level: 'PREMIUM', 
      minScore: 85,
      benefits: ['Top Tier Access', 'Premium ZKP Features', 'Direct Client Matching', 'Insurance Coverage'],
      stakingRequired: 500
    }
  ];

  useEffect(() => {
    if (userProfile) {
      fetchReputationData();
      fetchCredentialImpacts();
    } else {
      // Clear data if logged out
      setReputation(null);
      setCurrentTier(null);
      setCredentialImpacts([]);
      setIsLoading(false);
    }
  }, [userProfile, airService]); // Add airService dependency

  const fetchReputationData = async () => {
    setIsLoading(true);
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/reputation/score`, { // Assuming this endpoint exists
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setReputation(data.score);
        determineTier(data.score.overallScore);
      } else {
        console.error("API failed to fetch reputation:", data.error);
        setReputation(null);
        determineTier(0); // Set to basic tier on error
      }
    } catch (error) {
      console.error('Failed to fetch reputation data:', error);
      setReputation(null);
      determineTier(0); // Set to basic tier on error
    } finally {
      setIsLoading(false);
    }
  };

  const fetchCredentialImpacts = async () => {
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();
      const response = await fetch('/api/reputation/credential-impacts', { // Assuming this endpoint exists
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await response.json();
      
      if (data.success) {
        setCredentialImpacts(data.impacts);
      } else {
         console.error("API failed to fetch impacts:", data.error);
         setCredentialImpacts([]);
      }
    } catch (error) {
      console.error('Failed to fetch credential impacts:', error);
      setCredentialImpacts([]);
    }
  };

  const determineTier = (score: number) => {
    const tier = [...reputationTiers]
      .reverse()
      .find(t => score >= t.minScore) || reputationTiers[0];
    setCurrentTier(tier);
  };

  const getTierProgress = () => {
    if (!reputation || !currentTier) return 0;
    
    // Find the next tier's min score, default to 100 if already highest
    const nextTierIndex = reputationTiers.findIndex(t => t.level === currentTier.level) + 1;
    const nextTierMinScore = nextTierIndex < reputationTiers.length 
                             ? reputationTiers[nextTierIndex].minScore 
                             : 100; 
    const currentTierMinScore = currentTier.minScore;

    // Avoid division by zero if current and next tier min scores are the same
    if (nextTierMinScore <= currentTierMinScore) return 100; 

    const progress = ((reputation.overallScore - currentTierMinScore) / (nextTierMinScore - currentTierMinScore)) * 100;
    
    // Ensure progress is between 0 and 100
    return Math.max(0, Math.min(100, progress));
  };


  const getTierColor = (level?: string) => { // Made level optional
    switch (level) {
      case 'PREMIUM': return 'from-purple-500 to-pink-500';
      case 'VERIFIED': return 'from-blue-500 to-teal-500';
      default: return 'from-gray-400 to-gray-600';
    }
  };

  const generateReputationProof = async () => {
    if (!userProfile || !currentTier) return; // Need current tier for minScore
    
    setIsGeneratingProof(true); // Indicate loading
    try {
      // FIX: Get token from airService
      const { token } = await airService.getAccessToken();

      // Call the backend ZKP generation endpoint
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/zkp/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          circuit: 'reputation_scoring_v2', // Match backend expected circuit
          privateInputs: {
            minimumScore: currentTier.minScore, // Use the min score for the current tier
            // You might need to fetch user credentials here if the backend expects them
            // credentials: [...] 
          },
          publicInputs: {
            proofType: 'reputation_verification',
            tierLevel: currentTier.level, // Include the tier level in public inputs
            generationDate: new Date().toISOString()
            // subject: (userProfile as any).address // Backend adds subject automatically
          }
        })
      });

      const result = await response.json();

      if (result.success) {
        console.log('Reputation proof generated via API:', result.proof);
        alert('Reputation proof generated successfully! Check console for details.');
        // Optionally store or display the proof details (result.proof)
      } else {
        throw new Error(result.error || 'Backend failed to generate proof');
      }

    } catch (error) {
      console.error('Failed to generate reputation proof:', error);
      let errorMessage = 'An unknown error occurred';
      if (error instanceof Error) {
        errorMessage = error.message;
      }
      alert(`Failed to generate reputation proof: ${errorMessage}`);
    } finally {
      setIsGeneratingProof(false); // Stop loading
    }
  };


  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="text-center">
          <div className="spinner w-12 h-12 border-t-4 border-blue-500 border-solid rounded-full animate-spin mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading reputation data...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="reputation-dashboard p-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">Reputation Dashboard</h1>
        <p className="text-gray-600">
          Your professional reputation score and credential impact analysis powered by Moca Network
        </p>
      </div>

      {/* Main Reputation Score Card */}
      <div className="card mb-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-center">
          <div className="text-center lg:col-span-1">
            {/* Display Score */}
            <div className={`text-6xl font-bold mb-2 bg-clip-text text-transparent bg-gradient-to-r ${getTierColor(currentTier?.level)}`}>
              {reputation?.overallScore ?? '--'}
            </div>
            {/* Display Tier */}
            <div className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${
              currentTier?.level === 'PREMIUM' ? 'bg-purple-100 text-purple-800' :
              currentTier?.level === 'VERIFIED' ? 'bg-blue-100 text-blue-800' :
              'bg-gray-100 text-gray-800'
            }`}>
              {currentTier?.level || 'N/A'} Tier
            </div>
            {/* Progress Bar */}
             <div className="mt-4 px-4">
              <div className="text-sm text-gray-500 mb-1 text-left">
                Progress to next tier
              </div>
              <div className="w-full bg-gray-200 rounded-full h-2.5">
                <div 
                  className={`bg-gradient-to-r ${getTierColor(currentTier?.level)} h-2.5 rounded-full transition-all duration-500`} 
                  style={{ width: `${getTierProgress()}%` }}
                ></div>
              </div>
            </div>
          </div>
          
          {/* Breakdown Section */}
          <div className="lg:col-span-2">
            <h3 className="font-semibold mb-4 text-gray-700">Reputation Breakdown</h3>
            <div className="space-y-4">
              {/* Skill Diversity */}
              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Skill Diversity</span>
                  <span className="font-medium">{reputation?.skillDiversity ?? '--'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-green-500 h-2 rounded-full" 
                    style={{ width: `${reputation?.skillDiversity || 0}%` }}
                  ></div>
                </div>
              </div>
              {/* Completion Rate */}
              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Completion Rate</span>
                  <span className="font-medium">{reputation?.completionRate ?? '--'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${reputation?.completionRate || 0}%` }}
                  ></div>
                </div>
              </div>
              {/* Client Satisfaction */}
              <div>
                <div className="flex justify-between text-sm mb-1 text-gray-600">
                  <span>Client Satisfaction</span>
                  <span className="font-medium">{reputation?.clientSatisfaction ?? '--'}%</span>
                </div>
                <div className="w-full bg-gray-200 rounded-full h-2">
                  <div 
                    className="bg-yellow-500 h-2 rounded-full" 
                    style={{ width: `${reputation?.clientSatisfaction || 0}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>


      {/* Navigation Tabs */}
      <div className="card mb-6">
        <div className="flex border-b border-gray-200">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'credentials'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('credentials')}
          >
            Credential Impact
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'analysis'
                ? 'border-b-2 border-blue-500 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
            onClick={() => setActiveTab('analysis')}
          >
            Advanced Analysis
          </button>
        </div>

        <div className="mt-6">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Tier Progression */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-700">Tier Progression</h4>
                  <div className="space-y-4">
                    {reputationTiers.map((tier) => (
                      <div
                        key={tier.level}
                        className={`p-4 rounded-lg border-2 ${
                          currentTier?.level === tier.level
                            ? 'border-blue-500 bg-blue-50 shadow-md'
                            : 'border-gray-200 bg-white'
                        }`}
                      >
                        <div className="flex justify-between items-center mb-2">
                          <span className="font-semibold text-gray-800">{tier.level}</span>
                          <span className="text-sm text-gray-600">
                            Min. Score: {tier.minScore}
                          </span>
                        </div>
                        <ul className="text-sm text-gray-600 space-y-1 list-disc list-inside">
                          {tier.benefits.map((benefit, index) => (
                            <li key={index}>{benefit}</li>
                          ))}
                           {tier.stakingRequired > 0 && <li>Requires {tier.stakingRequired} MOCA staking</li>}
                        </ul>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Quick Actions & Info */}
                <div>
                  <h4 className="font-semibold mb-4 text-gray-700">Quick Actions</h4>
                  <div className="space-y-4">
                    <button 
                      onClick={generateReputationProof}
                      disabled={isGeneratingProof || !userProfile} // Disable if generating or not logged in
                      className="w-full btn btn-primary flex items-center justify-center"
                    >
                      {isGeneratingProof ? (
                        <>
                          <div className="spinner w-4 h-4 border-t-2 border-white border-solid rounded-full animate-spin mr-2"></div>
                          Generating...
                        </>
                      ) : (
                        'Generate Reputation Proof (ZKP)'
                      )}
                    </button>
                    <button disabled className="w-full btn btn-secondary opacity-50 cursor-not-allowed">
                      Share Reputation Score (Coming Soon)
                    </button>
                    <button disabled className="w-full btn btn-secondary opacity-50 cursor-not-allowed">
                      View Public Profile (Coming Soon)
                    </button>
                  </div>
                  
                  <div className="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                    <h5 className="font-semibold text-blue-800 mb-2">
                       Moca Network Integration
                    </h5>
                    <p className="text-sm text-blue-700">
                      Your reputation is built on verifiable credentials stored securely on Moca Network. 
                      This enables privacy-preserving verification across multiple platforms and chains.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && (
            <div className="credentials-tab">
              <h4 className="font-semibold mb-4 text-gray-700">Credential Impact Analysis</h4>
              {credentialImpacts.length > 0 ? (
                <div className="space-y-4">
                  {credentialImpacts.map((impact, index) => (
                    <div key={index} className="flex justify-between items-center p-3 bg-gray-50 rounded border border-gray-200">
                      <div>
                        <div className="font-medium capitalize text-gray-800">
                          {impact.type.replace(/_/g, ' ')} {/* Replace underscores */}
                        </div>
                        <div className="text-sm text-gray-600">
                          {impact.count} credentials
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-green-600">
                          +{impact.averageImpact.toFixed(1)} pts avg {/* Format number */}
                        </div>
                        <div className="text-sm text-gray-600">
                          per credential
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-gray-500 text-center py-4">
                  No credential impact data available. Start by adding more credentials to your profile.
                </p>
              )}
            </div>
          )}

          {activeTab === 'analysis' && (
            <div className="analysis-tab">
              <h4 className="font-semibold mb-4 text-gray-700">Advanced Reputation Analytics</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-semibold mb-2 text-gray-800">Cross-Chain Verification</h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Your reputation is verifiable across 25+ chains through Moca Network's identity oracle.
                  </p>
                  <div className="flex items-center text-sm text-green-600 font-medium">
                    <svg className="w-4 h-4 mr-1 fill-current" viewBox="0 0 20 20"><path d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"></path></svg>
                    Verified across multiple chains
                  </div>
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <h5 className="font-semibold mb-2 text-gray-800">Privacy Features</h5>
                  <p className="text-sm text-gray-600 mb-4">
                    Using zero-knowledge proofs to verify your reputation without exposing raw data.
                  </p>
                  <div className="flex items-center text-sm text-blue-600 font-medium">
                     <svg className="w-4 h-4 mr-1 fill-current" viewBox="0 0 20 20"><path d="M10 12a2 2 0 100-4 2 2 0 000 4z"></path><path fillRule="evenodd" d="M.458 10C1.732 5.943 5.522 3 10 3s8.268 2.943 9.542 7c-1.274 4.057-5.03 7-9.542 7S1.732 14.057.458 10zM14 10a4 4 0 11-8 0 4 4 0 018 0z" clipRule="evenodd"></path></svg>
                    ZKP-Enabled Verification
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200">
                <h5 className="font-semibold text-yellow-800 mb-2">
                   Boost Your Reputation
                </h5>
                <ul className="text-sm text-yellow-700 space-y-1 list-disc list-inside">
                  <li>Complete more projects with high ratings</li>
                  <li>Diversify your skill credentials</li>
                  <li>Maintain high completion rates</li>
                  <li>Collect client endorsements</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Last Updated */}
      {reputation?.lastCalculated && (
        <div className="text-center text-sm text-gray-500 mt-4">
          Last updated: {new Date(reputation.lastCalculated).toLocaleString()} {/* Use toLocaleString for better format */}
        </div>
      )}
    </div>
  );
};