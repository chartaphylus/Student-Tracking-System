import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { CheckCircle2, Circle, FileText, Download } from 'lucide-react';
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
    const todayStr = getLocalDateString();
    const [musyrif, setMusyrif] = useState('');
    const [kamar, setKamar] = useState('');
    const [santriId, setSantriId] = useState('');
    const [santriList, setSantriList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    const [viewMode, setViewMode] = useState<'harian' | 'rekapan' | 'excel'>('harian');
    const [startDate, setStartDate] = useState(todayStr);
    const [endDate, setEndDate] = useState(todayStr);

    const [rekapanData, setRekapanData] = useState<any[]>([]);
    const [specialTasksRekapan, setSpecialTasksRekapan] = useState<any[]>([]);
    const [allSantriRekapan, setAllSantriRekapan] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [allRecords, setAllRecords] = useState<any[]>([]);

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
        setLoadingRekapan(true);
        try {
            let recQuery = supabase.from('record_liburan').select('*')
                .gte('tanggal', startDate)
                .lte('tanggal', endDate);

            if (santriId) {
                recQuery = recQuery.eq('santri_id', santriId);
            } else if (musyrif || kamar || musyrifId) {
                const santriIds = filteredSantri.map(s => s.id);
                if (santriIds.length > 0) {
                    recQuery = recQuery.in('santri_id', santriIds);
                } else {
                    setCategories([]); setItems([]); setAllRecords([]); setRekapanData([]); setAllSantriRekapan([]);
                    setLoadingRekapan(false);
                    return;
                }
            }

            const [cRes, iRes, rRes] = await Promise.all([
                supabase.from('kategori_liburan').select('*').order('created_at'),
                supabase.from('item_liburan').select('*').order('created_at'),
                recQuery
            ]);

            const cats = cRes.data || [];
            const itemList = iRes.data || [];
            const recs = rRes.data || [];

            setCategories(cats);
            setItems(itemList);
            setAllRecords(recs);

            if (santriId) {
                const sDt = new Date(startDate + 'T00:00:00');
                const eDt = new Date(endDate + 'T00:00:00');
                const totalDays = Math.max(1, Math.floor((eDt.getTime() - sDt.getTime()) / (1000 * 3600 * 24)) + 1);

                const result = cats.map(c => {
                    const cItems = itemList.filter(i => i.kategori_id === c.id);
                    const itemsReport = cItems.map(item => {
                        const itemRecs = recs.filter(r => r.item_id === item.id && r.santri_id === santriId);
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
                const mySpecialRes = await supabase.from('tugas_liburan_santri').select('*').eq('santri_id', santriId);
                setSpecialTasksRekapan(mySpecialRes.data || []);
            } else {
                // Global recap (all santri in current filter)
                const globalData = filteredSantri.map(s => {
                    const sRecs = recs.filter(r => r.santri_id === s.id);
                    const summary: any = { id: s.id, nama: s.nama, counts: {} };
                    itemList.forEach(it => {
                        const itRecs = sRecs.filter(r => r.item_id === it.id);
                        let count = 0;
                        itRecs.forEach(r => {
                            if (it.tipe_input === 'checkbox' && r.is_done) count++;
                            else if (it.tipe_input === 'text' && r.keterangan?.trim()) count++;
                        });
                        summary.counts[it.id] = count;
                    });
                    return summary;
                });
                setAllSantriRekapan(globalData);
            }

        } catch (error) {
            console.error(error);
            showToast('Gagal memproses data rekapan', 'error');
        } finally {
            setLoadingRekapan(false);
        }
    };

    useEffect(() => {
        if ((viewMode === 'rekapan' || viewMode === 'excel')) {
            handleFetchRekapan();
        }
    }, [viewMode, santriId, startDate, endDate, musyrif, kamar]);

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
            const sDt = new Date(startDate + 'T00:00:00'); const eDt = new Date(endDate + 'T00:00:00');
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
            ) : (
                <div className="space-y-6 animate-fade-in">
                    <div className="bg-white p-2 rounded-2xl border border-slate-200 shadow-sm flex flex-col sm:flex-row gap-2">
                        <button
                            onClick={() => setViewMode('harian')}
                            disabled={!santriId}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${viewMode === 'harian' ? 'bg-primary text-white shadow' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={16} className="inline mr-2 -mt-0.5" /> Laporan Harian
                        </button>
                        <button
                            onClick={() => setViewMode('rekapan')}
                            disabled={!santriId}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all disabled:opacity-50 ${viewMode === 'rekapan' ? 'bg-primary text-white shadow' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <FileText size={16} className="inline mr-2 -mt-0.5" /> Ringkasan Progres
                        </button>
                        <button
                            onClick={() => setViewMode('excel')}
                            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all ${viewMode === 'excel' ? 'bg-primary text-white shadow' : 'bg-transparent text-slate-500 hover:bg-slate-50'}`}
                        >
                            <Download size={16} className="inline mr-2 -mt-0.5" /> Tabel Excel (Rekapan)
                        </button>
                    </div>

                    {viewMode === 'harian' && (
                        activeSantri ? <FormLiburan santriId={activeSantri.id} readOnly={true} /> : <EmptyState message="Pilih santri untuk melihat laporan harian." />
                    )}

                    {viewMode === 'rekapan' && (
                        activeSantri ? (
                            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7">
                                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                    <div>
                                        <h3 className="text-xl md:text-2xl font-bold text-slate-800">Ringkasan Progres: {activeSantri.nama}</h3>
                                        <p className="text-sm text-slate-500 mt-1">Capaian rutinitas selama masa liburan.</p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={selectCls} />
                                        <span className="text-slate-400 font-medium">s/d</span>
                                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={selectCls} />
                                        <Button icon={<Download size={14} />} onClick={generatePDF} loading={downloading}>PDF</Button>
                                    </div>
                                </div>

                                {loadingRekapan ? (
                                    <div className="py-12 flex justify-center"><FullPageSpinner label="Menghitung rekapitulasi..." /></div>
                                ) : rekapanData.length === 0 ? (
                                    <EmptyState message="Tidak ada data item liburan." />
                                ) : (
                                    <div className="space-y-6">
                                        <div className="bg-blue-50 border border-blue-200 text-blue-800 p-3 rounded-xl text-sm mb-4">
                                            Total jangka waktu: <b>{Math.max(1, Math.floor((new Date(endDate + 'T00:00:00').getTime() - new Date(startDate + 'T00:00:00').getTime()) / (1000 * 3600 * 24)) + 1)} Hari</b>.
                                        </div>

                                        {specialTasksRekapan.length > 0 && (
                                            <div className="bg-amber-50/50 border border-amber-200 rounded-2xl overflow-hidden mb-6">
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
                                                        <h4 className="font-bold text-slate-700 text-sm">{cat.nama}</h4>
                                                    </div>
                                                    <DataTable>
                                                        <thead><tr><Th>Kegiatan</Th><Th className="w-24 text-center">Tuntas</Th><Th className="w-24">Capaian</Th></tr></thead>
                                                        <tbody>
                                                            {cat.items.map((it: any) => (
                                                                <Tr key={it.id}>
                                                                    <Td className="text-slate-700 text-xs font-medium">{it.nama}</Td>
                                                                    <Td className="text-center text-xs font-semibold">{it.doneCount} hari</Td>
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
                        ) : <EmptyState message="Pilih santri untuk melihat ringkasan progres." />
                    )}

                    {viewMode === 'excel' && (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7 overflow-hidden">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                                <div>
                                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">
                                        {activeSantri ? `Riwayat Harian: ${activeSantri.nama}` : 'Rekapan Semua Santri'}
                                    </h3>
                                    <p className="text-sm text-slate-500 mt-1">
                                        {activeSantri ? 'Tabel rincian pengisian setiap hari. Blok dan copy tabel di bawah untuk dipindah ke Excel.' : 'Tabel akumulasi capaian seluruh santri. Silakan copy untuk rekapitulasi Excel.'}
                                    </p>
                                </div>
                                <div className="flex items-center gap-2">
                                    <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className={selectCls} />
                                    <span className="text-slate-400 font-medium">s/d</span>
                                    <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className={selectCls} />
                                </div>
                            </div>

                            {loadingRekapan ? (
                                <div className="py-20 flex justify-center"><FullPageSpinner label="Membangun tabel..." /></div>
                            ) : (
                                <div className="overflow-x-auto border border-slate-200 rounded-xl">
                                    <table className="w-full text-xs text-left border-collapse min-w-[800px]">
                                        <thead>
                                            <tr className="bg-slate-100 border-b border-slate-300">
                                                <th className="p-3 border-r border-slate-300 font-bold" rowSpan={2}>
                                                    {activeSantri ? 'No' : 'No'}
                                                </th>
                                                <th className="p-3 border-r border-slate-300 font-bold" rowSpan={2}>
                                                    {activeSantri ? 'Hari/Tanggal' : 'Nama Santri'}
                                                </th>
                                                {categories.map(cat => {
                                                    const catItems = items.filter(i => i.kategori_id === cat.id);
                                                    if (catItems.length === 0) return null;
                                                    return (
                                                        <th key={cat.id} className="p-2 border-r border-slate-300 text-center font-bold bg-slate-50" colSpan={catItems.length}>
                                                            {cat.nama_kategori}
                                                        </th>
                                                    );
                                                })}
                                            </tr>
                                            <tr className="bg-slate-50 border-b border-slate-300">
                                                {categories.map(cat => {
                                                    const catItems = items.filter(i => i.kategori_id === cat.id);
                                                    return catItems.map(it => (
                                                        <th key={it.id} className="p-2 border-r border-slate-300 font-semibold text-[10px] w-24 text-center">
                                                            {it.nama_item}
                                                        </th>
                                                    ));
                                                })}
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {activeSantri ? (
                                                // Daily History for ONE santri
                                                (() => {
                                                    const days = [];
                                                    let curr = new Date(startDate + 'T00:00:00');
                                                    const end = new Date(endDate + 'T00:00:00');
                                                    while (curr <= end) {
                                                        days.push(getLocalDateString(curr));
                                                        curr.setDate(curr.getDate() + 1);
                                                    }
                                                    return days.map((dateStr, idx) => {
                                                        const dateObj = new Date(dateStr + 'T00:00:00');
                                                        const hari = dateObj.toLocaleDateString('id-ID', { weekday: 'long', day: 'numeric', month: 'short' });
                                                        return (
                                                            <tr key={dateStr} className="border-b border-slate-200 hover:bg-slate-50/50">
                                                                <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                                                                <td className="p-2 border-r border-slate-200 font-medium whitespace-nowrap">{hari}</td>
                                                                {categories.map(cat => {
                                                                    const catItems = items.filter(i => i.kategori_id === cat.id);
                                                                    return catItems.map(it => {
                                                                        const rec = allRecords.find(r => r.item_id === it.id && r.tanggal === dateStr);
                                                                        let content = '-';
                                                                        if (rec) {
                                                                            if (it.tipe_input === 'checkbox') {
                                                                                content = rec.is_done ? 'V' : '';
                                                                            } else {
                                                                                content = rec.keterangan || '';
                                                                            }
                                                                        }
                                                                        return (
                                                                            <td key={it.id} className="p-2 border-r border-slate-200 text-center">
                                                                                {content}
                                                                            </td>
                                                                        );
                                                                    });
                                                                })}
                                                            </tr>
                                                        );
                                                    });
                                                })()
                                            ) : (
                                                // Summary for ALL santri
                                                allSantriRekapan.map((s, idx) => (
                                                    <tr key={s.id} className="border-b border-slate-200 hover:bg-slate-50/50">
                                                        <td className="p-2 border-r border-slate-200 text-center">{idx + 1}</td>
                                                        <td className="p-2 border-r border-slate-200 font-medium">{s.nama}</td>
                                                        {categories.map(cat => {
                                                            const catItems = items.filter(i => i.kategori_id === cat.id);
                                                            return catItems.map(it => (
                                                                <td key={it.id} className="p-2 border-r border-slate-200 text-center font-bold text-indigo-600">
                                                                    {s.counts[it.id] || 0}
                                                                </td>
                                                            ));
                                                        })}
                                                    </tr>
                                                ))
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                            <div className="mt-4 p-3 bg-amber-50 rounded-xl text-amber-800 text-xs border border-amber-200">
                                <b>Tips:</b> Klik dan tahan di pojok kiri atas tabel, lalu seret hingga pojok kanan bawah untuk menyeleksi seluruh isi tabel. Setelah itu tekan <b>Ctrl + C</b> dan tempel di program Excel atau Google Sheets.
                            </div>
                        </div>
                    )}
                </div>
            )}
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
