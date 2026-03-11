import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Search, User, Edit2, Download, FileText } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { ToastContainer } from '../components/ui/Toast';

const inputCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all`;

export default function TugasLiburan({ musyrifId }: { musyrifId?: string }) {
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; judul: string; file_url?: string } | null>(null);
    const [search, setSearch] = useState('');

    // Form state
    const [form, setForm] = useState({ judul: '', deskripsi: '', file_url: '' });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'santri' | 'kamar' | 'kelas'>('santri');
    const [targetList, setTargetList] = useState<any[]>([]);
    const [selectedTargetId, setSelectedTargetId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [viewingPdf, setViewingPdf] = useState<string | null>(null);

    const { toasts, showToast, removeToast } = useToast();

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Santri
            let sQuery = supabase.from('santri').select('id, nama, nim, kelas_id, kamar_id, kamars(nama_kamar), kelas_list(nama_kelas)');
            if (musyrifId) {
                const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
                const roomIds = (rooms || []).map(r => r.id);
                sQuery = sQuery.in('kamar_id', roomIds);
            }
            const { data: sData } = await sQuery.order('nama');

            // Fetch Kamars & Kelas for tabs
            const [kRes, klRes] = await Promise.all([
                supabase.from('kamars').select('id, nama_kamar, musyrif_id, musyrifs(nama)'),
                supabase.from('kelas_list').select('id, nama_kelas')
            ]);

            let kFiltered = kRes.data || [];
            if (musyrifId) kFiltered = kFiltered.filter(k => k.musyrif_id === musyrifId);

            if (activeTab === 'santri') setTargetList(sData || []);
            else if (activeTab === 'kamar') setTargetList(kFiltered);
            else if (activeTab === 'kelas') setTargetList(klRes.data || []);

        } catch (e) {
            console.error('Error fetching data:', e);
            showToast('Gagal memuat data referensi', 'error');
        }
        setLoading(false);
    };

    useEffect(() => {
        fetchData();
    }, [activeTab, musyrifId]);

    const fetchTasks = async (targetId: string) => {
        if (!targetId) return;
        setLoadingTasks(true);
        const table = activeTab === 'santri' ? 'tugas_liburan_santri' : (activeTab === 'kamar' ? 'tugas_liburan_kamar' : 'tugas_liburan_kelas');
        const column = activeTab === 'santri' ? 'santri_id' : (activeTab === 'kamar' ? 'kamar_id' : 'kelas_id');

        try {
            const { data, error } = await supabase
                .from(table)
                .select('*')
                .eq(column, targetId)
                .order('created_at', { ascending: false });
            
            if (error && (error.code === '42P01' || error.message?.includes('does not exist'))) {
                // Table doesn't exist yet
                setTasks([]);
            } else {
                setTasks(data || []);
            }
        } catch (e) {
            console.error(e);
            setTasks([]);
        }
        setLoadingTasks(false);
    };

    useEffect(() => {
        if (selectedTargetId) {
            fetchTasks(selectedTargetId);
        } else {
            setTasks([]);
        }
    }, [selectedTargetId, activeTab]);

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedTargetId) return;
        setSubmitting(true);

        const table = activeTab === 'santri' ? 'tugas_liburan_santri' : (activeTab === 'kamar' ? 'tugas_liburan_kamar' : 'tugas_liburan_kelas');
        const column = activeTab === 'santri' ? 'santri_id' : (activeTab === 'kamar' ? 'kamar_id' : 'kelas_id');

        const payload: any = {
            [column]: selectedTargetId,
            judul: form.judul,
            deskripsi: form.deskripsi,
            file_url: form.file_url || null
        };

        if (activeTab === 'santri') {
            payload.is_done = false;
        }

        let result;
        if (editingTaskId) {
            result = await supabase.from(table).update({
                judul: form.judul,
                deskripsi: form.deskripsi,
                file_url: form.file_url || null
            }).eq('id', editingTaskId);
        } else {
            result = await supabase.from(table).insert([payload]);
        }

        const { error } = result;

        if (error) {
            showToast('Gagal: ' + error.message, 'error');
        } else {
            showToast(editingTaskId ? 'Tugas diperbarui' : 'Tugas khusus ditambahkan', 'success');
            setForm({ judul: '', deskripsi: '', file_url: '' });
            setEditingTaskId(null);
            setIsModalOpen(false);
            fetchTasks(selectedTargetId);
        }
        setSubmitting(false);
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (file.type !== 'application/pdf') {
            showToast('Hanya dapat mengunggah file PDF', 'error');
            return;
        }

        setUploading(true);
        try {
            const fileName = `materi_${Date.now()}.pdf`;
            const { data, error } = await supabase.storage.from('tugas-materi').upload(fileName, file);
            if (error) {
                if (error.message.includes('bucket not found')) {
                    showToast('Bucket "tugas-materi" belum dibuat di Supabase Storage.', 'error');
                } else {
                    throw error;
                }
            } else {
                const { data: { publicUrl } } = supabase.storage.from('tugas-materi').getPublicUrl(data.path);
                setForm(prev => ({ ...prev, file_url: publicUrl }));
                showToast('PDF berhasil diunggah', 'success');
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setUploading(false);
        }
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

    const toggleTask = async (task: any) => {
        if (activeTab !== 'santri') return;
        const { error } = await supabase
            .from('tugas_liburan_santri')
            .update({ is_done: !task.is_done })
            .eq('id', task.id);

        if (error) {
            showToast('Gagal mengubah status: ' + error.message, 'error');
        } else {
            setTasks(prev => prev.map(t => t.id === task.id ? { ...t, is_done: !t.is_done } : t));
            showToast(task.is_done ? 'Tugas ditandai belum selesai' : 'Tugas ditandai selesai', 'success');
        }
    };

    const handleOpenEdit = (task: any) => {
        setEditingTaskId(task.id);
        setForm({
            judul: task.judul,
            deskripsi: task.deskripsi || '',
            file_url: task.file_url || ''
        });
        setIsModalOpen(true);
    };

    const deleteTask = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);

        try {
            // Delete file from storage if exists
            if (confirmDelete.file_url) {
                const fileName = confirmDelete.file_url.split('/').pop();
                if (fileName) {
                    await supabase.storage.from('tugas-materi').remove([fileName]);
                }
            }

            const table = activeTab === 'santri' ? 'tugas_liburan_santri' : (activeTab === 'kamar' ? 'tugas_liburan_kamar' : 'tugas_liburan_kelas');
            const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
            
            if (error) {
                showToast('Gagal menghapus: ' + error.message, 'error');
            } else {
                showToast('Tugas berhasil dihapus', 'success');
                setTasks(prev => prev.filter(t => t.id !== confirmDelete.id));
                setConfirmDelete(null);
            }
        } catch (err: any) {
            showToast(err.message, 'error');
        } finally {
            setSubmitting(false);
        }
    };

    const filteredTargets = targetList.filter(t => {
        const name = activeTab === 'santri' ? t.nama : (activeTab === 'kamar' ? t.nama_kamar : t.nama_kelas);
        return (name || '').toLowerCase().includes(search.toLowerCase());
    });

    return (
        <div className="space-y-6">
            {!musyrifId && (
                <PageHeader
                    title="Manajemen Tugas Khusus"
                    subtitle="Berikan tugas tambahan atau materi PDF spesifik untuk santri, kamar, atau kelas."
                />
            )}

            {/* Tabs Selection */}
            <div className="flex gap-2 p-1 bg-slate-100 rounded-2xl w-fit">
                {[
                    { id: 'santri', label: 'Per-Santri' },
                    { id: 'kamar', label: 'Per-Kamar' },
                    { id: 'kelas', label: 'Per-Kelas' }
                ].map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => { setActiveTab(tab.id as any); setSelectedTargetId(''); }}
                        className={`px-6 py-2 rounded-xl text-sm font-bold transition-all ${activeTab === tab.id ? 'bg-white text-primary shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 text-sm">Pilih {activeTab === 'santri' ? 'Santri' : (activeTab === 'kamar' ? 'Kamar' : 'Kelas')}</h3>
                            <span className="text-[10px] bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full font-bold">{filteredTargets.length}</span>
                        </div>
                        <div className="p-3">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder={`Cari ${activeTab === 'santri' ? 'santri' : (activeTab === 'kamar' ? 'kamar' : 'kelas')}...`}
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {loading ? (
                                    <div className="py-8 text-center flex justify-center"><FullPageSpinner label="Memuat..." /></div>
                                ) : filteredTargets.length === 0 ? (
                                    <p className="text-center py-4 text-xs text-slate-400">Tidak ditemukan.</p>
                                ) : filteredTargets.map(t => {
                                    const id = t.id;
                                    const name = activeTab === 'santri' ? t.nama : (activeTab === 'kamar' ? t.nama_kamar : t.nama_kelas);
                                    const sub = activeTab === 'santri' ? (t.kamars?.nama_kamar || '-') : (activeTab === 'kamar' ? (t.musyrifs?.nama || '-') : 'Materi per-angkatan/kelas');

                                    return (
                                        <button
                                            key={id}
                                            onClick={() => setSelectedTargetId(id)}
                                            className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${selectedTargetId === id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                        >
                                            <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedTargetId === id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                                                <User size={16} className={selectedTargetId === id ? 'text-white' : 'text-slate-400'} />
                                            </div>
                                            <div className="min-w-0">
                                                <p className={`font-bold text-xs truncate ${selectedTargetId === id ? 'text-white' : 'text-slate-700'}`}>{name}</p>
                                                <p className={`text-[10px] truncate ${selectedTargetId === id ? 'text-white/70' : 'text-slate-400'}`}>{sub}</p>
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="lg:col-span-2">
                    {!selectedTargetId ? (
                        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Search size={24} />
                            </div>
                            <h3 className="font-bold text-slate-600">Pilih Target</h3>
                            <p className="text-sm mt-1 max-w-[250px] mx-auto">Pilih salah satu di sebelah kiri untuk mengelola tugas dan materinya.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden animate-fade-in">
                            <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Daftar Tugas & Materi</h3>
                                    <p className="text-sm text-slate-500">
                                        Data untuk <b>
                                            {activeTab === 'santri' ? targetList.find(t => t.id === selectedTargetId)?.nama :
                                                (activeTab === 'kamar' ? targetList.find(t => t.id === selectedTargetId)?.nama_kamar :
                                                    targetList.find(t => t.id === selectedTargetId)?.nama_kelas)}
                                        </b>
                                    </p>
                                </div>
                                <Button icon={<Plus size={16} />} onClick={() => { setEditingTaskId(null); setForm({ judul: '', deskripsi: '', file_url: '' }); setIsModalOpen(true); }}>Tugas Baru</Button>
                            </div>

                            <div className="p-5 md:p-6 min-h-[300px]">
                                {loadingTasks ? (
                                    <div className="py-20 flex flex-col items-center gap-3">
                                        <FullPageSpinner label="Memuat tugas..." />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <EmptyState message={`Belum ada tugas/materi khusus untuk ${activeTab} ini.`} />
                                ) : (
                                    <div className="space-y-3">
                                        {tasks.map(task => (
                                            <div key={task.id} className={`group p-4 rounded-2xl border transition-all flex items-start gap-4 ${activeTab === 'santri' && task.is_done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-sm'}`}>
                                                {activeTab === 'santri' && (
                                                    <button
                                                        onClick={() => toggleTask(task)}
                                                        className={`mt-0.5 transition-colors ${task.is_done ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'}`}
                                                    >
                                                        {task.is_done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                                    </button>
                                                )}
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-bold text-sm ${activeTab === 'santri' && task.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.judul}</h4>
                                                    {task.deskripsi && (
                                                        <p className={`text-xs mt-1 leading-relaxed ${activeTab === 'santri' && task.is_done ? 'text-slate-300' : 'text-slate-500'}`}>{task.deskripsi}</p>
                                                    )}
                                                    <div className="flex items-center gap-3 mt-2">
                                                        <p className="text-[10px] text-slate-400 font-medium">Ditambahkan: {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
                                                        {task.file_url && (
                                                            <div className="flex items-center gap-2">
                                                                <button onClick={() => setViewingPdf(task.file_url)} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
                                                                    <FileText size={10} /> Lihat
                                                                </button>
                                                                <span className="text-[10px] text-slate-300">|</span>
                                                                <button onClick={() => handleDownload(task.file_url, task.judul)} className="text-[10px] text-primary font-bold hover:underline flex items-center gap-1">
                                                                    <Download size={10} /> Download
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-all">
                                                    <button
                                                        onClick={() => handleOpenEdit(task)}
                                                        className="p-2 text-slate-300 hover:text-primary hover:bg-primary/5 rounded-lg transition-all"
                                                        title="Edit Tugas"
                                                    >
                                                        <Edit2 size={16} />
                                                    </button>
                                                    <button
                                                        onClick={() => setConfirmDelete({ id: task.id, judul: task.judul, file_url: task.file_url })}
                                                        className="p-2 text-slate-300 hover:text-danger hover:bg-danger/5 rounded-lg transition-all"
                                                        title="Hapus Tugas"
                                                    >
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>

            <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTaskId(null); }} title={editingTaskId ? "Edit Tugas/Materi" : "Tambah Tugas/Materi"}>
                <form onSubmit={handleSaveTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Tugas / Materi</label>
                        <input
                            type="text"
                            required
                            autoFocus
                            placeholder="Misal: Hafalan Surat Al-Mulk"
                            className={inputCls}
                            value={form.judul}
                            onChange={e => setForm({ ...form, judul: e.target.value })}
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Deskripsi / Detail (Opsional)</label>
                        <textarea
                            rows={3}
                            placeholder="Misal: Dari ayat 1 sampai 15, setorkan rekaman via WhatsApp."
                            className={`${inputCls} h-auto py-2`}
                            value={form.deskripsi}
                            onChange={e => setForm({ ...form, deskripsi: e.target.value })}
                        />
                    </div>
                    <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200 border-dashed">
                        <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                            <Download size={14} /> Berikan Materi PDF (Opsional)
                        </label>
                        {form.file_url ? (
                            <div className="flex items-center justify-between bg-white p-3 rounded-xl border border-emerald-100 shadow-sm">
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div className="w-10 h-10 bg-emerald-50 text-emerald-500 rounded-lg flex items-center justify-center shrink-0">
                                        <FileText size={20} />
                                    </div>
                                    <div className="truncate">
                                        <p className="text-xs font-bold text-slate-700 truncate">Materi_Terlampir.pdf</p>
                                        <p className="text-[10px] text-emerald-500 font-bold">Siap disimpan</p>
                                    </div>
                                </div>
                                <button type="button" onClick={() => setForm({ ...form, file_url: '' })} className="w-8 h-8 rounded-full hover:bg-red-50 text-red-400 transition-all font-bold text-lg">&times;</button>
                            </div>
                        ) : (
                            <div className="relative border-2 border-dashed border-slate-200 rounded-xl p-6 text-center hover:bg-white hover:border-primary/30 transition-all">
                                <input
                                    type="file"
                                    accept=".pdf"
                                    onChange={handleFileUpload}
                                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                                    disabled={uploading}
                                />
                                {uploading ? (
                                    <div className="flex flex-col items-center gap-2">
                                        <div className="w-5 h-5 border-2 border-primary border-t-transparent rounded-full animate-spin" />
                                        <p className="text-xs text-slate-500 font-bold">Mengunggah PDF...</p>
                                    </div>
                                ) : (
                                    <div className="space-y-1">
                                        <p className="text-xs font-bold text-slate-600">Klik atau geser file PDF di sini</p>
                                        <p className="text-[10px] text-slate-400">File akan terunggah secara otomatis</p>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)} disabled={submitting || uploading}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting} disabled={uploading}>Simpan Tugas</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={deleteTask}
                loading={submitting}
                message={`Yakin ingin menghapus tugas "${confirmDelete?.judul}"?`}
            />

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
