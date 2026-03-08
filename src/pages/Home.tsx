import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { LogIn, BookOpen, LayoutDashboard, BarChart3, GraduationCap, ShieldCheck, UserCog, ChevronDown } from 'lucide-react';

export default function Home({ session }: { session?: any }) {
    const today = new Date();
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const menuRef = useRef<HTMLDivElement>(null);
    const [hasWaliSession, setHasWaliSession] = useState(false);
    const [hasMusyrifSession, setHasMusyrifSession] = useState(false);

    useEffect(() => {
        setHasWaliSession(!!localStorage.getItem('wali_session'));
        setHasMusyrifSession(!!localStorage.getItem('musyrif_session'));

        const handleClickOutside = (event: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
                setIsMenuOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Decorative Background */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none z-0">
                <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-400/10 blur-[120px]" />
                <div className="absolute top-[20%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-[120px]" />
                <div className="absolute bottom-[-10%] left-[20%] w-[35%] h-[35%] rounded-full bg-blue-300/10 blur-[100px]" />
            </div>

            {/* Navbar */}
            <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-xl border-b border-slate-200/50 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-[72px] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl bg-white flex items-center justify-center overflow-hidden shrink-0 shadow-sm border border-slate-100 p-1">
                            <img src="/logo.png" alt="Logo Pesantren Rabbaanii" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h1 className="font-extrabold text-primary text-base sm:text-lg leading-tight tracking-tight">Pesantren Rabbaanii</h1>
                            <p className="text-[10px] sm:text-xs text-slate-500 font-medium tracking-wide uppercase">Student Tracking System</p>
                        </div>
                    </div>
                    <div className="relative" ref={menuRef}>
                        <button
                            onClick={() => setIsMenuOpen(!isMenuOpen)}
                            className={`flex items-center gap-2 px-3 py-2 rounded-xl transition-all border ${isMenuOpen
                                ? 'bg-primary/5 border-primary/20 text-primary shadow-sm'
                                : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                                }`}
                        >
                            <UserCog size={18} />
                            <span className="text-sm font-bold hidden sm:inline">Portal Staff</span>
                            <ChevronDown size={14} className={`transition-transform duration-200 ${isMenuOpen ? 'rotate-180' : ''}`} />
                        </button>

                        {isMenuOpen && (
                            <div className="absolute right-0 mt-2 w-48 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-in fade-in zoom-in duration-200 origin-top-right">
                                <Link
                                    to={session ? "/data-santri" : "/login"}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-primary transition-colors"
                                >
                                    <LogIn size={16} className="text-slate-400" />
                                    <div>
                                        <p className="font-bold">{session ? "Buka Dashboard Admin" : "Login Admin"}</p>
                                        <p className="text-[10px] text-slate-400">Pengelolaan Pusat</p>
                                    </div>
                                </Link>
                                <div className="h-px bg-slate-100 my-1 mx-2" />
                                <Link
                                    to={hasMusyrifSession ? "/dashboard-musyrif" : "/login-musyrif"}
                                    className="flex items-center gap-3 px-4 py-2.5 text-sm text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-colors"
                                >
                                    <ShieldCheck size={16} className="text-slate-400" />
                                    <div>
                                        <p className="font-bold">{hasMusyrifSession ? "Buka Dashboard Musyrif" : "Login Musyrif"}</p>
                                        <p className="text-[10px] text-slate-400">Pembina Kamar</p>
                                    </div>
                                </Link>
                            </div>
                        )}
                    </div>
                </div>
            </header>

            <main className="relative z-10 flex-1 w-full max-w-5xl mx-auto px-4 py-8 pb-12 sm:py-12">
                {/* Hero */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-10 md:gap-14 mb-14 items-center">
                    {/* Left */}
                    <div>
                        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-blue-50 border border-blue-100 text-blue-600 text-xs font-semibold mb-6 shadow-sm">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-blue-500"></span>
                            </span>
                            Sistem Monitoring Aktif
                        </div>
                        <h2 className="text-4xl md:text-5xl font-extrabold text-slate-800 leading-[1.15] tracking-tight mb-5">
                            Pantau Perkembangan <span className="text-transparent bg-clip-text bg-gradient-to-r from-primary to-blue-500">Anak Anda</span>
                        </h2>
                        <p className="text-slate-500 text-base leading-relaxed mb-8 max-w-lg">
                            Login sebagai wali santri untuk melihat laporan capaian adab, ibadah, dan kegiatan harian secara langsung melalui sistem monitoring Pesantren Rabbaanii.
                        </p>

                        <div className="flex flex-wrap gap-4">
                            <Link to={hasWaliSession ? "/dashboard-wali" : "/login-wali"}>
                                <Button size="lg" className="rounded-2xl px-10 shadow-lg shadow-primary/20 hover:shadow-xl hover:shadow-primary/30 active:scale-95 transition-all" icon={<GraduationCap size={20} />}>
                                    {hasWaliSession ? "Masuk ke Dashboard Wali Santri" : "Login Wali Santri"}
                                </Button>
                            </Link>
                        </div>
                    </div>

                    <div className="space-y-4 hidden md:flex flex-col justify-center">
                        {[
                            { icon: BookOpen, title: 'Adab & Akhlak Harian', desc: 'Pemantauan sikap, kedisiplinan, dan etika santri dalam kesehariannya.', color: 'text-emerald-500', bg: 'bg-emerald-50' },
                            { icon: LayoutDashboard, title: 'Rekap Ibadah Wajib', desc: 'Monitoring konsistensi ibadah harian seperti shalat jamaah dan tilawah.', color: 'text-blue-500', bg: 'bg-blue-50' },
                            { icon: BarChart3, title: 'Laporan Perkembangan', desc: 'Akses laporan komprehensif dalam bentuk grafik interaktif dan PDF.', color: 'text-primary', bg: 'bg-primary/10' },
                        ].map(({ icon: Icon, title, desc, color, bg }) => (
                            <div key={title} className="group relative flex items-start gap-5 bg-white/60 backdrop-blur-md rounded-3xl border border-slate-200/60 p-5 shadow-sm hover:shadow-xl hover:shadow-slate-200/50 hover:bg-white hover:-translate-y-1 transition-all duration-300">
                                <div className={`w-12 h-12 rounded-2xl ${bg} flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform duration-300`}>
                                    <Icon size={24} className={color} />
                                </div>
                                <div className="pt-1">
                                    <p className="font-extrabold text-slate-800 text-base mb-1">{title}</p>
                                    <p className="text-sm text-slate-500 leading-relaxed">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </main>

            {/* Footer */}
            <footer className="relative z-10 bg-slate-900 text-white py-12 mt-auto">
                <div className="max-w-5xl mx-auto px-4 flex flex-col items-center text-center">
                    <div className="w-14 h-14 rounded-2xl bg-white border-2 border-slate-800 flex items-center justify-center overflow-hidden mb-6 shadow-xl p-1.5">
                        <img src="/logo.png" alt="Logo Pesantren Rabbaanii" className="w-full h-full object-contain" />
                    </div>
                    <p className="font-extrabold text-xl mb-2 tracking-tight">Pesantren Rabbaanii</p>
                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        Memberikan pendidikan terbaik dengan sistem monitoring yang transparan untuk mencetak generasi Rabbani yang beradab dan berilmu.
                    </p>
                    <p className="text-white/30 text-[10px] mt-4">© {today.getFullYear()} Pesantren Rabbaanii. All rights reserved.</p>
                </div>
            </footer>
        </div>
    );
}
