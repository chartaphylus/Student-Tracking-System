import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader } from 'lucide-react';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import DataSantri from './pages/DataSantri';
import InputAdabIbadah from './pages/InputAdabIbadah';
import DataAdabIbadah from './pages/DataAdabIbadah';
import LaporanBulanan from './pages/LaporanBulanan';
import DataReferensi from './pages/DataReferensi';
import Home from './pages/Home';
import { supabase } from './lib/supabase';

const ProtectedRoute = ({ children, user }: { children: React.ReactNode, user: any }) => {
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <div className="app-layout">
      <Sidebar />
      <main className="main-content page-transition">
        {children}
      </main>
    </div>
  );
};

function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="loading-screen">
        <Loader className="animate-spin" size={40} color="var(--primary-color)" />
        <p style={{ marginTop: '1rem', color: 'var(--text-light)', fontWeight: 500 }}>Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={session ? <Navigate to="/data-santri" replace /> : <Login />} />

        {/* Protected Routes */}
        <Route path="/data-santri" element={<ProtectedRoute user={session}><DataSantri /></ProtectedRoute>} />
        <Route path="/data-referensi" element={<ProtectedRoute user={session}><DataReferensi /></ProtectedRoute>} />
        <Route path="/input-adab-ibadah" element={<ProtectedRoute user={session}><InputAdabIbadah /></ProtectedRoute>} />
        <Route path="/data-adab-ibadah" element={<ProtectedRoute user={session}><DataAdabIbadah /></ProtectedRoute>} />
        <Route path="/laporan-bulanan" element={<ProtectedRoute user={session}><LaporanBulanan /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}

export default App;
