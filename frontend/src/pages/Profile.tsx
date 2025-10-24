import React, { useState, useEffect } from 'react';
// FIX: Import 'airService' from the hook
import { useAirKit } from '../hooks/useAirKit';

interface ProfileData {
  airId: string;
  walletAddress: string;
  email?: string;
  joinedDate: string; // Assuming API returns this
  reputationTier: string; // Assuming API returns this
}

export const Profile: React.FC = () => {
  // FIX: Destructure 'airService' from the hook
  const { userProfile, airService } = useAirKit();
  const [profileData, setProfileData] = useState<ProfileData | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedEmail, setEditedEmail] = useState('');
  const [isLoading, setIsLoading] = useState(true); // Add loading state

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!userProfile) {
        setIsLoading(false); // Stop loading if no user
        return;
      }

      setIsLoading(true); // Start loading
      try {
        // FIX: Get token from 'airService'
        const { token } = await airService.getAccessToken();
        const response = await fetch('/api/user/profile', { // Assuming this endpoint exists
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });

        if (!response.ok) {
           throw new Error(`API Error: ${response.statusText}`);
        }

        const data = await response.json();
        // Assuming the API returns profile data matching ProfileData interface
        setProfileData({
           airId: (userProfile as any)?.airId || 'N/A', // Get airId from userProfile
           walletAddress: (userProfile as any)?.address || 'N/A', // Get address from userProfile
           email: data.email, // Get email from API
           joinedDate: data.createdAt || new Date().toISOString(), // Get joinedDate from API or default
           reputationTier: data.tier || 'BASIC' // Get tier from API or default
        });
        setEditedEmail(data.email || '');
      } catch (error) {
        console.error('Failed to fetch profile:', error);
        setProfileData(null); // Clear profile data on error
      } finally {
        setIsLoading(false); // Stop loading
      }
    };

    fetchProfileData();
  }, [userProfile, airService]); // Add airService dependency

  const handleSaveProfile = async () => {
    if (!userProfile) return; // Need user profile to get token

    try {
      // FIX: Get token from 'airService'
      const { token } = await airService.getAccessToken();
      const response = await fetch('/api/user/profile', { // Assuming this endpoint exists
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ email: editedEmail })
      });

      if (response.ok) {
        setProfileData(prev => prev ? { ...prev, email: editedEmail } : null);
        setIsEditing(false);
      } else {
         console.error('Failed to update profile via API:', await response.text());
      }
    } catch (error) {
      console.error('Failed to update profile:', error);
    }
  };

  if (isLoading) {
    return <div className="loading p-6">Loading profile...</div>;
  }

  if (!profileData) {
    return <div className="p-6">Could not load profile data. Please ensure you are logged in.</div>;
  }

  return (
    <div className="profile-page p-6">
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
                  className="form-input bg-gray-100 cursor-not-allowed" // Style disabled input
                  disabled
                />
              </div>
              <div>
                <label className="form-label">Wallet Address</label>
                <input
                  type="text"
                  value={profileData.walletAddress}
                  className="form-input bg-gray-100 cursor-not-allowed" // Style disabled input
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
                    placeholder="Enter your email"
                  />
                  <button onClick={handleSaveProfile} className="btn btn-success">
                    Save
                  </button>
                  <button 
                    onClick={() => {
                      setIsEditing(false);
                      setEditedEmail(profileData.email || ''); // Reset on cancel
                    }} 
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
                    className="form-input flex-1 bg-gray-100 cursor-not-allowed" // Style disabled input
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
                  Verified {/* Assuming verified if profile loads */}
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
                  <div className="text-sm text-secondary break-all"> {/* Added break-all */}
                    {profileData.walletAddress}
                  </div>
                </div>
                <span className="badge badge-success flex-shrink-0">Connected</span> {/* Added flex-shrink-0 */}
              </div>
            </div>
            <button className="btn btn-primary mt-4">
              Connect Additional Wallet
            </button>
          </div>

          {/* Security Settings - Static Example */}
          <div>
            <h3 className="text-lg font-semibold mb-4">Security</h3>
            <div className="space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Biometric Authentication</div>
                  <div className="text-sm text-secondary">
                    Use fingerprint or face recognition (managed via AirKit)
                  </div>
                </div>
                {/* Biometric toggle likely controlled by AirKit UI */}
                <span className="text-sm text-gray-500 italic">Enabled via Login</span>
              </div>
              
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-medium">Two-Factor Authentication</div>
                  <div className="text-sm text-secondary">
                    Add an extra layer of security (managed via AirKit)
                  </div>
                </div>
                 <span className="text-sm text-gray-500 italic">Enabled via Login</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};