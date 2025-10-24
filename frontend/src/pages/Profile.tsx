import React, { useState, useEffect } from 'react';
import { useAirKit } from '../hooks/useAirKit';

interface ProfileData {
  airId: string;
  walletAddress: string;
  email?: string;
  joinedDate: string;
  reputationTier: string;
}

export const Profile: React.FC = () => {
  const { userProfile, airAccount } = useAirKit();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userProfile) return;

      try {
        const response = await fetch('/api/user/profile', {
          headers: {
            'Authorization': `Bearer ${await userProfile.getToken()}`
          }
        });
        const data = await response.json();
        setProfileData(data);
        setEditedEmail(data.email || '');
      } catch (error) {
        console.error('Failed to fetch profile:', error);
      }
    };

    fetchProfileData();
  }, [userProfile]);

  const handleSaveProfile = async () => {
    try {
      const response = await fetch('/api/user/profile', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${await userProfile?.getToken()}`
        },
        body: JSON.stringify({ email: editedEmail })
      });

      if (response.ok) {
        setProfileData(prev => prev ? { ...prev, email: editedEmail } : null);
        setIsEditing(false);
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (!profileData) {
    return <div className="loading">Loading profile...</div>;
  }

  return (
    <div className="profile-page">
      <div className="card">
        <h1 className="card-header">Profile Settings</h1>
        
        <div className="space-y-6">
          {/* Basic Information */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Basic Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="form-label">AIR ID</label>
                <input
                  type="text"
                  value={profileData.airId}
                  className="form-input"
                  disabled
                />
              </div>
              <div>
                <label className="form-label">Wallet Address</label>
                <input
                  type="text"
                  value={profileData.walletAddress}
                  className="form-input"
                  disabled
                />
              </div>
            </div>
            
            <div className="mt-4">
              <label className="form-label">Email</label>
              {isEditing ? (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={editedEmail}
                    onChange={(e) => setEditedEmail(e.target.value)}
                    className="form-input flex-1"
                  />
                  <button onClick={handleSaveProfile} className="btn btn-success">
                    Save
                  </button>
                  <button 
                    onClick={() => setIsEditing(false)} 
                    className="btn btn-secondary"
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input
                    type="email"
                    value={profileData.email || 'Not set'}
                    className="form-input flex-1"
                    disabled
                  />
                  <button 
                    onClick={() => setIsEditing(true)} 
                    className="btn btn-primary"
                  >
                    Edit
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Account Status */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Account Status</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <div className="text-sm text-blue-600 mb-1">Reputation Tier</div>
                <div className="text-xl font-bold text-blue-800">
                  {profileData.reputationTier}
                </div>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <div className="text-sm text-green-600 mb-1">Member Since</div>
                <div className="text-lg font-semibold text-green-800">
                  {new Date(profileData.joinedDate).toLocaleDateString()}
                </div>
              </div>
              <div className="text-center p-4 bg-purple-50 rounded-lg">
                <div className="text-sm text-purple-600 mb-1">Identity</div>
                <div className="text-lg font-semibold text-purple-800">
                  Verified
                </div>
              </div>
            </div>
          </div>

          {/* Connected Wallets */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Connected Wallets</h3>
            <div className="space-y-2">
              <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">Primary Wallet</div>
                  <div className="text-sm text-secondary">
                    {profileData.walletAddress}
                  </div>
                </div>
                <span className="badge badge-success">Connected</span>
              </div>
            </div>
            <button className="btn btn-primary mt-4">
              Connect Additional Wallet
            </button>
          </div>

          {/* Security Settings */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Security</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Biometric Authentication</div>
                  <div className="text-sm text-secondary">
                    Use fingerprint or face recognition
                  </div>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" />
                  <div className="w-11 h-6 bg-gray-200 peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                </label>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-secondary">
                    Add an extra layer of security
                  </div>
                </div>
                <button className="btn btn-secondary">Enable</button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};