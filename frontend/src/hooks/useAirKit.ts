import { useState, useEffect } from 'react';
import { airAccount, airCredential } from '../utils/airKitConfig';

export const useAirKit = () => {
  const [isInitialized, setIsInitialized] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  useEffect(() => {
    initializeAirKit();
  }, []);

  const initializeAirKit = async () => {
    try {
      await airAccount.initialize();
      setIsInitialized(true);
      
      // Check if user is already logged in
      const profile = await airAccount.getCurrentUser();
      if (profile) {
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Failed to initialize AIR Kit:', error);
    }
  };

  const login = async () => {
    const profile = await airAccount.login();
    setUserProfile(profile);
    return profile;
  };

  const logout = async () => {
    await airAccount.logout();
    setUserProfile(null);
  };

  return {
    isInitialized,
    userProfile,
    login,
    logout,
    airAccount,
    airCredential
  };
};