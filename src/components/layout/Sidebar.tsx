import { NavLink, useNavigate } from 'react-router-dom';
import { LayoutDashboard, Users, BookOpen, ClipboardList, BarChart3, Database, LogOut, LayoutGrid } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const navItems = [
    { to: '/data-santri', icon: Users, label: 'Data Santri' },
    { to: '/data-referensi', icon: Database, label: 'Referensi' },
    { to: '/input-adab-ibadah', icon: ClipboardList, label: 'Input' },
    { to: '/data-adab-ibadah', icon: BookOpen, label: 'Kategori' },
    { to: '/laporan-bulanan', icon: BarChart3, label: 'Laporan' },
];

export default function Sidebar() {
    const navigate = useNavigate();

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <>
            {/* ── Desktop Sidebar (hidden on mobile) ── */}
            <aside className="hidden md:flex flex-col w-64 min-h-screen bg-primary shrink-0 shadow-sidebar">
                {/* Logo */}
                <div className="flex items-center gap-3 px-6 py-5 border-b border-white/10">
                    <div className="w-10 h-10 rounded-xl bg-white/20 flex items-center justify-center">
                        <LayoutGrid size={20} className="text-white" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-sm leading-tight">Pesantren</h2>
                        <p className="text-white/60 text-xs">Rabbaanii</p>
                    </div>
                </div>

                {/* Nav */}
                <nav className="flex-1 py-4 px-3 space-y-1">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => [
                                'flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-medium transition-all group',
                                isActive
                                    ? 'bg-white/15 text-white'
                                    : 'text-white/70 hover:bg-white/10 hover:text-white',
                            ].join(' ')}
                        >
                            {({ isActive }) => (
                                <>
                                    <Icon size={18} className={isActive ? 'text-amber-300' : 'text-white/70 group-hover:text-white'} />
                                    <span>{label}</span>
                                    {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-amber-300" />}
                                </>
                            )}
                        </NavLink>
                    ))}
                </nav>

                {/* Logout */}
                <div className="p-4 border-t border-white/10">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3 w-full px-4 py-2.5 rounded-xl text-white/70 hover:bg-white/10 hover:text-white text-sm font-medium transition-all"
                    >
                        <LogOut size={18} />
                        <span>Keluar</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile Top Bar ── */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-primary px-4 h-14 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-white/20 flex items-center justify-center">
                        <LayoutGrid size={14} className="text-white" />
                    </div>
                    <span className="text-white font-bold text-sm">IbadahKu</span>
                </div>
                <button
                    onClick={handleLogout}
                    className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 transition-colors"
                >
                    <LogOut size={15} className="text-white" />
                </button>
            </div>

            {/* ── Mobile Bottom Navigation ── */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)]">
                <div className="flex justify-around items-center h-[62px] px-2">
                    {navItems.map(({ to, icon: Icon, label }) => (
                        <NavLink
                            key={to}
                            to={to}
                            className={({ isActive }) => [
                                'flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 min-w-0 transition-all',
                                isActive ? 'text-primary' : 'text-slate-400',
                            ].join(' ')}
                        >
                            {({ isActive }) => (
                                <>
                                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${isActive ? 'bg-primary/10 -translate-y-1 shadow-sm' : ''
                                        }`}>
                                        <Icon size={20} className={isActive ? 'text-primary' : 'text-slate-400'} />
                                    </div>
                                    <span className={`text-[10px] font-semibold truncate w-full text-center ${isActive ? 'text-primary' : 'text-slate-400'
                                        }`}>{label}</span>
                                </>
                            )}
                        </NavLink>
                    ))}
                </div>
            </nav>
        </>
    );
}
