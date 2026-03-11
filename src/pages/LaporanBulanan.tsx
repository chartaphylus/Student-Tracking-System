import { useState, useEffect, useMemo } from 'react';
import { FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { ProgressBar } from '../components/shared/ProgressBar';
import { useToast } from '../hooks/useToast';

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const barColors = ['#2dbdb6', '#69d2a1', '#7b61ff', '#ff6b6b', '#ffa94d', '#74c0fc', '#f06595', '#ffd43b'];
const hexToRgb = (hex: string) => {
    const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return r ? { r: parseInt(r[1], 16), g: parseInt(r[2], 16), b: parseInt(r[3], 16) } : { r: 26, g: 66, b: 103 };
};
const getColor = (v: number) => v > 90 ? '#1a4267' : v > 75 ? '#3b82f6' : v > 60 ? '#eab308' : v > 40 ? '#f97316' : '#ef4444';

const selectCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all`;

export default function LaporanBulanan({ musyrifId }: { musyrifId?: string }) {
    const today = new Date();
    const [monthYear, setMonthYear] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [musyrif, setMusyrif] = useState('');
    const [kamar, setKamar] = useState('');
    const [santriId, setSantriId] = useState('');
    const [santriList, setSantriList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [categoryReports, setCategoryReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => { fetchSantri(); }, []);
    useEffect(() => { checkAndFetchData(); }, [santriId, monthYear]);

    const fetchSantri = async () => {
        let sQuery = supabase.from('santri').select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))');
        let mQuery = supabase.from('musyrifs').select('*');
        let kQuery = supabase.from('kamars').select('*');

        if (musyrifId) {
            const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
            const roomIds = (rooms || []).map(r => r.id);
            sQuery = sQuery.in('kamar_id', roomIds);
            mQuery = mQuery.eq('id', musyrifId);
            kQuery = kQuery.eq('musyrif_id', musyrifId);
            // Pre-set musyrif filter
            setMusyrif(musyrifId);
        }

        const [sRes, mRes, kRes] = await Promise.all([
            sQuery.order('nama'),
            mQuery.order('nama'),
            kQuery.order('nama_kamar'),
        ]);
        if (sRes.data?.length) { setSantriList(sRes.data); }
        if (mRes.data) setMusyrifList(mRes.data);
        if (kRes.data) setKamarList(kRes.data);
    };

    const checkAndFetchData = async () => {
        if (!santriId) return;
        setLoading(true);
        const [year, month] = monthYear.split('-').map(Number);
        const start = new Date(year, month - 1, 1);
        const end = new Date(year, month, 0);
        const startStr = getLocalDateString(start);
        const endStr = getLocalDateString(end);
        const daysInMonth = end.getDate();

        try {
            const [catRes, actRes, recRes] = await Promise.all([
                supabase.from('kategori_kegiatan').select('*').order('created_at'),
                supabase.from('kegiatan').select('id, nama_kegiatan, kategori_id'),
                supabase.from('kegiatan_records').select('*').eq('santri_id', santriId).gte('tanggal', startStr).lte('tanggal', endStr),
            ]);
            const cats = catRes.data || [];
            const acts = actRes.data || [];
            const recs = recRes.data || [];
            const actDict: Record<string, any> = {};
            acts.forEach(a => { actDict[a.id] = a; });

            const reports = cats.map((cat, idx) => {
                const catRecs = recs.filter(r => actDict[r.kegiatan_id]?.kategori_id === cat.id);
                const catActs = acts.filter(a => a.kategori_id === cat.id);
                const myDict: Record<string, string> = {};
                catActs.forEach(a => { myDict[a.id] = a.nama_kegiatan; });
                return {
                    id: cat.id, title: cat.nama_kategori, chartColor: barColors[idx % barColors.length],
                    chart: processDailyChart(catRecs, daysInMonth),
                    weekly: processWeekly(catRecs),
                    ...processByItem(catRecs, myDict),
                };
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
            const d = i + 1;
            return { day: d, value: byDay[d].t > 0 ? Math.round((byDay[d].d / byDay[d].t) * 100) : 0 };
        });
    };

    const processWeekly = (recs: any[]) => {
        const weeks = [0, 1, 2, 3].map(i => ({ no: i + 1, pekan: `Pekan ${i + 1}`, t: 0, d: 0 }));
        recs.forEach(r => { const w = Math.min(Math.floor((new Date(r.tanggal + 'T00:00:00').getDate() - 1) / 7), 3); weeks[w].t++; if (r.is_done) weeks[w].d++; });
        const res = weeks.map(w => ({ ...w, jumlah: w.t, capaian: w.t ? (w.d / w.t) * 100 : 0 }));
        return res.every(r => r.jumlah === 0) ? [] : res;
    };

    const processByItem = (recs: any[], dict: Record<string, string>) => {
        const stats: Record<string, { s: number; t: number }> = {};
        Object.keys(dict).forEach(id => { stats[id] = { s: 0, t: 0 }; });
        recs.forEach(r => { if (stats[r.kegiatan_id]) { stats[r.kegiatan_id].t++; if (r.is_done) stats[r.kegiatan_id].s++; } });
        let gS = 0, gT = 0, no = 1;
        const items = Object.keys(stats).filter(id => stats[id].t > 0).map(id => {
            gT += stats[id].t; gS += stats[id].s;
            return { no: no++, aktivitas: dict[id], jml: stats[id].t, capaian: (stats[id].s / stats[id].t) * 100 };
        });
        return { items, avg: gT ? (gS / gT) * 100 : 0 };
    };

    const activeSantri = useMemo(() => santriList.find(s => s.id === santriId), [santriList, santriId]);
    const filteredSantri = useMemo(() => santriList.filter(s => {
        return (!kamar || s.kamar_id === kamar) && (!musyrif || s.kamars?.musyrif_id === musyrif);
    }), [santriList, kamar, musyrif]);
    const filteredKamars = useMemo(() => kamarList.filter(k => !musyrif || k.musyrif_id === musyrif), [kamarList, musyrif]);

    const generatePDF = async () => {
        if (!activeSantri) return showToast('Pilih santri terlebih dahulu', 'error');
        if (!categoryReports.length) return showToast('Tidak ada data untuk bulan ini', 'error');
        setDownloading(true);
        try {
            const doc = new jsPDF();
            const [yr, mn] = monthYear.split('-');
            const monthStr = monthNames[parseInt(mn) - 1];
            doc.setFontSize(16); doc.setTextColor(26, 66, 103);
            doc.text('LAPORAN BULANAN KEGIATAN & PRESTASI', 105, 15, { align: 'center' });
            doc.setFontSize(9); doc.setTextColor(100);
            doc.text(`Periode: ${monthStr} ${yr}`, 105, 22, { align: 'center' });
            autoTable(doc, {
                startY: 30, head: [],
                body: [
                    ['Nama', ':', activeSantri.nama, 'Musyrif', ':', activeSantri.kamars?.musyrifs?.nama || '-'],
                    ['Kelas', ':', activeSantri.kelas_list?.nama_kelas || '-', 'Kamar', ':', activeSantri.kamars?.nama_kamar || '-'],
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
                const rx = (210 - rw) / 2 + 20;
                const x = rx + col * 40; const cy = y + row * 34;
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
                const sy = y;
                autoTable(doc, { startY: sy, margin: { left: 14 }, tableWidth: 88, head: [[{ content: `${c1.title} / Pekan`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Pekan', 'Jml', '%']], body: c1.weekly.map((w: any) => [w.no, w.pekan, w.jumlah, `${w.capaian.toFixed(1)}%`]), styles: { fontSize: 7, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } } });
                let fy1 = (doc as any).lastAutoTable.finalY; let fy2 = fy1;
                if (c2) { autoTable(doc, { startY: sy, margin: { left: 108 }, tableWidth: 88, head: [[{ content: `${c2.title} / Pekan`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Pekan', 'Jml', '%']], body: c2.weekly.map((w: any) => [w.no, w.pekan, w.jumlah, `${w.capaian.toFixed(1)}%`]), styles: { fontSize: 7, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } } }); fy2 = (doc as any).lastAutoTable.finalY; }
                y = Math.max(fy1, fy2) + 10;
                if (y > 240) { doc.addPage(); y = 20; }
                const sy2 = y;
                autoTable(doc, { startY: sy2, margin: { left: 14 }, tableWidth: 88, head: [[{ content: `% Capaian ${c1.title}`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', 'Jml', '%']], body: c1.items.map((it: any) => [it.no, it.aktivitas.length > 30 ? it.aktivitas.slice(0, 27) + '...' : it.aktivitas, it.jml, `${it.capaian.toFixed(1)}%`]), styles: { fontSize: 6.5, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } } });
                fy1 = (doc as any).lastAutoTable.finalY; fy2 = fy1;
                if (c2) { autoTable(doc, { startY: sy2, margin: { left: 108 }, tableWidth: 88, head: [[{ content: `% Capaian ${c2.title}`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', 'Jml', '%']], body: c2.items.map((it: any) => [it.no, it.aktivitas.length > 30 ? it.aktivitas.slice(0, 27) + '...' : it.aktivitas, it.jml, `${it.capaian.toFixed(1)}%`]), styles: { fontSize: 6.5, cellPadding: 1 }, headStyles: { fillColor: [71, 85, 105] }, columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } } }); fy2 = (doc as any).lastAutoTable.finalY; }
                y = Math.max(fy1, fy2) + 14;
            }
            const pc = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pc; i++) { doc.setPage(i); doc.setFontSize(7); doc.setTextColor(150); doc.text(`Dicetak: ${new Date().toLocaleString('id-ID')}`, 14, 285); doc.text(`Hal ${i}/${pc}`, 196, 285, { align: 'right' }); }
            doc.save(`Laporan_${activeSantri.nama}_${monthStr}_${yr}.pdf`);
            showToast('PDF berhasil diunduh', 'success');
        } catch (e) { console.error(e); showToast('Gagal membuat PDF', 'error'); }
        finally { setDownloading(false); }
    };

    return (
        <div>
            {!musyrifId && (
                <PageHeader title="Laporan Bulanan Kegiatan" subtitle="Ringkasan capaian adab & ibadah santri per bulan." />
            )}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 flex flex-wrap gap-3 items-end">
                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Bulan & Tahun</label>
                    <input type="month" value={monthYear} onChange={e => setMonthYear(e.target.value)} className={selectCls} />
                </div>

                {!musyrifId && (
                    <div className="flex-1 min-w-[200px]">
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Musyrif</label>
                        <select value={musyrif} onChange={e => { setMusyrif(e.target.value); setKamar(''); }} className={selectCls}>
                            <option value="">Semua Musyrif</option>
                            {musyrifList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        </select>
                    </div>
                )}

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Kamar</label>
                    <select value={kamar} onChange={e => setKamar(e.target.value)} className={selectCls}>
                        <option value="">Semua Kamar</option>
                        {filteredKamars.map(k => <option key={k.id} value={k.id}>{k.nama_kamar}</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[200px]">
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Santri</label>
                    <select value={santriId} onChange={e => setSantriId(e.target.value)} className={selectCls}>
                        <option value="">Pilih santri...</option>
                        {filteredSantri.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.kelas_list?.nama_kelas || '-'})</option>)}
                    </select>
                </div>

                <div className="flex-1 min-w-[150px]">
                    <Button icon={<FileText size={15} />} onClick={generatePDF} loading={downloading} fullWidth>PDF</Button>
                </div>
            </div>

            {/* Content */}
            {loading ? (
                <FullPageSpinner label="Memproses laporan bulanan..." />
            ) : !activeSantri ? (
                <EmptyState message="Pilih santri untuk melihat laporan." />
            ) : categoryReports.length === 0 ? (
                <EmptyState message="Belum ada rekaman di bulan ini untuk santri tersebut." />
            ) : (
                <div className="space-y-6 animate-fade-in">
                    {/* Santri Info Card */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h2 className="text-center font-bold text-primary text-lg mb-4 tracking-wide">LAPORAN BULANAN ADAB & IBADAH</h2>
                        <div className="grid grid-cols-2 gap-2 text-sm">
                            {[
                                ['Santri', activeSantri.nama], ['Bulan', `${monthNames[parseInt(monthYear.split('-')[1]) - 1]} ${monthYear.split('-')[0]}`],
                                ['Kamar', activeSantri.kamars?.nama_kamar || '-'], ['Musyrif', activeSantri.kamars?.musyrifs?.nama || '-'],
                                ['Kelas', activeSantri.kelas_list?.nama_kelas || '-'],
                            ].map(([k, v]) => (
                                <div key={k} className="flex flex-col">
                                    <span className="text-xs text-slate-400 font-medium">{k}</span>
                                    <span className="font-semibold text-slate-800">{v}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Summary circles */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-5">
                        <h3 className="font-bold text-slate-700 text-sm mb-4 uppercase tracking-wide">Ringkasan Pencapaian</h3>
                        <div className="flex flex-wrap gap-6 justify-center">
                            {categoryReports.map(cat => (
                                <div key={cat.id} className="flex flex-col items-center gap-2">
                                    <div className="w-20 h-20 rounded-full flex flex-col items-center justify-center text-white text-center"
                                        style={{ backgroundColor: getColor(cat.avg) }}>
                                        <span className="text-[10px] font-medium leading-tight">{cat.title}</span>
                                        <span className="text-lg font-bold">{cat.avg.toFixed(1)}%</span>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Charts */}
                    {categoryReports.map(cat => (
                        <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 p-5">
                            <h3 className="font-bold text-slate-700 text-sm mb-4">Grafik Harian – {cat.title}</h3>
                            <div style={{ height: 220 }}>
                                <ResponsiveContainer width="100%" height="100%">
                                    <BarChart data={cat.chart} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                        <XAxis dataKey="day" tick={{ fontSize: 9 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                        <YAxis tick={{ fontSize: 9 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                                        <Tooltip formatter={(v: any) => [`${v}%`]} contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', fontSize: 11 }} />
                                        <Bar dataKey="value" fill={cat.chartColor} radius={[3, 3, 0, 0]} />
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                        </div>
                    ))}

                    {/* Legend */}
                    <div className="flex flex-wrap gap-2 justify-center pb-1">
                        {[['0–40%', 'bg-red-400'], ['41–60%', 'bg-orange-400'], ['61–75%', 'bg-amber-400'], ['76–90%', 'bg-blue-500'], ['91–100%', 'bg-emerald-500']].map(([label, bg]) => (
                            <span key={label} className={`${bg} text-white text-[10px] font-medium px-2.5 py-1 rounded-full`}>{label}</span>
                        ))}
                    </div>

                    {/* Weekly Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {categoryReports.map(cat => (
                            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <h4 className="font-bold text-slate-700 text-sm">{cat.title} Berdasarkan Pekan</h4>
                                </div>
                                <DataTable>
                                    <thead><tr>
                                        <Th>No</Th><Th>Pekan</Th><Th>Jumlah</Th><Th>% Capaian</Th>
                                    </tr></thead>
                                    <tbody>
                                        {cat.weekly.map((row: any) => (
                                            <Tr key={row.no}>
                                                <Td className="text-slate-400 text-xs">{row.no}</Td>
                                                <Td>{row.pekan}</Td>
                                                <Td>{row.jumlah}</Td>
                                                <Td><ProgressBar value={row.capaian} height="h-1.5" /></Td>
                                            </Tr>
                                        ))}
                                    </tbody>
                                </DataTable>
                            </div>
                        ))}
                    </div>

                    {/* Items Tables */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                        {categoryReports.map(cat => (
                            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                    <h4 className="font-bold text-slate-700 text-sm">% Capaian {cat.title}</h4>
                                </div>
                                <DataTable>
                                    <thead><tr>
                                        <Th>No</Th><Th>Aktivitas</Th><Th>Jml</Th><Th>% Capaian</Th>
                                    </tr></thead>
                                    <tbody>
                                        {cat.items.map((row: any) => (
                                            <Tr key={row.no}>
                                                <Td className="text-slate-400 text-xs">{row.no}</Td>
                                                <Td className="text-slate-700 leading-snug">{row.aktivitas}</Td>
                                                <Td className="text-xs">{row.jml}</Td>
                                                <Td><ProgressBar value={row.capaian} height="h-1.5" /></Td>
                                            </Tr>
                                        ))}
                                    </tbody>
                                </DataTable>
                            </div>
                        ))}
                    </div>

                    {/* Disclaimer */}
                    <div className="border-t border-slate-200 pt-4 text-xs text-slate-400 leading-relaxed">
                        <strong className="text-slate-500">Keterangan:</strong><br />
                        • <em>Aktivitas</em>: Jenis kegiatan yang diamati.<br />
                        • <em>Jumlah</em>: Total frekuensi aktivitas dalam satu bulan.<br />
                        • <em>% Capaian</em>: Persentase keberhasilan dibanding target.
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
