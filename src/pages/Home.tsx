import { useState, useEffect } from 'react';
import { Search, FileText, LayoutDashboard, User, Calendar, MapPin, GraduationCap, LogIn, BookOpen, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { ProgressBar } from '../components/shared/ProgressBar';
import { useToast } from '../hooks/useToast';

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const barColors = ['#2dbdb6', '#69d2a1', '#7b61ff', '#ff6b6b', '#ffa94d', '#74c0fc', '#f06595', '#ffd43b'];
const getColor = (v: number) => v > 90 ? '#1a4267' : v > 75 ? '#3b82f6' : v > 60 ? '#eab308' : v > 40 ? '#f97316' : '#ef4444';
const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 26, g: 66, b: 103 };
};

export default function Home() {
    const today = new Date();
    const [monthYear, setMonthYear] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundSantri, setFoundSantri] = useState<any[]>([]);
    const [selectedSantri, setSelectedSantri] = useState<any>(null);
    const [categoryReports, setCategoryReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) return showToast('Masukkan nama santri', 'error');
        setSearching(true); setSelectedSantri(null); setCategoryReports([]); setFoundSantri([]);
        try {
            const { data, error } = await supabase.from('santri')
                .select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))')
                .ilike('nama', `%${searchTerm.trim()}%`).limit(10);
            if (error) showToast(`Gagal mencari: ${error.message}`, 'error');
            else { setFoundSantri(data || []); if (!data?.length) showToast('Santri tidak ditemukan.', 'error'); }
        } catch { showToast('Terjadi kesalahan koneksi', 'error'); }
        finally { setSearching(false); }
    };

    useEffect(() => { if (selectedSantri) fetchData(); }, [selectedSantri, monthYear]);

    const fetchData = async () => {
        if (!selectedSantri) return;
        setLoading(true);
        const [yr, mo] = monthYear.split('-').map(Number);
        const start = new Date(yr, mo - 1, 1); const end = new Date(yr, mo, 0);
        const startStr = start.toISOString().split('T')[0]; const endStr = end.toISOString().split('T')[0];
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
        recs.forEach(r => { const d = new Date(r.tanggal).getDate(); byDay[d].t++; if (r.is_done) byDay[d].d++; });
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
            for (let i = 1; i <= pc; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150); doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 285); doc.text(`Hal ${i}/${pc}`, 196, 285, { align: 'right' }); }
            doc.save(`Laporan_${selectedSantri.nama}_${monthStr}_${yr}.pdf`);
            showToast('PDF berhasil diunduh', 'success');
        } catch (e) { console.error(e); showToast('Gagal membuat PDF', 'error'); }
        finally { setDownloading(false); }
    };

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col">
            {/* Navbar */}
            <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
                <div className="max-w-5xl mx-auto px-4 h-[60px] flex items-center justify-between gap-4">
                    <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-xl bg-primary flex items-center justify-center">
                            <LayoutDashboard size={16} className="text-white" />
                        </div>
                        <div>
                            <h1 className="font-bold text-primary text-sm leading-tight">Pesantren Rabbaanii</h1>
                            <p className="text-[10px] text-slate-400">Student Tracking System</p>
                        </div>
                    </div>
                    <Link to="/login">
                        <Button variant="primary" size="sm" icon={<LogIn size={14} />}>
                            <span className="hidden sm:inline">Admin Login</span>
                        </Button>
                    </Link>
                </div>
            </header>

            <main className="flex-1 w-full max-w-5xl mx-auto px-4 py-8 pb-12">
                {/* Hero */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-10 items-start">
                    {/* Left */}
                    <div>
                        <h2 className="text-3xl md:text-4xl font-extrabold text-primary leading-tight mb-3">
                            Pantau Perkembangan<br />Anak Anda
                        </h2>
                        <p className="text-slate-500 text-sm leading-relaxed mb-6">
                            Masukan nama santri untuk melihat laporan capaian adab, ibadah, dan kegiatan harian secara langsung melalui sistem monitoring Pesantren Rabbaanii.
                        </p>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <div className="flex-1 relative">
                                <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                                <input
                                    type="text"
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    placeholder="Klik di sini, ketik nama santri..."
                                    className="w-full h-11 pl-10 pr-4 rounded-2xl border border-slate-200 bg-white text-sm shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all"
                                />
                            </div>
                            <Button type="submit" loading={searching} size="md" className="rounded-2xl px-5">Cari</Button>
                        </form>

                        {/* Search Results */}
                        {foundSantri.length > 0 && (
                            <div className="mt-2 bg-white rounded-2xl border border-slate-200 shadow-card overflow-hidden animate-slide-up">
                                {foundSantri.map(s => (
                                    <button key={s.id} onClick={() => { setSelectedSantri(s); setFoundSantri([]); }}
                                        className="flex items-center gap-3 w-full px-4 py-3 hover:bg-primary-light text-left transition-colors border-b border-slate-50 last:border-0">
                                        <div className="w-7 h-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                                            <User size={13} className="text-primary" />
                                        </div>
                                        <div>
                                            <p className="font-semibold text-slate-800 text-sm leading-tight">{s.nama}</p>
                                            <p className="text-xs text-slate-400">{s.kelas_list?.nama_kelas || '-'} · {s.kamars?.nama_kamar || '-'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Right: Feature cards */}
                    <div className="space-y-3 hidden md:block">
                        {[
                            { icon: BookOpen, title: 'Pantau Adab Harian', desc: 'Lihat capaian akhlak dan adab santri setiap harinya.' },
                            { icon: LayoutDashboard, title: 'Rekap Ibadah', desc: 'Monitoring konsistensi ibadah santri setiap bulan.' },
                            { icon: BarChart3, title: 'Laporan Bulanan', desc: 'Grafik dan tabel capaian otomatis tersedia dalam PDF.' },
                        ].map(({ icon: Icon, title, desc }) => (
                            <div key={title} className="flex items-center gap-4 bg-white rounded-2xl border border-slate-200 p-4 shadow-sm hover:shadow-card transition-shadow">
                                <div className="w-10 h-10 rounded-xl bg-primary-light flex items-center justify-center shrink-0">
                                    <Icon size={20} className="text-primary" />
                                </div>
                                <div>
                                    <p className="font-bold text-slate-800 text-sm">{title}</p>
                                    <p className="text-xs text-slate-400 mt-0.5">{desc}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Selected Santri Dashboard */}
                {selectedSantri && (
                    <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7 animate-slide-up">
                        {/* Top row */}
                        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
                            <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2 flex-wrap mb-3">
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-800 break-words">{selectedSantri.nama}</h3>
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
                                {/* Summary circles */}
                                <div className="flex flex-wrap gap-4">
                                    {categoryReports.map(cat => (
                                        <div key={cat.id} className="flex items-center gap-3 bg-slate-50 rounded-2xl p-3 flex-1 min-w-[200px] border border-slate-100">
                                            <div className="w-16 h-16 rounded-full flex flex-col items-center justify-center text-white shrink-0"
                                                style={{ backgroundColor: getColor(cat.avg) }}>
                                                <span className="text-[9px] font-medium leading-tight text-center px-1">{cat.title}</span>
                                                <span className="text-base font-bold">{cat.avg.toFixed(1)}%</span>
                                            </div>
                                            <div>
                                                <p className="font-bold text-slate-800 text-sm">{cat.title}</p>
                                                <p className="text-xs text-slate-400">
                                                    {cat.avg > 90 ? 'Sangat Memuaskan' : cat.avg > 75 ? 'Perkembangan Baik' : 'Butuh Perhatian'}
                                                </p>
                                            </div>
                                        </div>
                                    ))}
                                </div>

                                {/* Charts per category */}
                                {categoryReports.map(cat => (
                                    <div key={cat.id} className="bg-slate-50 rounded-2xl p-4 border border-slate-100">
                                        <h4 className="font-bold text-slate-700 text-sm mb-3 flex items-center gap-2">
                                            <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: cat.chartColor }} />
                                            Grafik Harian {cat.title}
                                        </h4>
                                        <div style={{ height: 180 }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={cat.chart} margin={{ top: 5, right: 5, left: -24, bottom: 0 }}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={false} />
                                                    <YAxis hide domain={[0, 100]} />
                                                    <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', fontSize: 11 }} />
                                                    <Bar dataKey="value" fill={cat.chartColor} radius={[3, 3, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ))}

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
            </main>

            {/* Footer */}
            <footer className="bg-primary text-white py-6 mt-auto">
                <div className="max-w-5xl mx-auto px-4 text-center">
                    <p className="font-bold text-base mb-1">Pesantren Rabbaanii</p>
                    <p className="text-white/60 text-xs leading-relaxed max-w-md mx-auto">
                        Memberikan pendidikan terbaik dengan sistem monitoring yang transparan untuk mencetak generasi Rabbani yang beradab dan berilmu.
                    </p>
                    <p className="text-white/30 text-[10px] mt-4">© {today.getFullYear()} Pesantren Rabbaanii. All rights reserved.</p>
                </div>
            </footer>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
