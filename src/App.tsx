import { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { AppLayout } from './components/layout/AppLayout';
import Login from './pages/Login';
import DataSantri from './pages/DataSantri';
import InputAdabIbadah from './pages/InputAdabIbadah';
import DataAdabIbadah from './pages/DataAdabIbadah';
import LaporanBulanan from './pages/LaporanBulanan';
import DataReferensi from './pages/DataReferensi';
import DataAkunWali from './pages/DataAkunWali';
import DataLiburan from './pages/DataLiburan';
import LaporanLiburan from './pages/LaporanLiburan';
import TugasLiburan from './pages/TugasLiburan';
import Home from './pages/Home';
import LoginWali from './pages/LoginWali';
import DashboardWali from './pages/DashboardWali';
import LoginMusyrif from './pages/LoginMusyrif';
import DashboardMusyrif from './pages/DashboardMusyrif';
import { supabase } from './lib/supabase';

function ProtectedRoute({ children, user }: { children: React.ReactNode; user: any }) {
  if (!user) return <Navigate to="/login" replace />;
  return <AppLayout>{children}</AppLayout>;
}

export default function App() {
  const [session, setSession] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
        <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-card">
          <Loader2 size={28} className="animate-spin text-white" />
        </div>
        <p className="text-sm text-slate-400 font-medium">Memuat Sistem...</p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/login" element={session ? <Navigate to="/data-santri" replace /> : <Login />} />
        <Route path="/login-wali" element={<LoginWali />} />
        <Route path="/login-musyrif" element={<LoginMusyrif />} />
        <Route path="/dashboard-wali" element={<DashboardWali />} />
        <Route path="/dashboard-musyrif" element={<DashboardMusyrif />} />

        {/* Protected Routes */}
        <Route path="/data-santri" element={<ProtectedRoute user={session}><DataSantri /></ProtectedRoute>} />
        <Route path="/data-akun-wali" element={<ProtectedRoute user={session}><DataAkunWali /></ProtectedRoute>} />
        <Route path="/data-referensi" element={<ProtectedRoute user={session}><DataReferensi /></ProtectedRoute>} />
        <Route path="/input-adab-ibadah" element={<ProtectedRoute user={session}><InputAdabIbadah /></ProtectedRoute>} />
        <Route path="/data-adab-ibadah" element={<ProtectedRoute user={session}><DataAdabIbadah /></ProtectedRoute>} />
        <Route path="/laporan-bulanan" element={<ProtectedRoute user={session}><LaporanBulanan /></ProtectedRoute>} />
        <Route path="/data-liburan" element={<ProtectedRoute user={session}><DataLiburan /></ProtectedRoute>} />
        <Route path="/tugas-liburan" element={<ProtectedRoute user={session}><TugasLiburan /></ProtectedRoute>} />
        <Route path="/laporan-liburan" element={<ProtectedRoute user={session}><LaporanLiburan /></ProtectedRoute>} />
      </Routes>
    </Router>
  );
}
