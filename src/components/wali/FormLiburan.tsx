import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { getLocalDateString } from '../../lib/dateUtils';
import { Calendar as CalendarIcon, MoonStar, Send, AlertTriangle, Pin, CheckCircle2, Circle, Download, FileText } from 'lucide-react';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';
import { FullPageSpinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';
import { Modal } from '../ui/Modal';
import { Button } from '../ui/Button';

interface FormLiburanProps {
    santriId: string;
    readOnly?: boolean;
}

export function FormLiburan({ santriId, readOnly = false }: FormLiburanProps) {
    const today = getLocalDateString();
    const [tanggal, setTanggal] = useState(today);

    const [loading, setLoading] = useState(true);
    const [categories, setCategories] = useState<any[]>([]);
    const [items, setItems] = useState<any[]>([]);
    const [records, setRecords] = useState<any[]>([]);
    const [specialTasks, setSpecialTasks] = useState<any[]>([]);

    const [savingItem, setSavingItem] = useState<string | null>(null);
    const [viewingPdf, setViewingPdf] = useState<string | null>(null);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [santriId, tanggal]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [catRes, itemRes, recRes, sntRes] = await Promise.all([
                supabase.from('kategori_liburan').select('*').order('created_at'),
                supabase.from('item_liburan').select('*').order('created_at'),
                supabase.from('record_liburan')
                    .select('*')
                    .eq('santri_id', santriId)
                    .eq('tanggal', tanggal),
                supabase.from('santri')
                    .select('id, nama, kamar_id, kelas_id')
                    .eq('id', santriId)
                    .single()
            ]);

            if (catRes.error && catRes.error.code === '42P01') {
                showToast('Tabel liburan belum ada di Database.', 'error');
                setLoading(false);
                return;
            }

            if (catRes.data) setCategories(catRes.data);
            if (itemRes.data) setItems(itemRes.data);
            if (recRes.data) setRecords(recRes.data);

            const santri = sntRes.data;
            if (santri) {
                const [personalRes, roomRes, classRes] = await Promise.all([
                    supabase.from('tugas_liburan_santri').select('*').eq('santri_id', santriId),
                    supabase.from('tugas_liburan_kamar').select('*').eq('kamar_id', santri.kamar_id),
                    supabase.from('tugas_liburan_kelas').select('*').eq('kelas_id', santri.kelas_id)
                ]);

                const allTasks = [
                    ...(personalRes.data || []).map(t => ({ ...t, targetType: 'Personal' })),
                    ...(roomRes.data || []).map(t => ({ ...t, targetType: 'Kamar' })),
                    ...(classRes.data || []).map(t => ({ ...t, targetType: 'Kelas' }))
                ].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

                setSpecialTasks(allTasks);
            }

        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const isToday = tanggal === today;
    const isEditable = !readOnly && isToday;

    const handleUpdateRecord = async (itemId: string, updates: { is_done?: boolean, keterangan?: string }) => {
        if (!isEditable) return;
        setSavingItem(itemId);

        const existing = records.find(r => r.item_id === itemId);

        let error;
        if (existing) {
            const { error: err } = await supabase
                .from('record_liburan')
                .update(updates)
                .eq('id', existing.id);
            error = err;
            if (!error) {
                setRecords(prev => prev.map(r => r.id === existing.id ? Object.assign({}, r, updates) : r));
            }
        } else {
            const { data, error: err } = await supabase
                .from('record_liburan')
                .insert([{
                    santri_id: santriId,
                    item_id: itemId,
                    tanggal: tanggal,
                    is_done: updates.is_done || false,
                    keterangan: updates.keterangan || ''
                }])
                .select()
                .single();
            error = err;
            if (!error && data) {
                setRecords(prev => [...prev, data]);
            }
        }

        if (error) {
            showToast('Gagal menyimpan: ' + error.message, 'error');
        }
        setSavingItem(null);
    };

    const handleToggleSpecialTask = async (task: any) => {
        if (readOnly || task.targetType !== 'Personal') return;
        setSavingItem(task.id);
        const { error } = await supabase
            .from('tugas_liburan_santri')
            .update({ is_done: !task.is_done })
            .eq('id', task.id);

        if (error) {
            showToast('Gagal: ' + error.message, 'error');
        } else {
            setSpecialTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t));
            showToast(!task.is_done ? 'Tugas selesai' : 'Tugas belum selesai', 'success');
        }
        setSavingItem(null);
    };

    const handleDownload = async (url: string, title: string) => {
        try {
            const response = await fetch(url);
            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = blobUrl;
            link.download = `${title.replace(/ /g, '_')}.pdf`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            window.URL.revokeObjectURL(blobUrl);
        } catch (error) {
            console.error('Download failed:', error);
            showToast('Gagal mengunduh file', 'error');
        }
    };

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7 animate-slide-up">
            <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-100">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-500 shrink-0">
                        <MoonStar size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-800">Kegiatan & Tugas Liburan</h3>
                        <p className="text-sm text-slate-500">{readOnly ? 'Laporan detail per-hari liburan santri.' : 'Formulir setoran kegiatan harian liburan santri.'}</p>
                    </div>
                </div>

                <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 p-1.5 px-3 rounded-xl w-full sm:w-auto overflow-hidden">
                    <CalendarIcon size={18} className="text-slate-400 shrink-0" />
                    <input
                        type="date"
                        value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
                        className="bg-transparent border-none text-slate-700 font-medium text-sm focus:outline-none focus:ring-0 flex-1 min-w-[130px]"
                    />
                </div>
            </div>

            {!readOnly && !isToday && (
                <div className="mb-6 bg-amber-50 border border-amber-200 text-amber-800 p-4 rounded-xl text-sm flex items-start gap-3">
                    <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                    <p className="font-medium leading-relaxed">
                        Anda hanya dapat mengisi laporan kegiatan <b>untuk hari ini saja</b>. <br className="hidden sm:block" />
                        Untuk hari yang sudah lewat atau di masa depan, laporan hanya dapat dilihat (Read-Only).
                    </p>
                </div>
            )}

            {loading ? (
                <div className="py-20 flex justify-center"><FullPageSpinner label="Memuat formulir..." /></div>
            ) : (
                <div className="space-y-6">
                    {/* Special Tasks Section */}
                    {specialTasks.length > 0 && (
                        <div className="bg-amber-50/50 border border-amber-100 rounded-2xl overflow-hidden mb-6">
                            <div className="px-5 py-3 border-b border-amber-100 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Pin size={16} className="text-amber-500 rotate-45" />
                                    <h4 className="font-bold text-amber-900 text-sm">Tugas & Materi Khusus</h4>
                                </div>
                                <span className="text-[10px] bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-black uppercase">Instruksi Musyrif</span>
                            </div>
                            <div className="p-4 space-y-3">
                                {specialTasks.map(task => (
                                    <div
                                        key={task.id}
                                        onClick={() => handleToggleSpecialTask(task)}
                                        className={`flex items-start gap-3 p-4 rounded-xl border transition-all ${task.targetType === 'Personal' ? (task.is_done ? 'bg-emerald-50 border-emerald-100' : 'bg-white border-amber-100 cursor-pointer hover:shadow-sm') : 'bg-white border-slate-200 shadow-sm'}`}
                                    >
                                        {task.targetType === 'Personal' && (
                                            <div className={`mt-0.5 ${task.is_done ? 'text-emerald-500' : 'text-slate-300'}`}>
                                                {task.is_done ? <CheckCircle2 size={20} /> : <Circle size={20} />}
                                            </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 mb-1">
                                                <p className={`text-sm font-bold ${task.targetType === 'Personal' && task.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
                                                    {task.judul}
                                                </p>
                                                <span className={`text-[9px] font-black px-1.5 py-0.5 rounded ${task.targetType === 'Personal' ? 'bg-blue-100 text-blue-600' : (task.targetType === 'Kamar' ? 'bg-purple-100 text-purple-600' : 'bg-orange-100 text-orange-600')}`}>
                                                    {task.targetType}
                                                </span>
                                            </div>
                                            {task.deskripsi && <p className={`text-xs ${task.targetType === 'Personal' && task.is_done ? 'text-slate-300' : 'text-slate-500'}`}>{task.deskripsi}</p>}
                                            
                                            {task.file_url && (
                                                <div className="mt-3 flex items-center gap-3">
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); setViewingPdf(task.file_url); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-primary text-white rounded-xl text-xs font-bold hover:bg-slate-800 transition-all shadow-sm"
                                                    >
                                                        <FileText size={12} /> Lihat Materi
                                                    </button>
                                                    <button 
                                                        onClick={(e) => { e.stopPropagation(); handleDownload(task.file_url, task.judul); }}
                                                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-600 rounded-xl text-xs font-bold hover:bg-slate-200 transition-all shadow-sm border border-slate-200"
                                                    >
                                                        <Download size={12} /> Download
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}

                    {categories.length === 0 ? (
                        <EmptyState message="Silakan hubungi admin untuk membuat formulir setup liburan." />
                    ) : categories.map(cat => {
                        const catItems = items.filter(a => a.kategori_id === cat.id);
                        if (catItems.length === 0) return null;

                        const catProgress = catItems.reduce((acc, item) => {
                            const rec = records.find(r => r.item_id === item.id);
                            const done = rec?.is_done || (rec?.keterangan && rec?.keterangan.trim().length > 0);
                            return acc + (done ? 1 : 0);
                        }, 0);
                        const progressPct = catItems.length ? Math.round((catProgress / catItems.length) * 100) : 0;

                        return (
                            <div key={cat.id} className="bg-white border rounded-2xl overflow-hidden shadow-sm border-slate-200 transition-all hover:border-slate-300">
                                <div className="bg-slate-50/80 px-6 py-4 border-b border-slate-200 flex items-center justify-between flex-wrap gap-4">
                                    <h4 className="font-bold text-slate-800 flex items-center gap-3">
                                        <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 shadow-sm" />
                                        {cat.nama_kategori}
                                    </h4>
                                    <div className="flex items-center gap-4 bg-white/50 px-3 py-1.5 rounded-xl border border-slate-200/50">
                                        <div className="bg-slate-200 h-2 w-24 sm:w-40 rounded-full overflow-hidden">
                                            <div className="h-full bg-indigo-500 rounded-full transition-all duration-500" style={{ width: `${progressPct}%` }} />
                                        </div>
                                        <span className="text-slate-600 text-xs font-bold min-w-[2.5rem] text-right">{progressPct}%</span>
                                    </div>
                                </div>
                                <div className="px-5 py-2 divide-y divide-slate-100">
                                    {catItems.map((item, idx) => {
                                        const rec = records.find(r => r.item_id === item.id);
                                        const isDoneCheckbox = rec?.is_done || false;
                                        const textVal = rec?.keterangan || '';
                                        const isSaving = savingItem === item.id;

                                        return (
                                            <div key={item.id} className="py-4 flex flex-col sm:flex-row sm:items-center gap-4 group">
                                                <div className="flex-1 shrink-0">
                                                    <p className="text-sm font-semibold text-slate-700">{idx + 1}. {item.nama_item}</p>
                                                </div>
                                                <div className="w-full sm:w-1/2 shrink-0 flex items-center justify-end">
                                                    {item.tipe_input === 'checkbox' ? (
                                                        <label className={`flex items-center gap-3 cursor-pointer p-2 px-4 rounded-2xl border transition-all ${isDoneCheckbox ? 'bg-emerald-50 border-emerald-200 shadow-sm' : 'bg-slate-50 border-slate-200 opacity-80 ' + (isEditable ? 'hover:bg-white hover:border-indigo-200' : '')} ${!isEditable && 'pointer-events-none'}`}>
                                                            <div className="relative flex items-center">
                                                                <input
                                                                    type="checkbox"
                                                                    disabled={!isEditable || isSaving}
                                                                    checked={isDoneCheckbox}
                                                                    onChange={e => handleUpdateRecord(item.id, { is_done: e.target.checked })}
                                                                    className="peer w-5 h-5 cursor-pointer appearance-none rounded-md border-2 border-slate-300 checked:bg-emerald-500 checked:border-emerald-500 transition-all disabled:opacity-50"
                                                                />
                                                                <svg className="absolute w-5 h-5 text-white scale-0 peer-checked:scale-100 transition-transform duration-200 pointer-events-none" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                                                                    <polyline points="20 6 9 17 4 12"></polyline>
                                                                </svg>
                                                            </div>
                                                            <span className={`text-sm font-semibold select-none ${isDoneCheckbox ? 'text-emerald-700' : 'text-slate-500'}`}>
                                                                {isSaving ? 'Menyimpan...' : (isDoneCheckbox ? 'Telah Dilakukan' : 'Belum Dilakukan')}
                                                            </span>
                                                        </label>
                                                    ) : (
                                                        <div className="relative w-full">
                                                            <textarea
                                                                disabled={!isEditable || isSaving}
                                                                rows={2}
                                                                placeholder="Tuliskan laporan (dari juz brp, hal brp, dll)..."
                                                                className="w-full px-4 pt-3 pb-8 rounded-xl border border-slate-200 bg-slate-50 focus:bg-white focus:outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100 transition-all text-sm resize-none disabled:opacity-75 disabled:cursor-not-allowed"
                                                                defaultValue={textVal}
                                                                onBlur={e => {
                                                                    if (e.target.value !== textVal) {
                                                                        handleUpdateRecord(item.id, { keterangan: e.target.value });
                                                                    }
                                                                }}
                                                            />
                                                            {isEditable && (
                                                                <div className="absolute bottom-2 right-2 text-[10px] text-slate-400 flex items-center gap-1 font-medium italic pointer-events-none bg-white/50 px-2 rounded">
                                                                    {isSaving ? 'Menyimpan...' : <span><Send size={10} className="inline mr-1" />Akan tersimpan otomatis</span>}
                                                                </div>
                                                            )}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            <Modal open={!!viewingPdf} onClose={() => setViewingPdf(null)} title="Pratinjau Materi PDF">
                <div className="w-full h-[70vh] rounded-xl overflow-hidden bg-slate-100">
                    {viewingPdf ? (
                        <iframe
                            src={`${viewingPdf}#toolbar=0`}
                            className="w-full h-full border-none"
                            title="PDF Preview"
                        />
                    ) : (
                        <div className="flex items-center justify-center h-full text-slate-400">Memuat PDF...</div>
                    )}
                </div>
                <div className="mt-4 flex justify-end">
                    <Button onClick={() => setViewingPdf(null)}>Tutup</Button>
                </div>
            </Modal>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
