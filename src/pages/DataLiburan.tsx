import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { useToast } from '../hooks/useToast';

const inputCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all`;

export default function DataLiburan({ musyrifId }: { musyrifId?: string }) {
    const [categories, setCategories] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

    // Activity modal
    const [isActModalOpen, setIsActModalOpen] = useState(false);
    const [editingActId, setEditingActId] = useState<string | null>(null);
    const [namaAct, setNamaAct] = useState('');
    const [tipeInputAct, setTipeInputAct] = useState('checkbox');
    const [selectedCatId, setSelectedCatId] = useState('');

    // Category modal
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [namaCat, setNamaCat] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; nama: string; type: 'category' | 'activity' } | null>(null);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => { fetchData(); }, []);

    const fetchData = async () => {
        setLoading(true);
        const [catRes, actRes] = await Promise.all([
            supabase.from('kategori_liburan').select('*').order('created_at'),
            supabase.from('item_liburan').select('*').order('created_at'),
        ]);

        if (catRes.error && catRes.error.code === '42P01') {
            showToast('Tabel kategori_liburan belum dibuat di DB.', 'error');
            setLoading(false);
            return;
        }

        if (catRes.data) {
            setCategories(catRes.data);
            if (catRes.data[0] && activeCategoryId === 'all') setActiveCategoryId(catRes.data[0].id);
        }
        if (actRes.data) setActivities(actRes.data);
        setLoading(false);
    };

    // Category CRUD
    const openAddCat = () => { setEditingCatId(null); setNamaCat(''); setIsCatModalOpen(true); };
    const openEditCat = (id: string, nama: string) => { setEditingCatId(id); setNamaCat(nama); setIsCatModalOpen(true); };
    const handleSaveCat = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        const payload = { nama_kategori: namaCat };
        const fn = editingCatId ? supabase.from('kategori_liburan').update(payload).eq('id', editingCatId) : supabase.from('kategori_liburan').insert([payload]);
        const { error } = await fn;
        if (error) showToast('Gagal: ' + error.message, 'error');
        else { showToast(editingCatId ? 'Kategori diperbarui' : 'Kategori ditambahkan', 'success'); setIsCatModalOpen(false); fetchData(); }
        setSubmitting(false);
    };
    const handleDeleteCat = async () => {
        if (!confirmDelete || confirmDelete.type !== 'category') return;
        setSubmitting(true);
        const { error } = await supabase.from('kategori_liburan').delete().eq('id', confirmDelete.id);
        if (error) showToast('Gagal hapus: ' + error.message, 'error');
        else { showToast('Kategori dihapus', 'success'); fetchData(); }
        setSubmitting(false); setConfirmDelete(null);
    };

    // Activity CRUD
    const openAddAct = (catId: string) => {
        setEditingActId(null);
        setNamaAct('');
        setTipeInputAct('checkbox');
        setSelectedCatId(catId);
        setIsActModalOpen(true);
    };
    const openEditAct = (id: string, nama: string, tipe: string, catId: string) => {
        setEditingActId(id);
        setNamaAct(nama);
        setTipeInputAct(tipe);
        setSelectedCatId(catId);
        setIsActModalOpen(true);
    };
    const handleSaveAct = async (e: React.FormEvent) => {
        e.preventDefault(); setSubmitting(true);
        const payload = { nama_item: namaAct, tipe_input: tipeInputAct, kategori_id: selectedCatId };
        const fn = editingActId ? supabase.from('item_liburan').update(payload).eq('id', editingActId) : supabase.from('item_liburan').insert([payload]);
        const { error } = await fn;
        if (error) showToast('Gagal: ' + error.message, 'error');
        else { showToast(editingActId ? 'Item diperbarui' : 'Item ditambahkan', 'success'); setIsActModalOpen(false); fetchData(); }
        setSubmitting(false);
    };
    const handleDeleteAct = async () => {
        if (!confirmDelete || confirmDelete.type !== 'activity') return;
        setSubmitting(true);
        const { error } = await supabase.from('item_liburan').delete().eq('id', confirmDelete.id);
        if (error) showToast('Gagal hapus: ' + error.message, 'error');
        else { showToast('Item dihapus', 'success'); fetchData(); }
        setSubmitting(false); setConfirmDelete(null);
    };

    const visibleCategories = categories.filter(c => activeCategoryId === 'all' || c.id === activeCategoryId);

    return (
        <div>
            {!musyrifId && (
                <PageHeader title="Setup Item Liburan" subtitle="Konfigurasi kategori dan item kegiatan harian selama masa liburan." />
            )}
            {loading ? <FullPageSpinner label="Memuat data..." /> : (
                <>
                    {/* Controls bar */}
                    <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
                        <div className="flex-1 min-w-0">
                            <select value={activeCategoryId} onChange={e => setActiveCategoryId(e.target.value)}
                                className="w-full sm:max-w-xs h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all">
                                <option value="all">Tampilkan Semua Kategori</option>
                                {categories.map(c => <option key={c.id} value={c.id}>{c.nama_kategori}</option>)}
                            </select>
                        </div>
                        <Button icon={<Plus size={15} />} size="sm" onClick={openAddCat}>
                            Kelompok Baru
                        </Button>
                    </div>

                    {categories.length === 0 ? (
                        <EmptyState message="Belum ada kategori kegiatan liburan. Tambahkan kategori pertama." />
                    ) : (
                        <div className="space-y-5">
                            {visibleCategories.map(cat => {
                                const catActs = activities.filter(a => a.kategori_id === cat.id);
                                return (
                                    <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                        {/* Card header */}
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 bg-slate-50/80">
                                            <div className="flex items-center gap-2">
                                                <h2 className="font-bold text-slate-800">{cat.nama_kategori}</h2>
                                                <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                                    {catActs.length} item
                                                </span>
                                                <button onClick={() => openEditCat(cat.id, cat.nama_kategori)}
                                                    className="p-1 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors" title="Edit Kategori">
                                                    <Settings size={14} />
                                                </button>
                                                <button onClick={() => setConfirmDelete({ id: cat.id, nama: cat.nama_kategori, type: 'category' })}
                                                    className="p-1 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors" title="Hapus Kategori">
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                            <Button icon={<Plus size={14} />} size="sm" variant="secondary" onClick={() => openAddAct(cat.id)}>
                                                Tambah Item
                                            </Button>
                                        </div>

                                        {catActs.length === 0 ? (
                                            <EmptyState message={`Belum ada form item untuk ${cat.nama_kategori}`} />
                                        ) : (
                                            <DataTable>
                                                <thead>
                                                    <tr>
                                                        <Th className="w-12">No</Th>
                                                        <Th>Nama Info/Kegiatan</Th>
                                                        <Th>Jenis Input</Th>
                                                        <Th className="text-right">Aksi</Th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {catActs.map((act, i) => (
                                                        <Tr key={act.id}>
                                                            <Td className="text-slate-400 text-xs">{i + 1}</Td>
                                                            <Td className="font-medium text-slate-800">{act.nama_item}</Td>
                                                            <Td>
                                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${act.tipe_input === 'text' ? 'bg-blue-100 text-blue-700' : 'bg-emerald-100 text-emerald-700'}`}>
                                                                    {act.tipe_input === 'text' ? 'Teks Input' : 'Check Item'}
                                                                </span>
                                                            </Td>
                                                            <Td className="text-right">
                                                                <div className="flex items-center justify-end gap-1.5">
                                                                    <button onClick={() => openEditAct(act.id, act.nama_item, act.tipe_input, cat.id)}
                                                                        className="p-1.5 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors">
                                                                        <Edit2 size={14} />
                                                                    </button>
                                                                    <button onClick={() => setConfirmDelete({ id: act.id, nama: act.nama_item, type: 'activity' })}
                                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors">
                                                                        <Trash2 size={14} />
                                                                    </button>
                                                                </div>
                                                            </Td>
                                                        </Tr>
                                                    ))}
                                                </tbody>
                                            </DataTable>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </>
            )}

            {/* Category Modal */}
            <Modal open={isCatModalOpen} onClose={() => setIsCatModalOpen(false)} title={`${editingCatId ? 'Edit' : 'Tambah'} Kategori Liburan`}>
                <form onSubmit={handleSaveCat} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kategori</label>
                        <input type="text" required autoFocus placeholder="Misal: Kegiatan Mengaji, Berbakti Kepada Orang Tua"
                            className={inputCls} value={namaCat} onChange={e => setNamaCat(e.target.value)} />
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsCatModalOpen(false)} disabled={submitting}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting}>Simpan</Button>
                    </div>
                </form>
            </Modal>

            {/* Activity Modal */}
            <Modal open={isActModalOpen} onClose={() => setIsActModalOpen(false)} title={`${editingActId ? 'Edit' : 'Tambah'} Item Liburan`}>
                <form onSubmit={handleSaveAct} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Masuk ke Kategori</label>
                        <select required className={inputCls} value={selectedCatId} onChange={e => setSelectedCatId(e.target.value)}>
                            {categories.map(c => <option key={c.id} value={c.id}>{c.nama_kategori}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Kegiatan (Pertanyaan)</label>
                        <input type="text" required autoFocus className={inputCls} placeholder="Misal: Sholat Subuh" value={namaAct} onChange={e => setNamaAct(e.target.value)} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Jenis Input</label>
                        <select required className={inputCls} value={tipeInputAct} onChange={e => setTipeInputAct(e.target.value)}>
                            <option value="checkbox">Checklist (Ya/Tidak Berupa Centang)</option>
                            <option value="text">Isian Teks Singkat (Misal: dari mana sampai mana)</option>
                        </select>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsActModalOpen(false)} disabled={submitting}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting}>Simpan</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={confirmDelete?.type === 'category' ? handleDeleteCat : handleDeleteAct}
                loading={submitting}
                message={confirmDelete?.type === 'category'
                    ? `Yakin hapus kategori "${confirmDelete?.nama}"? Semua formulir di dalamnya akan terhapus juga.`
                    : `Yakin hapus item "${confirmDelete?.nama}"?`}
            />
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
