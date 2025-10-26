import { useState, useEffect, useCallback } from 'react';
// Import the new service and init function
import {
  airService,
  initializeAirKit as initAirKitService,
} from '../utils/airKitConfig';
// Import the types we need
import type {
  AirUserDetails,
  AirEventListener,
  AirEventData, // <- ADD THIS IMPORT
} from '@mocanetwork/airkit';

export const useAirKit = () => {
  const [isInitialized, setIsInitialized] = useState(airService.isInitialized);
  const [isLoggedIn, setIsLoggedIn] = useState(airService.isLoggedIn);
  // This will now store the full user details, not just the login result
  const [userProfile, setUserProfile] = useState<AirUserDetails | null>(null);

  // Define a memoized function to fetch user info
  const fetchUserInfo = useCallback(async () => {
    if (airService.isLoggedIn) {
      try {
        const info = await airService.getUserInfo();
        setUserProfile(info);
        setIsLoggedIn(true);
      } catch (error) {
        console.error('Failed to fetch user info:', error);
        setUserProfile(null);
        setIsLoggedIn(false);
      }
    }
  }, []);

  useEffect(() => {
    const initialize = async () => {
      if (!airService.isInitialized) {
        await initAirKitService();
        setIsInitialized(true);
      }
      // Sync login state
      setIsLoggedIn(airService.isLoggedIn);
      // Fetch user info if already logged in
      if (airService.isLoggedIn) {
        fetchUserInfo();
      }
    };

    initialize();

    // Set up an event listener
    // FIX: Change to one argument 'data' and check 'data.event'
    const listener: AirEventListener = (data: AirEventData) => {
      // Check for 'logged_in' event
      if (data.event === 'logged_in') {
        setIsLoggedIn(true);
        fetchUserInfo(); // Fetch details on login
      }
      // Check for 'logged_out' event
      else if (data.event === 'logged_out') {
        setIsLoggedIn(false);
        setUserProfile(null);
      }
    };

    airService.on(listener);
    // Cleanup listener
    return () => airService.off(listener);
  }, [fetchUserInfo]); // Add fetchUserInfo as dependency

  const login = async () => {
    try {
      // Login will trigger the 'login' event, which calls fetchUserInfo
      await airService.login();
    } catch (error) {
      console.error('AirKit Login failed:', error);
      setIsLoggedIn(false);
      setUserProfile(null);
    }
  };

  const logout = async () => {
    try {
      // Logout will trigger the 'logout' event
      await airService.logout();
    } catch (error) {
      console.error('AirKit Logout failed:', error);
    }
  };

  return {
    isInitialized,
    isLoggedIn,
    userProfile, // This is now AirUserDetails | null (which has .address)
    login,
    logout,
    airService, // The single service instance
  };
};