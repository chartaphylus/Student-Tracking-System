import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Pin, CheckCircle2, Circle, FileText, Download } from 'lucide-react';
import { ToastContainer } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { FormLiburan } from '../components/wali/FormLiburan';
import { FullPageSpinner } from '../components/ui/Spinner';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { ProgressBar } from '../components/shared/ProgressBar';
import { Button } from '../components/ui/Button';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

const selectCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all`;

export default function LaporanLiburan({ musyrifId }: { musyrifId?: string }) {
    const todayStr = new Date().toISOString().split('T')[0];
    const [musyrif, setMusyrif] = useState('');
    const [kamar, setKamar] = useState('');
    const [santriId, setSantriId] = useState('');
    const [santriList, setSantriList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'harian' | 'rekapan'>('harian');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [rekapanData, setRekapanData] = useState<any[]>([]);
    const [specialTasksRekapan, setSpecialTasksRekapan] = useState<any[]>([]);
    const [loadingRekapan, setLoadingRekapan] = useState(false);
    const [downloading, setDownloading] = useState(false);

    const { toasts, removeToast, showToast } = useToast();

    useEffect(() => {
        fetchSantri();
    }, []);

    const fetchSantri = async () => {
        setLoading(true);
        let sQuery = supabase.from('santri').select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))');
        let mQuery = supabase.from('musyrifs').select('*');
        let kQuery = supabase.from('kamars').select('*');

        if (musyrifId) {
            const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
            const roomIds = (rooms || []).map(r => r.id);
            sQuery = sQuery.in('kamar_id', roomIds);
            mQuery = mQuery.eq('id', musyrifId);
            kQuery = kQuery.eq('musyrif_id', musyrifId);
            setMusyrif(musyrifId);
        }

        const [sRes, mRes, kRes] = await Promise.all([
            sQuery.order('nama'),
            mQuery.order('nama'),
            kQuery.order('nama_kamar'),
        ]);
        if (sRes.data?.length) setSantriList(sRes.data);
        if (mRes.data) setMusyrifList(mRes.data);
        if (kRes.data) setKamarList(kRes.data);
        setLoading(false);
    };

    const activeSantri = useMemo(() => santriList.find(s => s.id === santriId), [santriList, santriId]);
    const filteredSantri = useMemo(() => santriList.filter(s => {
        return (!kamar || s.kamar_id === kamar) && (!musyrif || s.kamars?.musyrif_id === musyrif);
    }), [santriList, kamar, musyrif]);
    const filteredKamars = useMemo(() => kamarList.filter(k => !musyrif || k.musyrif_id === musyrif), [kamarList, musyrif]);

    const handleFetchRekapan = async () => {
        if (!activeSantri) return;
        setLoadingRekapan(true);
        try {
            const [catRes, itemRes, recRes, specialRes] = await Promise.all([
                supabase.from('kategori_liburan').select('*').order('created_at'),
                supabase.from('item_liburan').select('*').order('created_at'),
                supabase.from('record_liburan').select('*')
                    .eq('santri_id', santriId)
                    .gte('tanggal', startDate)
                    .lte('tanggal', endDate),
                supabase.from('tugas_liburan_santri').select('*')
                    .eq('santri_id', santriId)
            ]);

            const cats = catRes.data || [];
            const items = itemRes.data || [];
            const recs = recRes.data || [];

            const s = new Date(startDate);
            const e = new Date(endDate);
            const totalDays = Math.max(1, Math.floor((e.getTime() - s.getTime()) / (1000 * 3600 * 24)) + 1);

            const result = cats.map(c => {
                const cItems = items.filter(i => i.kategori_id === c.id);
                const itemsReport = cItems.map(item => {
                    const itemRecs = recs.filter(r => r.item_id === item.id);
                    let doneCount = 0;
                    itemRecs.forEach(r => {
                        if (item.tipe_input === 'checkbox') {
                            if (r.is_done) doneCount++;
                        } else {
                            if (r.keterangan && r.keterangan.trim().length > 0) doneCount++;
                        }
                    });

                    return {
                        id: item.id,
                        nama: item.nama_item,
                        tipe: item.tipe_input,
                        doneCount,
                        capaian: totalDays > 0 ? (doneCount / totalDays) * 100 : 0
                    };
                });

                return {
                    id: c.id,
                    nama: c.nama_kategori,
                    items: itemsReport
                };
            }).filter(c => c.items.length > 0);

            setRekapanData(result);
            setSpecialTasksRekapan(specialRes.data || []);
        } catch (error) {
            console.error(error);
            showToast('Gagal memproses data rekapan', 'error');
        } finally {
            setLoadingRekapan(false);
        }
    };

    useEffect(() => {
        if (viewMode === 'rekapan' && activeSantri) {
            handleFetchRekapan();
        }
    }, [viewMode, activeSantri, startDate, endDate]);

    const generatePDF = () => {
        if (!activeSantri || rekapanData.length === 0) {
            showToast('Data rekapan kosong', 'error');
            return;
        }
        setDownloading(true);
        try {
            const doc = new jsPDF();
            doc.setFontSize(14); doc.setTextColor(26, 66, 103);
            doc.text('REKAPAN KEGIATAN LIBURAN SANTRI', 105, 15, { align: 'center' });
            doc.setFontSize(10); doc.setTextColor(100);
            doc.text(`Periode: ${startDate} s/d ${endDate}`, 105, 22, { align: 'center' });

            autoTable(doc, {
                startY: 28, head: [],
                body: [
                    ['Nama Santri', ':', activeSantri.nama, 'Musyrif', ':', activeSantri.kamars?.musyrifs?.nama || '-'],
                    ['Kelas', ':', activeSantri.kelas_list?.nama_kelas || '-', 'Kamar', ':', activeSantri.kamars?.nama_kamar || '-'],
                ],
                theme: 'plain', styles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 }, 1: { cellWidth: 5 }, 3: { fontStyle: 'bold', cellWidth: 20 }, 4: { cellWidth: 5 } }
            });

            let y = (doc as any).lastAutoTable.finalY + 10;
            const sDt = new Date(startDate); const eDt = new Date(endDate);
            const tDays = Math.max(1, Math.floor((eDt.getTime() - sDt.getTime()) / (1000 * 3600 * 24)) + 1);

            doc.setFontSize(10); doc.setTextColor(26, 66, 103);
            doc.text(`Total Hari Libur: ${tDays} Hari`, 14, y);
            y += 8;

            if (specialTasksRekapan.length > 0) {
                if (y > 230) { doc.addPage(); y = 20; }
                const headSpecial = [[{ content: 'TUGAS KHUSUS DARI MUSYRIF', colSpan: 3, styles: { fillColor: [245, 158, 11] as [number, number, number] } }], ['No', 'Tugas', 'Status']];
                const bodySpecial = specialTasksRekapan.map((t, idx) => [idx + 1, t.judul, t.is_done ? 'TUNTAS' : 'BELUM']);

                autoTable(doc, {
                    startY: y, head: headSpecial as any, body: bodySpecial,
                    styles: { fontSize: 8 },
                    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 } }
                });
                y = (doc as any).lastAutoTable.finalY + 10;
            }

            rekapanData.forEach(cat => {
                const head = [[{ content: `Kategori: ${cat.nama}`, colSpan: 4, styles: { fillColor: [26, 66, 103] as [number, number, number], halign: 'left' } }], ['No', 'Kegiatan', 'Jml Hari Tuntas', '% Capaian']];
                const body = cat.items.map((it: any, idx: number) => [
                    idx + 1,
                    it.nama,
                    `${it.doneCount} hari`,
                    `${it.capaian.toFixed(1)}%`
                ]);

                if (y > 250) { doc.addPage(); y = 20; }

                autoTable(doc, {
                    startY: y, head: head as any, body: body,
                    styles: { fontSize: 8 },
                    headStyles: { fillColor: [71, 85, 105] as [number, number, number] },
                    columnStyles: { 0: { cellWidth: 10 }, 2: { cellWidth: 30 }, 3: { cellWidth: 30 } }
                });
                y = (doc as any).lastAutoTable.finalY + 10;
            });

            doc.save(`Rekapan_Liburan_${activeSantri.nama}_${startDate}_${endDate}.pdf`);
            showToast('PDF berhasil diunduh', 'success');
        } catch (e) {
            console.error(e);
            showToast('Gagal generate PDF', 'error');
        } finally {
            setDownloading(false);
        }
    };

    return (
        <div className="space-y-5">
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-6 grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
                {!musyrifId && (
                    <div>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Musyrif</label>
                        <select value={musyrif} onChange={e => { setMusyrif(e.target.value); setKamar(''); }} className={selectCls}>
                            <option value="">Semua Musyrif</option>
                            {musyrifList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                        </select>
                    </div>
                )}
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Kamar</label>
                    <select value={kamar} onChange={e => setKamar(e.target.value)} className={selectCls}>
                        <option value="">Semua Kamar</option>
                        {filteredKamars.map(k => <option key={k.id} value={k.id}>{k.nama_kamar}</option>)}
                    </select>
                </div>
                <div>
                    <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">Santri</label>
                    <select value={santriId} onChange={e => setSantriId(e.target.value)} className={selectCls}>
                        <option value="">Pilih santri...</option>
                        {filteredSantri.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.kelas_list?.nama_kelas || '-'})</option>)}
                    </select>
                </div>
            </div>

            {loading ? (
                <div className="py-12 flex justify-center"><FullPageSpinner label="Memuat data referensi..." /></div>
            ) : !activeSantri ? (
                <EmptyState message="Pilih santri untuk melihat laporan kegiatan liburannya." />
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setViewMode('harian')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === 'harian' ? 'bg-primary text-white shadow' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={16} className="inline mr-2 -mt-0.5" /> Laporan Harian
                        </button>
                        <button
                            onClick={() => setViewMode('rekapan')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === 'rekapan' ? 'bg-primary text-white shadow' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={16} className="inline mr-2 -mt-0.5" /> Rekapan & Persentase
                        </button>
                    </div>

                    {viewMode === 'harian' && (
                        <FormLiburan santriId={activeSantri.id} readOnly={true} />
                    )}

                    {viewMode === 'rekapan' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">Rekapan Kegiatan Liburan</h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        Pilih tentang tanggal liburan untuk melihat akumulasi pengisian rutinitas.
                                    </p>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-3">
                                    <div className="flex items-center gap-2 w-full sm:w-auto">
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={selectCls} />
                                        <span className="text-slate-400 font-medium">s/d</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={selectCls} />
                                    </div>
                                    <Button icon={<Download size={14} />} onClick={generatePDF} loading={downloading} className="w-full sm:w-auto">
                                        Download PDF
                                    </Button>
                                </div>
                            </div>

                            {loadingRekapan ? (
                                <div className="py-12 flex justify-center"><FullPageSpinner label="Menghitung rekapitulasi..." /></div>
                            ) : rekapanData.length === 0 ? (
                                <EmptyState message="Tidak ada data item liburan." />
                            ) : (
                                <div className="space-y-6">
                                    <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-sm mb-4">
                                        Total jangka waktu: <b>{Math.max(1, Math.floor((new Date(endDate).getTime() - new Date(startDate).getTime()) / (1000 * 3600 * 24)) + 1)} Hari</b>. Capaian diukur dari berapa hari aktivitas tersebut dilaporkan (dicentang / diisi uraiannya).
                                    </div>

                                    {specialTasksRekapan.length > 0 && (
                                        <div className="bg-amber-50/50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
                                            <div className="px-5 py-3 border-b border-amber-200 flex items-center gap-2">
                                                <Pin size={16} className="text-amber-500 rotate-45" />
                                                <h4 className="font-bold text-amber-900 text-sm">Status Tugas Khusus</h4>
                                            </div>
                                            <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                {specialTasksRekapan.map(task => (
                                                    <div key={task.id} className={`flex items-center gap-3 p-3 rounded-xl border ${task.is_done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-amber-100'}`}>
                                                        <div className={task.is_done ? 'text-emerald-500' : 'text-slate-300'}>
                                                            {task.is_done ? <CheckCircle2 size={18} /> : <Circle size={18} />}
                                                        </div>
                                                        <div className="flex-1 min-w-0">
                                                            <p className={`text-xs font-bold truncate ${task.is_done ? 'text-slate-400' : 'text-slate-800'}`}>{task.judul}</p>
                                                        </div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                        {rekapanData.map(cat => (
                                            <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
                                                <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
                                                    <h4 className="font-bold text-slate-700 text-sm flex items-center gap-2">
                                                        <div className="w-2 h-2 rounded-full bg-indigo-500" />
                                                        {cat.nama}
                                                    </h4>
                                                </div>
                                                <DataTable>
                                                    <thead><tr>
                                                        <Th>Kegiatan</Th>
                                                        <Th className="w-24 text-center">Tuntas</Th>
                                                        <Th className="w-24">Capaian</Th>
                                                    </tr></thead>
                                                    <tbody>
                                                        {cat.items.map((it: any) => (
                                                            <Tr key={it.id}>
                                                                <Td className="text-slate-700 text-xs font-medium leading-snug">{it.nama}</Td>
                                                                <Td className="text-center text-xs text-slate-500 font-semibold">{it.doneCount} hari</Td>
                                                                <Td><ProgressBar value={it.capaian} height="h-2" /></Td>
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
                </div>
            )}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
