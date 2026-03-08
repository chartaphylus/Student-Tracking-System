import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { Users, BookOpen, ClipboardList, BarChart3, Database, LogOut, Lock, MoonStar, FileText, Menu, X, Pin, Smartphone, Stethoscope } from 'lucide-react';
import { supabase } from '../../lib/supabase';

const navGroups = [
    {
        label: 'Utama',
        items: [
            { to: '/data-santri', icon: Users, label: 'Data Santri' },
            { to: '/data-akun-wali', icon: Lock, label: 'Akun Wali' },
        ]
    },
    {
        label: 'Master Data',
        items: [
            { to: '/data-referensi', icon: Database, label: 'Referensi' },
            { to: '/data-adab-ibadah', icon: BookOpen, label: 'Setup Asrama' },
            { to: '/data-liburan', icon: MoonStar, label: 'Setup Liburan' },
            { to: '/tugas-liburan', icon: Pin, label: 'Tugas Khusus' },
            { to: '/data-penitipan-hp', icon: Smartphone, label: 'Penitipan HP' },
            { to: '/inventaris-kesehatan', icon: Stethoscope, label: 'Kesehatan UKS' },
        ]
    },
    {
        label: 'Penilaian & Laporan',
        items: [
            { to: '/input-adab-ibadah', icon: ClipboardList, label: 'Input Asrama' },
            { to: '/laporan-bulanan', icon: BarChart3, label: 'Lap. Asrama' },
            { to: '/laporan-liburan', icon: FileText, label: 'Lap. Liburan' },
        ]
    }
];

export default function Sidebar() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);

    const handleLogout = async () => {
        await supabase.auth.signOut();
        navigate('/login');
    };

    return (
        <>
            {/* Backdrop for mobile drawer */}
            {isOpen && (
                <div
                    className="md:hidden fixed inset-0 bg-slate-900/50 z-40 backdrop-blur-sm transition-opacity"
                    onClick={() => setIsOpen(false)}
                />
            )}

            {/* ── Desktop & Mobile Drawer Sidebar ── */}
            <aside className={`fixed inset-y-0 left-0 z-50 flex flex-col w-64 min-h-screen bg-slate-900 shrink-0 shadow-2xl transition-transform duration-300 ease-in-out border-r border-white/5 md:translate-x-0 ${isOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                {/* Logo Section */}
                <div className="flex items-center justify-between gap-3 px-6 py-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0 overflow-hidden p-1.5 border border-slate-100">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm leading-tight tracking-tight">Rabbaanii</h2>
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.15em] mt-0.5">Admin Console</p>
                        </div>
                    </div>
                    <button onClick={() => setIsOpen(false)} className="md:hidden text-white/30 hover:text-white hover:bg-white/10 p-1.5 rounded-xl transition-colors">
                        <X size={20} />
                    </button>
                </div>

                {/* Navigation */}
                <nav className="flex-1 py-6 px-4 space-y-7 overflow-y-auto custom-scrollbar">
                    {navGroups.map((group) => (
                        <div key={group.label} className="space-y-1.5">
                            <div className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-3">
                                {group.label}
                            </div>
                            {group.items.map(({ to, icon: Icon, label }) => (
                                <NavLink
                                    key={to}
                                    to={to}
                                    onClick={() => setIsOpen(false)}
                                    className={({ isActive }) => [
                                        'flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-semibold transition-all duration-300 group',
                                        isActive
                                            ? 'bg-primary text-white shadow-lg shadow-primary/30'
                                            : 'text-white/50 hover:bg-white/5 hover:text-white',
                                    ].join(' ')}
                                >
                                    {({ isActive }) => (
                                        <>
                                            <Icon size={18} className={isActive ? 'text-white' : 'text-white/40 group-hover:text-white group-hover:scale-110 transition-transform'} />
                                            <span>{label}</span>
                                            {isActive && (
                                                <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                            )}
                                        </>
                                    )}
                                </NavLink>
                            ))}
                        </div>
                    ))}
                </nav>

                {/* Footer / Account */}
                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 w-full px-5 py-3.5 rounded-2xl text-white/40 hover:bg-red-500/10 hover:text-red-400 text-sm font-bold transition-all group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Sign Out</span>
                    </button>
                </div>
            </aside>

            {/* ── Mobile Top Bar ── */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-30 bg-primary px-4 h-14 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-3">
                    <button onClick={() => setIsOpen(true)} className="text-white p-1 -ml-1 hover:bg-white/10 rounded-lg">
                        <Menu size={22} />
                    </button>
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <span className="text-white font-bold text-sm">Pesantren Rabbaanii</span>
                </div>
            </div>
        </>
    );
}
