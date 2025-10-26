import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
// FIX: Import 'airService' from the hook
// Add 'login' to the import
import { useAirKit } from '../hooks/useAirKit';

export const Navigation: React.FC = () => {
  // FIX: Destructure 'airService' from the hook
  // Add 'login' from the hook
  const { userProfile, logout, airService, login } = useAirKit();
  const location = useLocation();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [userStats, setUserStats] = useState({
    credentialCount: 0,
    reputationScore: 0,
    tier: 'BASIC'
  });

  useEffect(() => {
    if (userProfile) {
      fetchUserStats();
    }
  }, [userProfile, airService]); // Add airService dependency

  const fetchUserStats = async () => {
    try {
      // FIX: Get token from 'airService', not 'userProfile'
      const { token } = await airService.getAccessToken();
      const response = await fetch(`${process.env.REACT_APP_BACKEND_URL}/api/airkit/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const stats = await response.json();
      setUserStats(stats);
    } catch (error) {
      console.error('Failed to fetch user stats:', error);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      // Optional: Redirect to login page or home
      window.location.href = '/';
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };
  
  // NEW: Handler for connecting a new wallet
  const handleConnectWallet = async () => {
    setIsMobileMenuOpen(false);
    try {
      await login(); // Re-use the login function to connect/switch wallet
    } catch (error) {
      console.error('Failed to connect new wallet:', error);
    }
  };


  const getTierColor = (tier: string) => {
    switch (tier) {
      case 'PREMIUM': return 'bg-purple-100 text-purple-800';
      case 'VERIFIED': return 'bg-blue-100 text-blue-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const isActiveRoute = (path: string) => {
    return location.pathname === path;
  };

  const navItems = [
    { path: '/', label: 'Dashboard', icon: '🏠' },
    { path: '/credentials', label: 'Credentials', icon: '📜' },
    { path: '/zkp', label: 'ZKP Generator', icon: '🔐' },
    { path: '/reputation', label: 'Reputation', icon: '📊' },
    { path: '/profile', label: 'Profile', icon: '👤' }
  ];

  return (
    // FIX: Added bg-white and border-b for better layout definition
    <nav className="navbar w-full bg-white border-b border-gray-200">
      <div className="container mx-auto px-4">
        <div className="flex justify-between items-center">
          {/* Logo and Brand */}
          {/* FIX: Added min-w-0 to allow this flex item to shrink */}
          <div className="flex items-center space-x-4 min-w-0">
            <Link to="/" className="nav-brand flex items-center space-x-2">
              <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                S
              </div>
              <span className="font-bold text-xl">SkillSeal</span>
            </Link>
            
            {/* Desktop Navigation */}
            {/* FIX: Added flex-shrink and min-w-0 to allow nav links to shrink */}
            <div className="hidden md:flex space-x-1 flex-shrink min-w-0">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`nav-link flex items-center space-x-2 ${
                    isActiveRoute(item.path) 
                      ? 'bg-blue-50 text-blue-600 border-blue-200' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  <span>{item.icon}</span>
                  <span className="whitespace-nowrap">{item.label}</span>
                </Link>
              ))}
            </div>
          </div>

          {/* User Info and Controls */}
          {/* FIX: Added flex-shrink-0 to prevent this section from shrinking */}
          <div className="flex items-center space-x-4 flex-shrink-0">
            {/* User Stats (Desktop) */}
            <div className="hidden lg:flex items-center space-x-4">
              <div className="text-right">
                <div className="text-sm font-medium text-gray-900">
                  {/* FIX: Cast to 'any' to bypass incomplete type definition */}
                  {(userProfile as any)?.name || 'User'}
                </div>
                <div className="flex items-center space-x-2 text-xs text-gray-500">
                  <span>{userStats.credentialCount} credentials</span>
                  <span>•</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(userStats.tier)}`}>
                    {userStats.tier}
                  </span>
                </div>
              </div>
              
              {/* Reputation Score */}
              <div className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2">
                <div className="text-sm font-medium text-gray-600">Reputation</div>
                <div className="text-lg font-bold text-blue-600">{userStats.reputationScore}</div>
              </div>
            </div>

            {/* Wallet Connection Status */}
            <div className="hidden md:flex items-center space-x-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
              <span className="text-sm font-medium text-green-700">Connected</span>
            </div>

            {/* User Menu Dropdown */}
            <div className="relative">
              <button
                onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
                className="flex items-center space-x-2 bg-white border border-gray-200 rounded-lg px-3 py-2 hover:bg-gray-50"
              >
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-bold">
                  {/* FIX: Cast to 'any' */}
                  {(userProfile as any)?.name?.charAt(0) || 'U'}
                </div>
                <svg 
                  className={`w-4 h-4 text-gray-500 transition-transform ${
                    isMobileMenuOpen ? 'rotate-180' : ''
                  }`} 
                  fill="none" 
                  stroke="currentColor" 
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {/* Dropdown Menu */}
              {isMobileMenuOpen && (
                <div className="absolute right-0 mt-2 w-64 bg-white border border-gray-200 rounded-lg shadow-lg py-2 z-50">
                  {/* User Info */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    {/* FIX: Cast to 'any' */}
                    <div className="font-medium text-gray-900">{(userProfile as any)?.name || 'User'}</div>
                    <div className="text-sm text-gray-500 truncate">{(userProfile as any)?.address}</div>
                    <div className="flex items-center space-x-2 mt-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${getTierColor(userStats.tier)}`}>
                        {userStats.tier} Tier
                      </span>
                      <span className="text-xs text-gray-500">
                        {userStats.reputationScore} Reputation
                      </span>
                    </div>
                  </div>

                  {/* Quick Stats */}
                  <div className="px-4 py-3 border-b border-gray-100">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <div className="text-gray-500">Credentials</div>
                        <div className="font-medium text-gray-900">{userStats.credentialCount}</div>
                      </div>
                      <div>
                        <div className="text-gray-500">Proofs</div>
                        <div className="font-medium text-gray-900">12</div>
                      </div>
                    </div>
                  </div>

                  {/* Menu Links */}
                  <div className="py-2">
                    <Link
                      to="/profile"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span>👤</span>
                      <span>Profile Settings</span>
                    </Link>
                    <Link
                      to="/credentials"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <span>📜</span>
                      <span>Manage Credentials</span>
                    </Link>
                    {/* FIX: Implement Connect Another Wallet */}
                    <button
                      onClick={handleConnectWallet}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <span>🔗</span>
                      <span>Connect Another Wallet</span>
                    </button>
                  </div>

                  {/* Support & Logout */}
                  <div className="py-2 border-t border-gray-100">
                    {/* FIX: Implement Help & Support as a mailto link */}
                    <a
                      href="mailto:karakotigaurav12@gmail.com"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-gray-700 hover:bg-gray-50 w-full text-left"
                    >
                      <span>❓</span>
                      <span>Help & Support</span>
                    </a>
                    <button
                      onClick={handleLogout}
                      className="flex items-center space-x-3 px-4 py-2 text-sm text-red-600 hover:bg-red-50 w-full text-left"
                    >
                      <span>🚪</span>
                      <span>Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Mobile Menu Button */}
            <button
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-50"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d={isMobileMenuOpen ? "M6 18L18 6M6 6l12 12" : "M4 6h16M4 12h16M4 18h16"} 
                />
              </svg>
            </button>
          </div>
        </div>

        {/* Mobile Navigation Menu */}
        {isMobileMenuOpen && (
          <div className="md:hidden mt-4 pb-4 border-t border-gray-200 pt-4">
            {/* Mobile Navigation Links */}
            <div className="space-y-2">
              {navItems.map(item => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-lg text-lg ${
                    isActiveRoute(item.path)
                      ? 'bg-blue-50 text-blue-600 border border-blue-200'
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span className="text-xl">{item.icon}</span>
                  <span>{item.label}</span>
                </Link>
              ))}
            </div>

            {/* Mobile User Stats */}
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <div className="flex items-center space-x-3 mb-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white font-bold">
                  {/* FIX: Cast to 'any' */}
                  {(userProfile as any)?.name?.charAt(0) || 'U'}
                </div>
                <div>
                  {/* FIX: Cast to 'any' */}
                  <div className="font-medium text-gray-900">{(userProfile as any)?.name || 'User'}</div>
                  <div className="text-sm text-gray-500">Connected</div>
                </div>
              </div>
              
              <div className="grid grid-cols-3 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-gray-900">{userStats.credentialCount}</div>
                  <div className="text-xs text-gray-500">Credentials</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-blue-600">{userStats.reputationScore}</div>
                  <div className="text-xs text-gray-500">Reputation</div>
                </div>
                <div>
                  <div className={`text-xs font-medium px-2 py-1 rounded-full ${getTierColor(userStats.tier)}`}>
                    {userStats.tier}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">Tier</div>
                </div>
              </div>
            </div>

            {/* Mobile Action Buttons */}
            <div className="mt-4 space-y-2">
              <button
                onClick={handleLogout}
                className="w-full flex items-center justify-center space-x-2 px-4 py-3 text-red-600 border border-red-200 rounded-lg hover:bg-red-50"
              >
                <span>🚪</span>
                <span>Logout</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Overlay for mobile menu */}
      {isMobileMenuOpen && (
        <div 
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}
    </nav>
  );
};