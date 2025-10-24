import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthGuard } from './components/AuthGuard';
import { Dashboard } from './pages/Dashboard';
import { CredentialManager } from './components/CredentialManager';
import { ZKPGenerator } from './components/ZKPGenerator';
import { Profile } from './pages/Profile';
import { Navigation } from './components/Navigation';
import { useAirKit } from './hooks/useAirKit';
import './App.css';

const queryClient = new QueryClient();

function AppContent() {
  const { userProfile } = useAirKit();

  return (
    <div className="App">
      <Navigation />
      <main className="main-content">
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/credentials" element={<CredentialManager />} />
          <Route path="/zkp" element={<ZKPGenerator />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/reputation" element={<ReputationDashboard />} />
        </Routes>
      </main>
    </div>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthGuard>
        <Router>
          <AppContent />
        </Router>
      </AuthGuard>
    </QueryClientProvider>
  );
}

export default App;