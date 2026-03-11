import { useState, useEffect } from 'react';
import { Plus, Trash2, CheckCircle2, Circle, Search, User, Edit2 } from 'lucide-react';
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
    const [santriList, setSantriList] = useState<any[]>([]);
    const [selectedSantriId, setSelectedSantriId] = useState('');
    const [tasks, setTasks] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [loadingTasks, setLoadingTasks] = useState(false);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; judul: string } | null>(null);
    const [search, setSearch] = useState('');

    // Form state
    const [form, setForm] = useState({ judul: '', deskripsi: '' });
    const [editingTaskId, setEditingTaskId] = useState<string | null>(null);
    const [submitting, setSubmitting] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        fetchSantri();
    }, []);

    const fetchSantri = async () => {
        setLoading(true);
        let query = supabase.from('santri').select('id, nama, nim, kamars(nama_kamar)');

        if (musyrifId) {
            const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
            const roomIds = (rooms || []).map(r => r.id);
            query = query.in('kamar_id', roomIds);
        }

        const { data, error } = await query.order('nama');
        if (error) {
            console.error('Error fetching santri:', error);
            showToast('Gagal memuat data santri', 'error');
        } else if (data) {
            setSantriList(data);
        }
        setLoading(false);
    };

    const fetchTasks = async (sId: string) => {
        if (!sId) return;
        setLoadingTasks(true);
        const { data } = await supabase
            .from('tugas_liburan_santri')
            .select('*')
            .eq('santri_id', sId)
            .order('created_at', { ascending: false });
        setTasks(data || []);
        setLoadingTasks(false);
    };

    useEffect(() => {
        if (selectedSantriId) {
            fetchTasks(selectedSantriId);
        } else {
            setTasks([]);
        }
    }, [selectedSantriId]);

    const handleSaveTask = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedSantriId) return;
        setSubmitting(true);

        const payload = {
            santri_id: selectedSantriId,
            judul: form.judul,
            deskripsi: form.deskripsi,
            is_done: false
        };

        let result;
        if (editingTaskId) {
            result = await supabase.from('tugas_liburan_santri').update({
                judul: form.judul,
                deskripsi: form.deskripsi
            }).eq('id', editingTaskId);
        } else {
            result = await supabase.from('tugas_liburan_santri').insert([payload]);
        }

        const { error } = result;

        if (error) {
            showToast('Gagal: ' + error.message, 'error');
        } else {
            showToast(editingTaskId ? 'Tugas diperbarui' : 'Tugas khusus ditambahkan', 'success');
            setForm({ judul: '', deskripsi: '' });
            setEditingTaskId(null);
            setIsModalOpen(false);
            fetchTasks(selectedSantriId);
        }
        setSubmitting(false);
    };

    const toggleTask = async (task: any) => {
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
        setForm({ judul: task.judul, deskripsi: task.deskripsi || '' });
        setIsModalOpen(true);
    };

    const deleteTask = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);
        const { error } = await supabase.from('tugas_liburan_santri').delete().eq('id', confirmDelete.id);
        if (error) {
            showToast('Gagal menghapus: ' + error.message, 'error');
        } else {
            showToast('Tugas berhasil dihapus', 'success');
            setTasks(prev => prev.filter(t => t.id !== confirmDelete.id));
            setConfirmDelete(null);
        }
        setSubmitting(false);
    };

    const filteredSantri = santriList.filter(s =>
        s.nama.toLowerCase().includes(search.toLowerCase()) || (s.nim || '').includes(search)
    );

    return (
        <div className="space-y-6">
            {!musyrifId && (
                <PageHeader
                    title="Tugas Khusus Santri"
                    subtitle="Berikan tugas tambahan spesifik untuk santri tertentu selama liburan."
                />
            )}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Santri Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                        <div className="p-4 border-b border-slate-100 bg-slate-50/50">
                            <h3 className="font-bold text-slate-800 text-sm">Pilih Santri</h3>
                        </div>
                        <div className="p-3">
                            <div className="relative mb-3">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={14} />
                                <input
                                    type="text"
                                    placeholder="Cari santri..."
                                    className="w-full h-9 pl-9 pr-3 rounded-lg border border-slate-200 bg-slate-50 text-xs focus:ring-2 focus:ring-primary/20 focus:bg-white outline-none"
                                    value={search}
                                    onChange={e => setSearch(e.target.value)}
                                />
                            </div>
                            <div className="space-y-1 max-h-[400px] overflow-y-auto custom-scrollbar pr-1">
                                {loading ? (
                                    <div className="py-8 text-center flex justify-center"><FullPageSpinner label="Memuat..." /></div>
                                ) : filteredSantri.length === 0 ? (
                                    <p className="text-center py-4 text-xs text-slate-400">Tidak ada santri.</p>
                                ) : filteredSantri.map(s => (
                                    <button
                                        key={s.id}
                                        onClick={() => setSelectedSantriId(s.id)}
                                        className={`w-full flex items-center gap-3 p-3 rounded-xl transition-all text-left group ${selectedSantriId === s.id ? 'bg-primary text-white shadow-md' : 'hover:bg-slate-50 text-slate-600'}`}
                                    >
                                        <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${selectedSantriId === s.id ? 'bg-white/20' : 'bg-slate-100 group-hover:bg-white'}`}>
                                            <User size={16} className={selectedSantriId === s.id ? 'text-white' : 'text-slate-400'} />
                                        </div>
                                        <div className="min-w-0">
                                            <p className={`font-bold text-xs truncate ${selectedSantriId === s.id ? 'text-white' : 'text-slate-700'}`}>{s.nama}</p>
                                            <p className={`text-[10px] truncate ${selectedSantriId === s.id ? 'text-white/70' : 'text-slate-400'}`}>{s.kamars?.nama_kamar || '-'}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>

                {/* Right: Task Management */}
                <div className="lg:col-span-2">
                    {!selectedSantriId ? (
                        <div className="bg-white rounded-3xl border border-dashed border-slate-300 p-12 text-center text-slate-400">
                            <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto mb-4 border border-slate-100">
                                <Search size={24} />
                            </div>
                            <h3 className="font-bold text-slate-600">Pilih Santri</h3>
                            <p className="text-sm mt-1 max-w-[250px] mx-auto">Silakan pilih santri di sebelah kiri untuk mengelola tugas khususnya.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden animate-fade-in">
                            <div className="p-5 md:p-6 border-b border-slate-100 flex items-center justify-between">
                                <div>
                                    <h3 className="font-black text-slate-800 text-lg">Daftar Tugas Khusus</h3>
                                    <p className="text-sm text-slate-500">Tugas untuk <b>{santriList.find(s => s.id === selectedSantriId)?.nama}</b></p>
                                </div>
                                <Button icon={<Plus size={16} />} onClick={() => { setEditingTaskId(null); setForm({ judul: '', deskripsi: '' }); setIsModalOpen(true); }}>Tugas Baru</Button>
                            </div>

                            <div className="p-5 md:p-6 min-h-[300px]">
                                {loadingTasks ? (
                                    <div className="py-20 flex flex-col items-center gap-3">
                                        <FullPageSpinner label="Memuat tugas..." />
                                    </div>
                                ) : tasks.length === 0 ? (
                                    <EmptyState message="Santri ini belum memiliki tugas khusus liburan." />
                                ) : (
                                    <div className="space-y-3">
                                        {tasks.map(task => (
                                            <div key={task.id} className={`group p-4 rounded-2xl border transition-all flex items-start gap-4 ${task.is_done ? 'bg-emerald-50/30 border-emerald-100' : 'bg-white border-slate-100 hover:border-primary/20 hover:shadow-sm'}`}>
                                                <button
                                                    onClick={() => toggleTask(task)}
                                                    className={`mt-0.5 transition-colors ${task.is_done ? 'text-emerald-500' : 'text-slate-300 hover:text-primary'}`}
                                                >
                                                    {task.is_done ? <CheckCircle2 size={22} /> : <Circle size={22} />}
                                                </button>
                                                <div className="flex-1 min-w-0">
                                                    <h4 className={`font-bold text-sm ${task.is_done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>{task.judul}</h4>
                                                    {task.deskripsi && (
                                                        <p className={`text-xs mt-1 leading-relaxed ${task.is_done ? 'text-slate-300' : 'text-slate-500'}`}>{task.deskripsi}</p>
                                                    )}
                                                    <p className="text-[10px] text-slate-400 mt-2 font-medium">Ditambahkan: {new Date(task.created_at).toLocaleDateString('id-ID', { day: 'numeric', month: 'short' })}</p>
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
                                                        onClick={() => setConfirmDelete({ id: task.id, judul: task.judul })}
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

            <Modal open={isModalOpen} onClose={() => { setIsModalOpen(false); setEditingTaskId(null); }} title={editingTaskId ? "Edit Tugas Khusus" : "Tambah Tugas Khusus"}>
                <form onSubmit={handleSaveTask} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Judul Tugas</label>
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
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting}>Simpan Tugas</Button>
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

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
