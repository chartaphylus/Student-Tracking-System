import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogIn, Eye, EyeOff, LayoutGrid } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { Button } from '../components/ui/Button';

export default function Login() {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [showPw, setShowPw] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
            setError('Email atau password salah. Silakan coba lagi.');
        } else {
            navigate('/data-santri');
        }
        setLoading(false);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-slate-100 flex items-center justify-center p-4">
            <div className="w-full max-w-sm animate-slide-up">
                {/* Logo */}
                <div className="flex flex-col items-center mb-8 gap-3">
                    <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-card">
                        <LayoutGrid size={32} className="text-white" />
                    </div>
                    <div className="text-center">
                        <h1 className="text-2xl font-bold text-primary">Selamat Datang</h1>
                        <p className="text-slate-400 text-sm mt-0.5">Login ke Sistem Adab & Ibadah</p>
                    </div>
                </div>

                {/* Card */}
                <div className="bg-white rounded-2xl shadow-card p-6 border border-slate-100">
                    <form onSubmit={handleLogin} className="space-y-4">
                        {/* Email */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Email</label>
                            <input
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                required
                                autoFocus
                                placeholder="admin@pesantren.id"
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-300
                  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all"
                            />
                        </div>

                        {/* Password */}
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                            <div className="relative">
                                <input
                                    type={showPw ? 'text' : 'password'}
                                    value={password}
                                    onChange={e => setPassword(e.target.value)}
                                    required
                                    placeholder="••••••••"
                                    className="w-full h-11 px-4 pr-11 rounded-xl border border-slate-200 bg-slate-50 text-sm placeholder:text-slate-300
                    focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all"
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPw(v => !v)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                                >
                                    {showPw ? <EyeOff size={18} /> : <Eye size={18} />}
                                </button>
                            </div>
                        </div>

                        {/* Error */}
                        {error && (
                            <p className="text-xs text-danger font-medium bg-danger/5 px-3 py-2 rounded-lg border border-danger/10">
                                {error}
                            </p>
                        )}

                        <Button type="submit" fullWidth loading={loading} size="lg" icon={<LogIn size={18} />}>
                            {loading ? 'Masuk...' : 'Login'}
                        </Button>
                    </form>
                </div>
            </div>
        </div>
    );
}
