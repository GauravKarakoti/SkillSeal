import React, { useState, useEffect, useCallback } from 'react';
import { useAirKit } from '../hooks/useAirKit';
import { useWeb3Modal } from '@web3modal/wagmi/react'; // WalletConnect modal hook
import { useAccount, useDisconnect } from 'wagmi'; // Wagmi hooks

interface WalletInfo {
    id?: number; // Optional ID from user_wallets table
    walletAddress: string;
    chain?: string; // Optional chain info
    type: 'airkit' | 'walletconnect' | 'primary_db' | 'additional_db';
}

interface ProfileData {
    airId: string;
    primaryWalletAddress: string; // The one stored in the users table
    email?: string;
    joinedDate: string;
    reputationTier: string;
    additionalWallets: WalletInfo[]; // Wallets from user_wallets table
}


export const Profile: React.FC = () => {
    const { userProfile, airService, login } = useAirKit(); // AirKit hook
    const { open } = useWeb3Modal(); // WalletConnect modal hook
    const { address: wcAddress, isConnected: isWcConnected, connector } = useAccount(); // Wagmi hook for WalletConnect account
    const { disconnect: wcDisconnect } = useDisconnect(); // Wagmi hook to disconnect WalletConnect

    const [profileData, setProfileData] = useState<ProfileData | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    const [editedEmail, setEditedEmail] = useState('');
    const [isLoading, setIsLoading] = useState(true);
    const [connectedWallets, setConnectedWallets] = useState<WalletInfo[]>([]);

    // --- Fetch Profile Data ---
    const fetchProfileData = useCallback(async () => {
        if (!userProfile) {
            setIsLoading(false);
            return;
        }
        setIsLoading(true);
        try {
            const { token } = await airService.getAccessToken();
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/profile`, {
                headers: { 'Authorization': `Bearer ${token}` }
            });
            if (!response.ok) throw new Error(`API Error: ${response.statusText}`);
            const data = await response.json();

            // Store fetched profile data
            const fetchedData: ProfileData = {
                airId: data.profile.airId || 'N/A',
                primaryWalletAddress: data.profile.walletAddress || 'N/A', // Primary from users table
                email: data.profile.email || '',
                joinedDate: data.profile.createdAt || new Date().toISOString(),
                reputationTier: data.profile.airProfile?.identityTier || 'BASIC',
                additionalWallets: data.profile.additionalWallets?.map((w: any) => ({ // Wallets from user_wallets table
                     id: w.id,
                     walletAddress: w.walletAddress,
                     chain: w.chain,
                     type: 'additional_db',
                })) || []
            };
            setProfileData(fetchedData);
            setEditedEmail(fetchedData.email || '');

            // --- Consolidate Wallet List ---
            const wallets: WalletInfo[] = [];
            // 1. Add Primary wallet from DB (users table)
            if (fetchedData.primaryWalletAddress !== 'N/A') {
                wallets.push({ walletAddress: fetchedData.primaryWalletAddress, type: 'primary_db' });
            }
             // 2. Add AirKit connected wallet (if different from primary)
             const airkitAddress = (userProfile as any)?.address;
             if (airkitAddress && airkitAddress.toLowerCase() !== fetchedData.primaryWalletAddress.toLowerCase() && !wallets.some(w => w.walletAddress.toLowerCase() === airkitAddress.toLowerCase())) {
                 wallets.push({ walletAddress: airkitAddress, type: 'airkit' });
             }
             // 3. Add WalletConnect connected wallet (if connected and different)
             if (isWcConnected && wcAddress && wcAddress.toLowerCase() !== fetchedData.primaryWalletAddress.toLowerCase() && !wallets.some(w => w.walletAddress.toLowerCase() === wcAddress.toLowerCase())) {
                 wallets.push({ walletAddress: wcAddress, type: 'walletconnect' });
             }
             // 4. Add additional wallets from DB (user_wallets table), avoiding duplicates
            fetchedData.additionalWallets.forEach(dbWallet => {
                if (dbWallet.walletAddress.toLowerCase() !== fetchedData.primaryWalletAddress.toLowerCase() && !wallets.some(w => w.walletAddress.toLowerCase() === dbWallet.walletAddress.toLowerCase())) {
                     wallets.push({ ...dbWallet, type: 'additional_db' }); // Keep original data
                }
            });

            setConnectedWallets(wallets);


        } catch (error) {
            console.error('Failed to fetch profile:', error);
            setProfileData(null);
            setConnectedWallets([]);
        } finally {
            setIsLoading(false);
        }
    }, [userProfile, airService, wcAddress, isWcConnected]); // Added WC dependencies

    useEffect(() => {
        fetchProfileData();
    }, [fetchProfileData]); // Fetch on initial load and when dependencies change


     // --- Connect WalletConnect Handler ---
     const handleConnectWalletConnect = async () => {
         await open(); // Open WalletConnect Modal
         // After connection, useEffect dependency change triggers fetchProfileData to update list
     };

     // --- Add WalletConnect Wallet to Backend ---
     const addWalletToBackend = useCallback(async (address: string, chainName: string | undefined) => {
         if (!userProfile) return;
         try {
             const { token } = await airService.getAccessToken();
             const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/wallet/add`, {
                 method: 'POST',
                 headers: {
                     'Content-Type': 'application/json',
                     'Authorization': `Bearer ${token}`
                 },
                 body: JSON.stringify({ walletAddress: address, chain: chainName || 'unknown' }) // Send chain name if available
             });
             if (!response.ok) {
                 console.error('Failed to add wallet to backend:', await response.text());
             } else {
                 console.log(`Wallet ${address} added to backend.`);
                 fetchProfileData(); // Refresh profile data after adding
             }
         } catch (error) {
             console.error('Error adding wallet to backend:', error);
         }
     }, [userProfile, airService, fetchProfileData]); // Dependencies

      // Effect to add WC wallet to backend when connected
      useEffect(() => {
        if (isWcConnected && wcAddress) {
          // Check if it's already in the list to avoid redundant adds
          const exists = connectedWallets.some(w => w.walletAddress.toLowerCase() === wcAddress.toLowerCase());
          if (!exists) {
            // Get chain info from connector if possible (might need specific connector logic)
            const chainName = (connector?.chains as any)?.[0]?.name; // Example, may vary
            addWalletToBackend(wcAddress, chainName);
          }
        }
      }, [isWcConnected, wcAddress, connector, addWalletToBackend, connectedWallets]);


    // --- Save Email Handler ---
    const handleSaveProfile = async () => {
        // (Keep your existing email save logic)
        if (!userProfile) return;
        setIsLoading(true);
        try {
            const { token } = await airService.getAccessToken();
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/profile`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ email: editedEmail })
            });
            if (response.ok) {
                setProfileData(prev => prev ? { ...prev, email: editedEmail } : null);
                setIsEditing(false);
            } else {
                console.error('Failed to update email via API:', await response.text());
                alert('Failed to save email.');
            }
        } catch (error) {
            console.error('Failed to update email:', error);
            alert('An error occurred while saving email.');
        } finally {
            setIsLoading(false);
        }
    };

    // --- Set Primary Wallet Handler ---
    const handleSetPrimary = async (newPrimaryAddress: string) => {
        if (!userProfile || !profileData || newPrimaryAddress.toLowerCase() === profileData.primaryWalletAddress.toLowerCase()) {
            return; // No user, no profile data, or already primary
        }
        setIsLoading(true);
        try {
            const { token } = await airService.getAccessToken();
            const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/profile/set-primary`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
                body: JSON.stringify({ walletAddress: newPrimaryAddress })
            });
            if (response.ok) {
                const updatedUser = await response.json();
                // Refresh profile data entirely to get the updated state
                await fetchProfileData();
                alert('Primary wallet updated successfully!');
            } else {
                const errorText = await response.text();
                console.error('Failed to set primary wallet via API:', errorText);
                alert(`Failed to set primary wallet: ${errorText}`);
            }
        } catch (error) {
            console.error('Error setting primary wallet:', error);
            alert('An error occurred while setting the primary wallet.');
        } finally {
            setIsLoading(false);
        }
    };


    if (isLoading && !profileData) { // Show initial loading spinner
        return <div className="loading p-6">Loading profile...</div>;
    }

    if (!profileData) {
        return <div className="p-6">Could not load profile data. Please ensure you are logged in.</div>;
    }

    const primaryWalletAddress = profileData.primaryWalletAddress;

    return (
        <div className="profile-page p-6">
            <div className="card">
                <h1 className="card-header">Profile Settings</h1>

                {isLoading && <div className="loading mb-4">Updating...</div>} {/* Show spinner during updates */}

                <div className="space-y-6">
                    {/* Basic Information */}
                    <div>
                      {/* ... (AIR ID and Email sections remain the same) ... */}
                        <h3 className="text-lg font-semibold mb-4 text-gray-800">Basic Information</h3>
                         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                             <div>
                                 <label className="form-label">AIR ID</label>
                                 <input type="text" value={profileData.airId} className="form-input bg-gray-100 cursor-not-allowed" disabled />
                             </div>
                             {/* Email Editing - Keep existing logic */}
                             <div>
                                <label className="form-label">Email</label>
                                {isEditing ? (
                                    <div className="flex gap-2">
                                    <input type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} className="form-input flex-1" placeholder="Enter your email" />
                                    <button onClick={handleSaveProfile} className="btn btn-success" disabled={isLoading}>Save</button>
                                    <button onClick={() => { setIsEditing(false); setEditedEmail(profileData.email || ''); }} className="btn btn-secondary" disabled={isLoading}>Cancel</button>
                                    </div>
                                ) : (
                                    <div className="flex gap-2">
                                    <input type="email" value={profileData.email || 'Not set'} className="form-input flex-1 bg-gray-100 cursor-not-allowed" disabled />
                                    <button onClick={() => setIsEditing(true)} className="btn btn-primary" disabled={isLoading}>Edit</button>
                                    </div>
                                )}
                              </div>
                         </div>
                    </div>

                    {/* Account Status */}
                    <div>
                      {/* ... (Account Status section remains the same) ... */}
                       <h3 className="text-lg font-semibold mb-4 text-gray-700">Account Status</h3>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                           <div className="text-center p-4 bg-blue-50 rounded-lg"><div className="text-sm text-blue-600 mb-1">Reputation Tier</div><div className="text-xl font-bold text-blue-800">{profileData.reputationTier}</div></div>
                            <div className="text-center p-4 bg-green-50 rounded-lg"><div className="text-sm text-green-600 mb-1">Member Since</div><div className="text-lg font-semibold text-green-800">{new Date(profileData.joinedDate).toLocaleDateString()}</div></div>
                            <div className="text-center p-4 bg-purple-50 rounded-lg"><div className="text-sm text-purple-600 mb-1">Identity</div><div className="text-lg font-semibold text-purple-800">Verified</div></div>
                        </div>
                    </div>

                    {/* Connected Wallets */}
                    <div>
                        <h3 className="text-lg font-semibold mb-4 text-gray-700">Connected Wallets</h3>
                        <div className="space-y-3">
                            {connectedWallets.length > 0 ? (
                                connectedWallets.map((wallet) => {
                                    const isPrimary = wallet.walletAddress.toLowerCase() === primaryWalletAddress.toLowerCase();
                                    const isAirKit = wallet.type === 'airkit';
                                    const isWConnect = wallet.type === 'walletconnect';

                                    return (
                                        <div key={wallet.walletAddress} className={`flex flex-wrap justify-between items-center gap-2 p-3 rounded border ${isPrimary ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                                            <div>
                                                <div className="font-medium text-gray-700 flex items-center gap-2">
                                                    {isPrimary && <span className="text-xs font-bold text-green-700">(Primary)</span>}
                                                    {isAirKit && <span className="text-xs font-bold text-blue-700">(AirKit)</span>}
                                                    {isWConnect && <span className="text-xs font-bold text-purple-700">(WalletConnect)</span>}
                                                    {!isPrimary && !isAirKit && !isWConnect && wallet.type === 'additional_db' && <span className="text-xs font-bold text-gray-500">(Other)</span>}

                                                </div>
                                                <div className="text-sm text-secondary break-all">
                                                    {wallet.walletAddress}
                                                </div>
                                                {wallet.chain && <div className="text-xs text-gray-500">Chain: {wallet.chain}</div>}
                                            </div>
                                            {/* Show "Set as Primary" button only if it's NOT already primary */}
                                            {!isPrimary && (
                                                <button
                                                    onClick={() => handleSetPrimary(wallet.walletAddress)}
                                                    className="btn btn-secondary text-sm py-1 px-3" // Smaller button
                                                    disabled={isLoading}
                                                >
                                                    Set as Primary
                                                </button>
                                            )}
                                        </div>
                                    );
                                })
                            ) : (
                                <p className="text-gray-500 italic">No wallets connected yet.</p>
                            )}
                        </div>

                        {/* --- Buttons for Connecting/Disconnecting --- */}
                        <div className="mt-4 flex flex-wrap gap-3">
                             {/* WalletConnect Button */}
                             <button onClick={handleConnectWalletConnect} className="btn btn-primary" disabled={isLoading}>
                                 Connect with WalletConnect
                             </button>

                             {/* Disconnect WalletConnect Button (only show if connected) */}
                             {isWcConnected && (
                                 <button onClick={() => wcDisconnect()} className="btn btn-danger" disabled={isLoading}> {/* Add btn-danger style */}
                                     Disconnect WalletConnect
                                 </button>
                             )}
                        </div>
                    </div>

                    {/* Security Settings */}
                    <div>
                       <h3 className="text-lg font-semibold mb-4 text-gray-700">Security</h3>
                       <div className="space-y-3">
                           <div className="flex justify-between items-center"><div><div className="font-medium text-gray-600">Biometric Authentication</div><div className="text-sm text-secondary">Use fingerprint or face recognition (managed via AirKit)</div></div><span className="text-sm text-gray-500 italic">Enabled via Login</span></div>
                           <div className="flex justify-between items-center"><div><div className="font-medium text-gray-600">Two-Factor Authentication</div><div className="text-sm text-secondary">Add an extra layer of security (managed via AirKit)</div></div><span className="text-sm text-gray-500 italic">Enabled via Login</span></div>
                       </div>
                    </div>
                </div>
            </div>
        </div>
    );
};