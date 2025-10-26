import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom'; // Import useNavigate
// FIX: Import 'airService' from the hook
import { useAirKit } from '../hooks/useAirKit';

export const Dashboard: React.FC = () => {
  // FIX: Destructure 'airService' from the hook
  const { userProfile, airService } = useAirKit();
  const navigate = useNavigate(); // Initialize useNavigate 
  const [userStats, setUserStats] = useState({
    credentialCount: 0,
    proofCount: 0,
    reputationScore: 0,
    tier: 'BASIC'
  });

  useEffect(() => {
    // Fetch user stats from backend
    const fetchUserStats = async () => {
      try {
        // FIX: Get token from 'airService'
        const { token } = await airService.getAccessToken();
        const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        const stats = await response.json();
        setUserStats(stats);
      } catch (error) {
        console.error('Failed to fetch user stats:', error);
      }
    };

    if (userProfile) {
      fetchUserStats();
    }
  }, [userProfile, airService]); // Add airService as a dependency

  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PREMIUM': return 'text-purple-600';
      case 'VERIFIED': return 'text-blue-600';
      default: return 'text-gray-600';
    }
  };

  return (
    <div className="dashboard">
      <div className="welcome-section fade-in">
        <h1 className="text-3xl font-bold mb-2">
          {/* FIX: Cast userProfile to 'any' */}
          Welcome back, {(userProfile as any)?.name || 'User'}!
        </h1>
        <p className="text-secondary mb-6">
          Manage your professional identity and verifiable credentials
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="card text-center">
          <div className="text-2xl font-bold text-primary mb-2">
            {userStats.credentialCount}
          </div>
          <div className="text-secondary">Credentials</div>
        </div>
        
        <div className="card text-center">
          <div className="text-2xl font-bold text-success mb-2">
            {userStats.proofCount}
          </div>
          <div className="text-secondary">ZK Proofs Generated</div>
        </div>
        
        <div className="card text-center">
          <div className="reputation-score">
            {userStats.reputationScore}
          </div>
          <div className={`reputation-tier ${getTierColor(userStats.tier)}`}>
            {userStats.tier} Tier
          </div>
        </div>
      </div>

      {/* Navigation Tabs - MODIFIED */}
      <div className="card">
        {/* Tab Content - MODIFIED */}
        <div className="tab-content">
          <div className="overview-tab">
            <h2 className="card-header">Quick Actions</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <button 
                className="btn btn-primary w-full"
                onClick={() => navigate('/credentials')} // MODIFIED: Navigate to route
              >
                Manage Credentials
              </button>
              <button 
                className="btn btn-secondary w-full"
                onClick={() => navigate('/zkp')} // MODIFIED: Navigate to route
              >
                Generate ZKP
              </button>
            </div>

            <div className="mt-8">
              <h3 className="text-lg font-semibold mb-4 text-gray-800">Recent Activity</h3>
              <div className="space-y-3">
                {/* Static example data */}
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-gray-700">
                  <span>Project completion credential issued</span>
                  <span className="text-sm text-secondary">2 hours ago</span>
                </div>
                <div className="flex justify-between items-center p-3 bg-gray-50 rounded text-gray-700">
                  <span>Reputation proof generated</span>
                  <span className="text-sm text-secondary">1 day ago</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};