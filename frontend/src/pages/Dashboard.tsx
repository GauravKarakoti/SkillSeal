import React, { useState, useEffect } from 'react';
// FIX: Import 'airService' from the hook
import { useAirKit } from '../hooks/useAirKit';
import { CredentialManager } from '../components/CredentialManager';
import { ZKPGenerator } from '../components/ZKPGenerator';

export const Dashboard: React.FC = () => {
  // FIX: Destructure 'airService' from the hook
  const { userProfile, airService } = useAirKit();
  const [activeTab, setActiveTab] = useState<'overview' | 'credentials' | 'zkp'>('overview');
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
        const response = await fetch('/api/user/stats', {
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

      {/* Navigation Tabs */}
      <div className="card">
        <div className="flex border-b border-gray-200 mb-6">
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'overview'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'credentials'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab('credentials')}
          >
            Credentials
          </button>
          <button
            className={`px-4 py-2 font-medium ${
              activeTab === 'zkp'
                ? 'border-b-2 border-primary text-primary'
                : 'text-secondary hover:text-primary'
            }`}
            onClick={() => setActiveTab('zkp')}
          >
            Zero-Knowledge Proofs
          </button>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {activeTab === 'overview' && (
            <div className="overview-tab">
              <h2 className="card-header">Quick Actions</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <button 
                  className="btn btn-primary w-full"
                  onClick={() => setActiveTab('credentials')}
                >
                  Manage Credentials
                </button>
                <button 
                  className="btn btn-secondary w-full"
                  onClick={() => setActiveTab('zkp')}
                >
                  Generate ZKP
                </button>
              </div>

              <div className="mt-8">
                <h3 className="text-lg font-semibold mb-4">Recent Activity</h3>
                <div className="space-y-3">
                  {/* Static example data */}
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Project completion credential issued</span>
                    <span className="text-sm text-secondary">2 hours ago</span>
                  </div>
                  <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span>Reputation proof generated</span>
                    <span className="text-sm text-secondary">1 day ago</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'credentials' && <CredentialManager />}
          {activeTab === 'zkp' && <ZKPGenerator />}
        </div>
      </div>
    </div>
  );
};