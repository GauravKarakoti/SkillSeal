import React from 'react';
import { useAirKit } from '../hooks/useAirKit';

interface AuthGuardProps {
  children: React.ReactNode;
}

export const AuthGuard: React.FC<AuthGuardProps> = ({ children }) => {
  const { isInitialized, userProfile, login } = useAirKit();

  if (!isInitialized) {
    return <div className="flex items-center justify-center h-full w-full">Initializing AIR Kit...</div>;
  }

  if (!userProfile) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Welcome to SkillSeal</h1>
          <button
            onClick={login}
            className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600"
          >
            Login with AIR Account
          </button>
        </div>
      </div>
    );
  }

  return <>{children}</>;
};