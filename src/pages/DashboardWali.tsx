import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { FileText, User, Calendar, MapPin, GraduationCap, LogOut, Loader2, BarChart3, MoonStar, Smartphone, Stethoscope } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { ProgressBar } from '../components/shared/ProgressBar';
import { useToast } from '../hooks/useToast';
import { FormLiburan } from '../components/wali/FormLiburan';
import { ProfilWali } from '../components/wali/ProfilWali';
import { DataPenitipanHpWali } from '../components/wali/DataPenitipanHpWali';
import { RekamMedisWali } from '../components/wali/RekamMedisWali';

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const barColors = ['#2dbdb6', '#69d2a1', '#7b61ff', '#ff6b6b', '#ffa94d', '#74c0fc', '#f06595', '#ffd43b'];
const getColor = (v: number) => v > 90 ? '#1a4267' : v > 75 ? '#3b82f6' : v > 60 ? '#eab308' : v > 40 ? '#f97316' : '#ef4444';
const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 26, g: 66, b: 103 };
};

export default function DashboardWali() {
    const today = new Date();
    const [monthYear, setMonthYear] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [selectedSantri, setSelectedSantri] = useState<any>(null);
    const [categoryReports, setCategoryReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [downloading, setDownloading] = useState(false);
    const [activeTab, setActiveTab] = useState<'asrama' | 'liburan' | 'hp' | 'kesehatan' | 'profile'>('asrama');
    const [showProfileDropdown, setShowProfileDropdown] = useState(false);
    const navigate = useNavigate();

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        const sessionStr = localStorage.getItem('wali_session');
        if (!sessionStr) {
            navigate('/login-wali', { replace: true });
            return;
        }

        try {
            const session = JSON.parse(sessionStr);
            if (!session.santriId) throw new Error("Invalid session");
            fetchSantriData(session.santriId);
        } catch {
            navigate('/login-wali', { replace: true });
        }
    }, []);

    const fetchSantriData = async (santriId: string) => {
        setLoading(true);
        try {
            const { data, error } = await supabase.from('santri')
                .select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))')
                .eq('id', santriId)
                .single();

            if (error || !data) {
                showToast('Data santri tidak ditemukan', 'error');
            } else {
                setSelectedSantri(data);
            }
        } catch {
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { if (selectedSantri) fetchData(); }, [selectedSantri, monthYear]);

    const fetchData = async () => {
        if (!selectedSantri) return;
        setLoading(true);
        const [yr, mo] = monthYear.split('-').map(Number);
        const start = new Date(yr, mo - 1, 1); const end = new Date(yr, mo, 0);
        const startStr = getLocalDateString(start); const endStr = getLocalDateString(end);
        const daysInMonth = end.getDate();
        try {
            const [catRes, actRes, recRes] = await Promise.all([
                supabase.from('kategori_kegiatan').select('*').order('created_at'),
                supabase.from('kegiatan').select('id, nama_kegiatan, kategori_id'),
                supabase.from('kegiatan_records').select('*').eq('santri_id', selectedSantri.id).gte('tanggal', startStr).lte('tanggal', endStr),
            ]);
            const cats = catRes.data || []; const acts = actRes.data || []; const recs = recRes.data || [];
            const actDict: Record<string, any> = {}; acts.forEach(a => { actDict[a.id] = a; });
            const reports = cats.map((cat, idx) => {
                const catRecs = recs.filter(r => actDict[r.kegiatan_id]?.kategori_id === cat.id);
                const myDict: Record<string, string> = {};
                acts.filter(a => a.kategori_id === cat.id).forEach(a => { myDict[a.id] = a.nama_kegiatan; });
                const chart = processDailyChart(catRecs, daysInMonth);
                const items = processByItem(catRecs, myDict);
                return { id: cat.id, title: cat.nama_kategori, chartColor: barColors[idx % barColors.length], chart, ...items };
            });
            setCategoryReports(reports.filter(r => r.items.length > 0));
        } catch (e) { console.error(e); }
        finally { setLoading(false); }
    };

    const processDailyChart = (recs: any[], days: number) => {
        const byDay: Record<number, { t: number; d: number }> = {};
        for (let i = 1; i <= days; i++) byDay[i] = { t: 0, d: 0 };
        recs.forEach(r => { const d = new Date(r.tanggal + 'T00:00:00').getDate(); byDay[d].t++; if (r.is_done) byDay[d].d++; });
        return Array.from({ length: days }, (_, i) => {
            const d = i + 1; return { day: d, value: byDay[d].t > 0 ? Math.round((byDay[d].d / byDay[d].t) * 100) : 0 };
        });
    };

    const processByItem = (recs: any[], dict: Record<string, string>) => {
        const stats: Record<string, { s: number; t: number }> = {};
        Object.keys(dict).forEach(id => { stats[id] = { s: 0, t: 0 }; });
        recs.forEach(r => { if (stats[r.kegiatan_id]) { stats[r.kegiatan_id].t++; if (r.is_done) stats[r.kegiatan_id].s++; } });
        let gS = 0, gT = 0, no = 1;
        const items = Object.keys(stats).filter(id => stats[id].t > 0).map(id => {
            gT += stats[id].t; gS += stats[id].s;
            return { no: no++, aktivitas: dict[id], capaian: (stats[id].s / stats[id].t) * 100 };
        });
        return { items, avg: gT ? (gS / gT) * 100 : 0 };
    };

    const generatePDF = async () => {
        if (!selectedSantri) return showToast('Pilih santri terlebih dahulu', 'error');
        if (!categoryReports.length) return showToast('Tidak ada data kegiatan untuk bulan ini', 'error');
        setDownloading(true);
        try {
            const doc = new jsPDF();
            const [yr, mn] = monthYear.split('-'); const monthStr = monthNames[parseInt(mn) - 1];
            doc.setFontSize(16); doc.setTextColor(26, 66, 103);
            doc.text('LAPORAN BULANAN KEGIATAN & PRESTASI', 105, 15, { align: 'center' });
            doc.setFontSize(9); doc.setTextColor(100);
            doc.text(`Periode: ${monthStr} ${yr}`, 105, 22, { align: 'center' });
            autoTable(doc, {
                startY: 30, head: [],
                body: [
                    ['Nama', ':', selectedSantri.nama, 'Musyrif', ':', selectedSantri.kamars?.musyrifs?.nama || '-'],
                    ['Kelas', ':', selectedSantri.kelas_list?.nama_kelas || '-', 'Kamar', ':', selectedSantri.kamars?.nama_kamar || '-'],
                ],
                theme: 'plain', styles: { fontSize: 8 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 20 }, 1: { cellWidth: 5 }, 3: { fontStyle: 'bold', cellWidth: 20 }, 4: { cellWidth: 5 } }
            });
            let y = (doc as any).lastAutoTable.finalY + 10;
            doc.setFontSize(13); doc.setTextColor(26, 66, 103); doc.text('RINGKASAN PENCAPAIAN', 14, y); y += 10;
            const sz = 24; const perRow = 4;
            categoryReports.forEach((cat, idx) => {
                const row = Math.floor(idx / perRow); const col = idx % perRow;
                const rw = Math.min(categoryReports.length - row * perRow, perRow) * 40;
                const rx = (210 - rw) / 2 + 20; const x = rx + col * 40; const cy = y + row * 34;
                const rgb = hexToRgb(getColor(cat.avg));
                doc.setFillColor(rgb.r, rgb.g, rgb.b); doc.circle(x, cy + sz / 2, sz / 2, 'F');
                doc.setTextColor(255); doc.setFontSize(6.5);
                doc.text(cat.title, x, cy + sz / 2 - 2, { align: 'center', maxWidth: 18 });
                doc.setFontSize(9); doc.setFont('helvetica', 'bold');
                doc.text(`${cat.avg.toFixed(1)}%`, x, cy + sz / 2 + 4, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            });
            y += (Math.ceil(categoryReports.length / perRow) * 34) + 8;
            for (let i = 0; i < categoryReports.length; i += 2) {
                const c1 = categoryReports[i]; const c2 = categoryReports[i + 1] || null;
                if (y > 240) { doc.addPage(); y = 20; }
                autoTable(doc, { startY: y, margin: { left: 14 }, tableWidth: 88, head: [[{ content: `% Capaian ${c1.title}`, colSpan: 3, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', '%']], body: c1.items.map((it: any) => [it.no, it.aktivitas.length > 30 ? it.aktivitas.slice(0, 27) + '...' : it.aktivitas, `${it.capaian.toFixed(1)}%`]), styles: { fontSize: 7, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 15 } } });
                let fy1 = (doc as any).lastAutoTable.finalY; let fy2 = fy1;
                if (c2) { autoTable(doc, { startY: y, margin: { left: 108 }, tableWidth: 88, head: [[{ content: `% Capaian ${c2.title}`, colSpan: 3, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', '%']], body: c2.items.map((it: any) => [it.no, it.aktivitas.length > 30 ? it.aktivitas.slice(0, 27) + '...' : it.aktivitas, `${it.capaian.toFixed(1)}%`]), styles: { fontSize: 7, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 15 } } }); fy2 = (doc as any).lastAutoTable.finalY; }
                y = Math.max(fy1, fy2) + 14;
            }
            const pc = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pc; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150); doc.text(`Dicetak: ${getLocalDateString()}`, 14, 285); doc.text(`Hal ${i}/${pc}`, 196, 285, { align: 'right' }); }
            doc.save(`Laporan_${selectedSantri.nama}_${monthStr}_${yr}.pdf`);
            showToast('PDF berhasil diunduh', 'success');
        } catch (e) { console.error(e); showToast('Gagal membuat PDF', 'error'); }
        finally { setDownloading(false); }
    };

    const handleLogout = () => {
        localStorage.removeItem('wali_session');
        navigate('/');
    };

    if (loading && !selectedSantri) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-slate-50">
                <div className="w-16 h-16 rounded-2xl bg-primary flex items-center justify-center shadow-card">
                    <Loader2 size={28} className="animate-spin text-white" />
                </div>
                <p className="text-sm text-slate-400 font-medium">Memuat Data Santri...</p>
            </div>
        );
    }

    const navItems = [
        { id: 'asrama', icon: BarChart3, label: 'Laporan Asrama' },
        { id: 'liburan', icon: MoonStar, label: 'Kegiatan Liburan' },
        { id: 'hp', icon: Smartphone, label: 'Penitipan HP' },
        { id: 'kesehatan', icon: Stethoscope, label: 'Rekam Medis' },
        { id: 'profile', icon: User, label: 'Profil Wali' },
    ];

    return (
        <div className="flex min-h-screen bg-slate-50">
            {/* Desktop Sidebar */}
            <aside className="hidden md:flex flex-col w-64 min-h-screen bg-slate-900 shrink-0 shadow-2xl fixed inset-y-0 left-0 z-50 border-r border-white/5">
                <div className="flex items-center gap-3 px-6 py-8 border-b border-white/5">
                    <div className="w-12 h-12 rounded-2xl bg-white flex items-center justify-center shadow-lg shrink-0 overflow-hidden p-1.5 border border-slate-100">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain" />
                    </div>
                    <div>
                        <h2 className="text-white font-bold text-base leading-tight tracking-tight">Wali Santri</h2>
                        <div className="flex items-center gap-1.5 mt-1">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-white/40 text-[10px] font-bold uppercase tracking-[0.1em]">Online Dashboard</p>
                        </div>
                    </div>
                </div>

                <div className="flex-1 py-8 px-4 space-y-8 overflow-y-auto custom-scrollbar">
                    <div className="space-y-2">
                        <div className="px-4 text-[10px] font-black text-white/20 uppercase tracking-[0.2em] mb-4">Navigasi Utama</div>
                        <nav className="space-y-1.5">
                            {navItems.map(({ id, icon: Icon, label }) => (
                                <button
                                    key={id}
                                    onClick={() => setActiveTab(id as any)}
                                    className={`flex items-center w-full gap-3.5 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all duration-300 group relative overflow-hidden ${activeTab === id
                                        ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-900/40'
                                        : 'text-white/50 hover:bg-white/5 hover:text-white'
                                        }`}
                                >
                                    <Icon size={20} className={activeTab === id ? 'text-white' : 'text-white/40 group-hover:text-white group-hover:scale-110 transition-transform'} />
                                    <span>{label}</span>
                                    {activeTab === id && (
                                        <div className="ml-auto w-1.5 h-1.5 rounded-full bg-white shadow-[0_0_8px_white]" />
                                    )}
                                </button>
                            ))}
                        </nav>
                    </div>

                    <div className="bg-indigo-950/40 rounded-3xl p-5 border border-white/5 relative overflow-hidden group">
                        <div className="absolute top-0 right-0 -mr-4 -mt-4 w-16 h-16 bg-indigo-500/10 rounded-full blur-xl group-hover:bg-indigo-500/20 transition-all" />
                        <p className="text-white/30 text-[10px] uppercase font-bold tracking-widest mb-3">Info Santri</p>
                        <h4 className="text-white font-bold text-sm truncate">{selectedSantri?.nama || 'Memuat...'}</h4>
                        <p className="text-white/40 text-xs mt-1 font-medium">{selectedSantri?.kelas_list?.nama_kelas || '-'}</p>
                    </div>
                </div>

                <div className="p-4 border-t border-white/5">
                    <button
                        onClick={handleLogout}
                        className="flex items-center gap-3.5 w-full px-5 py-3.5 rounded-2xl text-white/40 hover:bg-red-500/10 hover:text-red-400 text-sm font-bold transition-all group"
                    >
                        <LogOut size={18} className="group-hover:-translate-x-1 transition-transform" />
                        <span>Keluar Sistem</span>
                    </button>
                </div>
            </aside>

            {/* Mobile Top Bar */}
            <div className="md:hidden fixed top-0 left-0 right-0 z-40 bg-indigo-700 px-4 h-14 flex items-center justify-between shadow-md">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center overflow-hidden shrink-0">
                        <img src="/logo.png" alt="Logo" className="w-full h-full object-contain p-0.5" />
                    </div>
                    <span className="text-white font-bold text-sm">Dashboard Wali</span>
                </div>
                <div className="relative">
                    <button
                        onClick={() => setShowProfileDropdown(!showProfileDropdown)}
                        className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center hover:bg-white/30 text-white transition-colors"
                    >
                        <User size={15} />
                    </button>
                    {showProfileDropdown && (
                        <>
                            <div className="fixed inset-0 z-30" onClick={() => setShowProfileDropdown(false)} />
                            <div className="absolute right-0 top-10 mt-1 w-48 bg-white rounded-2xl shadow-xl z-50 border border-slate-100 overflow-hidden animate-slide-up origin-top-right">
                                <button
                                    onClick={() => { setActiveTab('profile'); setShowProfileDropdown(false); }}
                                    className="w-full text-left px-4 py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 flex items-center gap-2"
                                >
                                    <User size={16} className="text-slate-400" /> Profil Wali
                                </button>
                                <button
                                    onClick={handleLogout}
                                    className="w-full text-left px-4 py-3 text-sm font-semibold text-red-600 hover:bg-red-50 flex items-center gap-2 border-t border-slate-100"
                                >
                                    <LogOut size={16} className="text-red-400" /> Keluar Sistem
                                </button>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Mobile Bottom Navigation */}
            <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/97 backdrop-blur-md border-t border-slate-200 shadow-[0_-4px_15px_rgba(0,0,0,0.05)] text-slate-400 pb-safe">
                <div className="flex justify-around items-center h-[62px] px-2">
                    {navItems.filter(nav => nav.id !== 'profile').map(({ id, icon: Icon, label }) => (
                        <button
                            key={id}
                            onClick={() => setActiveTab(id as any)}
                            className={`flex flex-col items-center gap-0.5 px-2 py-1.5 rounded-xl flex-1 min-w-0 transition-all ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'
                                }`}
                        >
                            <div className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all ${activeTab === id ? 'bg-indigo-50 -translate-y-1 shadow-sm' : ''
                                }`}>
                                <Icon size={20} className={activeTab === id ? 'text-indigo-600' : 'text-slate-400'} />
                            </div>
                            <span className={`text-[10px] font-semibold truncate w-full text-center ${activeTab === id ? 'text-indigo-600' : 'text-slate-400'
                                }`}>{label}</span>
                        </button>
                    ))}
                </div>
            </nav>

            {/* Main Content Area */}
            <main className="flex-1 min-w-0 pt-14 pb-[70px] md:pt-0 md:pb-0 overflow-x-hidden md:ml-64 w-full">
                <div className="p-4 md:p-8 max-w-screen-lg mx-auto animate-fade-in pb-12">
                    {/* Selected Santri Dashboard */}
                    {selectedSantri && activeTab === 'asrama' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7 animate-slide-up">
                            {/* Top row */}
                            <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-2 flex-wrap mb-3">
                                        <h3 className="text-xl md:text-2xl font-bold text-slate-800 break-words">Ananda {selectedSantri.nama}</h3>
                                        <span className="px-2.5 py-0.5 bg-primary text-white text-xs font-semibold rounded-full shrink-0">SANTRI</span>
                                    </div>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                        {[
                                            { icon: GraduationCap, label: selectedSantri.kelas_list?.nama_kelas || '-' },
                                            { icon: MapPin, label: selectedSantri.kamars?.nama_kamar || '-' },
                                            { icon: User, label: `Musyrif: ${selectedSantri.kamars?.musyrifs?.nama || '-'}` },
                                            { icon: Calendar, label: `${monthNames[parseInt(monthYear.split('-')[1]) - 1]} ${monthYear.split('-')[0]}` },
                                        ].map(({ icon: Icon, label }) => (
                                            <div key={label} className="flex items-center gap-1.5 text-slate-500 text-sm">
                                                <Icon size={15} className="shrink-0 text-slate-400" />
                                                <span className="truncate">{label}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                {/* Actions */}
                                <div className="flex flex-col gap-2 w-full sm:w-auto">
                                    <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)}
                                        className="h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all w-full sm:w-auto" />
                                    <Button icon={<FileText size={15} />} onClick={generatePDF} loading={downloading} fullWidth>
                                        Download Laporan
                                    </Button>
                                </div>
                            </div>

                            {/* Content */}
                            {loading ? (
                                <FullPageSpinner label="Memuat data pencapaian..." />
                            ) : categoryReports.length === 0 ? (
                                <EmptyState message="Belum ada data kegiatan untuk bulan ini." />
                            ) : (
                                <div className="space-y-6">
                                    {/* Summary Cards Grid */}
                                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                                        {categoryReports.map(cat => (
                                            <div key={cat.id} className="bg-white rounded-3xl p-5 border border-slate-100 shadow-sm hover:shadow-md transition-all group overflow-hidden relative">
                                                <div
                                                    className="absolute top-0 right-0 w-24 h-24 -mr-8 -mt-8 rounded-full opacity-10 transition-transform group-hover:scale-110"
                                                    style={{ backgroundColor: getColor(cat.avg) }}
                                                />
                                                <div className="relative flex flex-col gap-4">
                                                    <div className="w-14 h-14 rounded-2xl flex items-center justify-center text-white shadow-lg shrink-0"
                                                        style={{ backgroundColor: getColor(cat.avg) }}>
                                                        <span className="text-lg font-black">{Math.round(cat.avg)}%</span>
                                                    </div>
                                                    <div>
                                                        <h4 className="font-bold text-slate-800 text-sm line-clamp-1 group-hover:text-primary transition-colors">{cat.title}</h4>
                                                        <p className="text-[11px] text-slate-400 font-medium uppercase tracking-wider mt-0.5">
                                                            {cat.avg > 90 ? 'Sangat Memuaskan' : cat.avg > 75 ? 'Perkembangan Baik' : 'Butuh Perhatian'}
                                                        </p>
                                                    </div>
                                                    <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full transition-all duration-1000"
                                                            style={{ width: `${cat.avg}%`, backgroundColor: getColor(cat.avg) }}
                                                        />
                                                    </div>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Charts Section */}
                                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                                        {categoryReports.map(cat => (
                                            <div key={cat.id} className="bg-white rounded-3xl p-6 border border-slate-100 shadow-sm">
                                                <div className="flex items-center justify-between mb-6">
                                                    <h4 className="font-bold text-slate-800 flex items-center gap-2">
                                                        <div className="w-4 h-4 rounded-lg shadow-sm" style={{ backgroundColor: cat.chartColor }} />
                                                        Grafik Harian {cat.title}
                                                    </h4>
                                                    <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest bg-slate-50 px-2 py-1 rounded-lg">Bulan Ini</span>
                                                </div>
                                                <div style={{ height: 220 }}>
                                                    <ResponsiveContainer width="100%" height="100%">
                                                        <BarChart data={cat.chart} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
                                                            <CartesianGrid strokeDasharray="4 4" vertical={false} stroke="#f1f5f9" />
                                                            <XAxis dataKey="day" tick={{ fontSize: 9, fontWeight: 700, fill: '#94a3b8' }} tickLine={false} axisLine={false} />
                                                            <YAxis hide domain={[0, 100]} />
                                                            <Tooltip
                                                                cursor={{ fill: '#f8fafc' }}
                                                                formatter={(v: any) => [`${v}%`, 'Capaian']}
                                                                contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', fontSize: '11px', fontWeight: 'bold' }}
                                                            />
                                                            <Bar dataKey="value" fill={cat.chartColor} radius={[6, 6, 0, 0]} barSize={12} />
                                                        </BarChart>
                                                    </ResponsiveContainer>
                                                </div>
                                            </div>
                                        ))}
                                    </div>

                                    {/* Legend */}
                                    <div className="flex flex-wrap gap-1.5">
                                        {[['0–40%', 'bg-red-400'], ['41–60%', 'bg-orange-400'], ['61–75%', 'bg-amber-400'], ['76–90%', 'bg-blue-500'], ['91–100%', 'bg-emerald-500']].map(([l, bg]) => (
                                            <span key={l} className={`${bg} text-white text-[10px] font-medium px-2 py-0.5 rounded-full`}>{l}</span>
                                        ))}
                                    </div>

                                    {/* Detail tables: 2-col on desktop */}
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        {categoryReports.map(cat => (
                                            <div key={cat.id} className="overflow-hidden rounded-2xl border border-slate-200">
                                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                    <h4 className="font-bold text-primary text-sm">Detail Capaian {cat.title}</h4>
                                                </div>
                                                <DataTable>
                                                    <thead><tr>
                                                        <Th>Aktivitas</Th><Th className="w-36">% Capaian</Th>
                                                    </tr></thead>
                                                    <tbody>
                                                        {cat.items.map((row: any) => (
                                                            <Tr key={row.no}>
                                                                <Td className="text-slate-700 text-xs leading-snug">{row.aktivitas}</Td>
                                                                <Td><ProgressBar value={row.capaian} height="h-1.5" /></Td>
                                                            </Tr>
                                                        ))}
                                                    </tbody>
                                                </DataTable>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Tab: Formulir Liburan */}
                    {selectedSantri && activeTab === 'liburan' && (
                        <FormLiburan santriId={selectedSantri.id} />
                    )}

                    {/* Tab: Penitipan HP */}
                    {selectedSantri && activeTab === 'hp' && (
                        <DataPenitipanHpWali santriId={selectedSantri.id} />
                    )}

                    {/* Tab: Rekam Medis */}
                    {selectedSantri && activeTab === 'kesehatan' && (
                        <RekamMedisWali santriId={selectedSantri.id} />
                    )}

                    {/* Tab: Profil Wali */}
                    {selectedSantri && activeTab === 'profile' && (
                        <ProfilWali nim={JSON.parse(localStorage.getItem('wali_session') || '{}').nim || ''} santri={selectedSantri} />
                    )}
                </div>
            </main>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
