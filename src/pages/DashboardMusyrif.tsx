import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
    Users,
    LogOut,
    ClipboardList,
    AlertCircle,
    UserCircle,
    BarChart3,
    Settings,
    Palmtree,
    Pin,
    Menu,
    X,
    Smartphone,
    Stethoscope
} from 'lucide-react';
import { supabase } from '../lib/supabase';
import { FullPageSpinner } from '../components/ui/Spinner';
import { PageHeader } from '../components/layout/PageHeader';
import InputAdabIbadah from './InputAdabIbadah';
import DataAdabIbadah from './DataAdabIbadah';
import DataSantri from './DataSantri';
import DataAkunWali from './DataAkunWali';
import LaporanBulanan from './LaporanBulanan';
import DataLiburan from './DataLiburan';
import LaporanLiburan from './LaporanLiburan';
import TugasLiburan from './TugasLiburan';
import DataPenitipanHp from './DataPenitipanHp';
import InventarisKesehatan from './InventarisKesehatan';

export default function DashboardMusyrif() {
    const navigate = useNavigate();
    const [musyrif, setMusyrif] = useState<any>(null);
    const [rooms, setRooms] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState<'students' | 'input' | 'wali' | 'reports' | 'setup-dorm' | 'setup-lib' | 'task-lib' | 'rep-lib' | 'hp' | 'kesehatan'>('students');
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);

    useEffect(() => {
        const session = localStorage.getItem('musyrif_session');
        if (!session) {
            navigate('/login-musyrif');
            return;
        }
        try {
            const m = JSON.parse(session);
            setMusyrif(m);
            fetchData(m.id);
        } catch (e) {
            localStorage.removeItem('musyrif_session');
            navigate('/login-musyrif');
        }
    }, []);

    const fetchData = async (musyrifId: string) => {
        setLoading(true);
        try {
            const { data: roomsData } = await supabase
                .from('kamars')
                .select('id')
                .eq('musyrif_id', musyrifId);

            setRooms(roomsData || []);
        } catch (err) {
            console.error(err);
        }
        setLoading(false);
    };

    const handleLogout = () => {
        localStorage.removeItem('musyrif_session');
        navigate('/login-musyrif');
    };

    if (loading) return <FullPageSpinner label="Menyiapkan Dashboard Musyrif..." />;

    const navGroups = [
        {
            label: 'Utama',
            items: [
                { id: 'students', label: 'Data Santri', icon: Users },
                { id: 'wali', label: 'Akun Wali', icon: UserCircle },
            ]
        },
        {
            label: 'Asrama',
            items: [
                { id: 'setup-dorm', label: 'Setup Asrama', icon: Settings },
                { id: 'input', label: 'Input Kegiatan', icon: ClipboardList },
                { id: 'reports', label: 'Laporan Asrama', icon: BarChart3 },
            ]
        },
        {
            label: 'Liburan & Lainnya',
            items: [
                { id: 'setup-lib', label: 'Setup Liburan', icon: Palmtree },
                { id: 'rep-lib', label: 'Laporan Liburan', icon: Palmtree },
                { id: 'task-lib', label: 'Tugas Khusus', icon: Pin },
                { id: 'hp', label: 'Penitipan HP', icon: Smartphone },
                { id: 'kesehatan', label: 'UKS & Kesehatan', icon: Stethoscope },
            ]
        }
    ];

    return (
        <div className="flex min-h-screen bg-slate-50 overflow-x-hidden">
            {/* Mobile Sidebar Overlay */}
            {isSidebarOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-[60] md:hidden backdrop-blur-sm animate-fade-in"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}

            {/* Combined Sidebar (Desktop & Mobile) */}
            <aside className={`
                fixed inset-y-0 left-0 z-[70] flex flex-col w-72 bg-slate-900 shrink-0 shadow-2xl transition-transform duration-300 md:translate-x-0
                ${isSidebarOpen ? 'translate-x-0' : '-translate-x-full'}
                md:w-64 md:z-50 border-r border-white/5
            `}>
                <div className="flex items-center justify-between px-6 py-8 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-11 h-11 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0 overflow-hidden p-1.5 border border-slate-100">
                            <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                        </div>
                        <div>
                            <h2 className="text-white font-bold text-sm leading-tight tracking-tight">Musyrif Panel</h2>
                            <p className="text-white/40 text-[10px] truncate max-w-[120px] font-bold uppercase tracking-widest mt-0.5">{musyrif?.nama || 'Offline'}</p>
                        </div>
                    </div>
                    <button
                        className="md:hidden p-2 text-white/30 hover:text-white transition-colors"
                        onClick={() => setIsSidebarOpen(false)}
                    >
                        <X size={20} />
                    </button>
                </div>

                <nav className="flex-1 py-8 px-4 space-y-8 overflow-y-auto custom-scrollbar">
                    {navGroups.map(group => (
                        <div key={group.label} className="space-y-1.5">
                            <div className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">{group.label}</div>
                            {group.items.map(({ id, label, icon: Icon }) => (
                                <button
                                    key={id}
                                    onClick={() => { setActiveTab(id as any); setIsSidebarOpen(false); }}
                                    className={`flex items-center gap-3.5 w-full px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group ${activeTab === id ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40' : 'text-white/50 hover:bg-white/5 hover:text-white'}`}
                                >
                                    <Icon size={18} className={activeTab === id ? 'text-white' : 'text-white/40 group-hover:text-white group-hover:scale-110 transition-transform'} />
                                    <span>{label}</span>
                                    {activeTab === id && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    ))}
                </nav>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-4 w-full px-5 py-3.5 rounded-2xl text-white/40 hover:bg-red-500/10 hover:text-red-400 text-sm font-bold transition-all group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Keluar Sistem</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 z-50 flex items-center justify-between px-4">
                <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-white border border-slate-100 flex items-center justify-center p-1 shadow-sm">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <h1 className="font-bold text-slate-800 text-sm">Musyrif Panel</h1>
                </div>
                <button
                    onClick={() => setIsSidebarOpen(true)}
                    className="p-2.5 text-slate-500 hover:bg-slate-100 rounded-2xl transition-colors"
                >
                    <Menu size={20} />
                </button>
            </div>

            {/* Main Content */}
            <main className="flex-1 md:ml-64 p-4 md:p-8 pt-20 md:pt-8 pb-8 transition-all duration-500 min-w-0">
                <div className="max-w-7xl mx-auto">
                    <PageHeader
                        title={
                            activeTab === 'students' ? "Data Santri Binaan" :
                                activeTab === 'wali' ? "Kelola Akun Wali" :
                                    activeTab === 'input' ? "Input Rekaman Kegiatan" :
                                        activeTab === 'reports' ? "Laporan Bulanan" :
                                            activeTab === 'setup-dorm' ? "Kategori & Kegiatan" :
                                                activeTab === 'setup-lib' ? "Setup Item Liburan" :
                                                    activeTab === 'rep-lib' ? "Laporan Liburan Santri" :
                                                        activeTab === 'hp' ? "Pendataan Penitipan HP" :
                                                            activeTab === 'kesehatan' ? "UKS & Inventaris Kesehatan" :
                                                                "Tugas Khusus Liburan"
                        }
                        subtitle={
                            activeTab === 'students' ? `Daftar santri di bawah bimbingan ${musyrif?.nama || '...'}` :
                                activeTab === 'wali' ? "Kelola password login untuk orang tua/wali santri." :
                                    activeTab === 'input' ? "Pencatatan kegiatan harian santri di asrama." :
                                        activeTab === 'reports' ? "Grafik dan persentase capaian santri." :
                                            activeTab === 'setup-dorm' ? "Kelola kategori dan daftar kegiatan harian santri." :
                                                activeTab === 'setup-lib' ? "Konfigurasi item kegiatan selama masa liburan." :
                                                    activeTab === 'rep-lib' ? "Pantau kegiatan santri selama berada di rumah." :
                                                        activeTab === 'hp' ? "Pencatatan handphone santri yang dititipkan." :
                                                            activeTab === 'kesehatan' ? "Kelola data medis santri dan log ketersediaan obat UKS." :
                                                                "Berikan tugas tambahan bagi santri tertentu."
                        }
                        action={null}
                    />

                    <div className="mt-8 animate-fade-in">
                        {rooms.length === 0 ? (
                            <div className="bg-amber-50 border border-amber-200 p-8 rounded-[2rem] flex flex-col items-center text-center gap-4 max-w-2xl mx-auto">
                                <div className="w-20 h-20 rounded-full bg-amber-100 flex items-center justify-center text-amber-500">
                                    <AlertCircle size={40} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-amber-900 text-xl">Akses Terbatas</h3>
                                    <p className="text-amber-700 text-sm mt-2 leading-relaxed">
                                        Akun Anda belum dikaitkan dengan kamar manapun. Silakan hubungi Admin untuk mengatur penempatan kamar tanggung jawab Anda.
                                    </p>
                                </div>
                            </div>
                        ) : (
                            <>
                                {activeTab === 'students' && <DataSantri musyrifId={musyrif?.id} />}
                                {activeTab === 'wali' && <DataAkunWali musyrifId={musyrif?.id} />}
                                {activeTab === 'input' && <InputAdabIbadah musyrifContextId={musyrif?.id} />}
                                {activeTab === 'reports' && <LaporanBulanan musyrifId={musyrif?.id} />}
                                {activeTab === 'setup-dorm' && <DataAdabIbadah musyrifId={musyrif?.id} />}
                                {activeTab === 'setup-lib' && <DataLiburan musyrifId={musyrif?.id} />}
                                {activeTab === 'rep-lib' && <LaporanLiburan musyrifId={musyrif?.id} />}
                                {activeTab === 'task-lib' && <TugasLiburan musyrifId={musyrif?.id} />}
                                {activeTab === 'hp' && <DataPenitipanHp musyrifId={musyrif?.id} />}
                                {activeTab === 'kesehatan' && <InventarisKesehatan musyrifId={musyrif?.id} />}
                            </>
                        )}
                    </div>
                </div>
            </main>
        </div>
    );
}
