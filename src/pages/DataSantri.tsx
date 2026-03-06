import { useState, useEffect, useMemo } from 'react';
import { Edit2, Trash2, Crown, Search, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { PageHeader } from '../components/layout/PageHeader';
import { Button } from '../components/ui/Button';
import { Modal } from '../components/ui/Modal';
import { ConfirmModal } from '../components/ui/ConfirmModal';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { DataTable, Th, Td, Tr } from '../components/shared/DataTable';
import { Pagination } from '../components/shared/Pagination';
import { useToast } from '../hooks/useToast';

const ITEMS_PER_PAGE = 10;

const inputCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all`;

export default function DataSantri({ musyrifId }: { musyrifId?: string }) {
    const [kelasFilter, setKelasFilter] = useState('');
    const [kamarFilter, setKamarFilter] = useState('');
    const [search, setSearch] = useState('');
    const [santriData, setSantriData] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; nama: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ nama: '', nim: '', kelas_id: '', kamar_id: '', is_ketua: false });
    const [submitting, setSubmitting] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        // The global event listener should call the component's handleOpenAdd function
        // to ensure proper state reset and modal opening.
        const handleOpenAddListener = () => handleOpenAdd();
        window.addEventListener('open-add-santri', handleOpenAddListener);
        fetchMasterData();
        fetchSantri();
        return () => window.removeEventListener('open-add-santri', handleOpenAddListener);
    }, []);

    const fetchMasterData = async () => {
        const [kelasRes, kamarRes] = await Promise.all([
            supabase.from('kelas_list').select('*').order('nama_kelas'),
            supabase.from('kamars').select('id, nama_kamar, musyrifs(id, nama)').order('nama_kamar'),
        ]);
        if (kelasRes.data) setKelasList(kelasRes.data);
        if (kamarRes.data) setKamarList(kamarRes.data);
    };

    const fetchSantri = async () => {
        setLoading(true);
        let query = supabase
            .from('santri')
            .select('id, nim, nama, kelas_id, kamar_id, is_ketua, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))');

        if (musyrifId) {
            // Filter by rooms that belong to this musyrif
            const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
            const roomIds = (rooms || []).map(r => r.id);
            query = query.in('kamar_id', roomIds);
        }

        const { data, error } = await query.order('nama');
        if (error) showToast('Gagal memuat data santri', 'error');
        else setSantriData(data || []);
        setLoading(false);
    };

    const handleOpenAdd = () => { setEditingId(null); setFormData({ nama: '', nim: '', kelas_id: '', kamar_id: '', is_ketua: false }); setIsModalOpen(true); };
    const handleOpenEdit = (s: any) => { setEditingId(s.id); setFormData({ nama: s.nama, nim: s.nim || '', kelas_id: s.kelas_id || '', kamar_id: s.kamar_id || '', is_ketua: !!s.is_ketua }); setIsModalOpen(true); };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);
        const { error } = await supabase.from('santri').delete().eq('id', confirmDelete.id);
        if (error) showToast('Gagal menghapus: ' + error.message, 'error');
        else { showToast('Santri berhasil dihapus', 'success'); fetchSantri(); }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const payload = {
            nama: formData.nama,
            nim: formData.nim || null,
            kelas_id: formData.kelas_id || null,
            kamar_id: formData.kamar_id || null,
            is_ketua: formData.is_ketua
        };
        const fn = editingId
            ? supabase.from('santri').update(payload).eq('id', editingId)
            : supabase.from('santri').insert([payload]);
        const { error } = await fn;
        if (error) showToast('Gagal menyimpan: ' + error.message, 'error');
        else { showToast(editingId ? 'Santri diperbarui' : 'Santri ditambahkan', 'success'); setIsModalOpen(false); fetchSantri(); }
        setSubmitting(false);
    };

    const filtered = useMemo(() => {
        return santriData.filter(s => {
            const matchesKelas = !kelasFilter || s.kelas_id === kelasFilter;
            const matchesKamar = !kamarFilter || s.kamar_id === kamarFilter;
            const matchesSearch = !search || s.nama.toLowerCase().includes(search.toLowerCase()) || (s.nim || '').includes(search);
            return matchesKelas && matchesKamar && matchesSearch;
        });
    }, [santriData, kelasFilter, kamarFilter, search]);

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleFilterChange = (v: string) => { setKelasFilter(v); setCurrentPage(1); };

    return (
        <div className="space-y-5">
            {!musyrifId && (
                <PageHeader
                    title="Data Santri"
                    subtitle="Kelola data murid, kelas, dan penempatan kamar."
                    action={
                        <Button icon={<Plus size={16} />} onClick={handleOpenAdd}>Tambah Santri</Button>
                    }
                />
            )}

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 space-y-3">
                <div className="flex flex-col md:flex-row gap-3">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                        <input
                            type="text"
                            placeholder="Cari nama atau NIM..."
                            value={search}
                            onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={kelasFilter}
                        onChange={e => handleFilterChange(e.target.value)}
                        className="flex-1 min-w-[150px] h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                    >
                        <option value="">Semua Kelas</option>
                        {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                    </select>
                    <select
                        value={kamarFilter}
                        onChange={e => { setKamarFilter(e.target.value); setCurrentPage(1); }}
                        className="flex-1 min-w-[150px] h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                    >
                        <option value="">Semua Kamar</option>
                        {kamarList
                            .filter(k => !musyrifId || k.musyrif_id === musyrifId || k.musyrifs?.id === musyrifId)
                            .map(k => <option key={k.id} value={k.id}>{k.nama_kamar}</option>)
                        }
                    </select>
                </div>
            </div>

            {/* Table */}
            <div>
                {loading ? <FullPageSpinner label="Memuat data santri..." /> : (
                    <>
                        <DataTable>
                            <thead>
                                <tr>
                                    <Th className="w-12">No</Th>
                                    <Th>Nama Santri</Th>
                                    <Th>Kelas</Th>
                                    <Th>Kamar</Th>
                                    <Th className="text-right">Aksi</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={musyrifId ? 4 : 5}><EmptyState message="Tidak ada data santri." /></td></tr>
                                ) : paginated.map((s, i) => (
                                    <Tr key={s.id}>
                                        <Td className="text-slate-400 text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</Td>
                                        <Td>
                                            <div className="flex items-center gap-2">
                                                <p className="font-semibold text-slate-800 leading-tight">{s.nama}</p>
                                                {s.is_ketua && (
                                                    <span className="flex items-center gap-1 px-1.5 py-0.5 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-md uppercase tracking-wider border border-amber-200">
                                                        <Crown size={10} /> Ketua
                                                    </span>
                                                )}
                                            </div>
                                            <p className="text-xs text-slate-400 mt-0.5">NIM: {s.nim || '-'}</p>
                                        </Td>
                                        <Td>
                                            <span className="px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded-lg">
                                                {s.kelas_list?.nama_kelas || '-'}
                                            </span>
                                        </Td>
                                        {!musyrifId && (
                                            <Td>
                                                <p className="text-slate-700">{s.kamars?.nama_kamar || '-'}</p>
                                                <p className="text-xs text-slate-400">{s.kamars?.musyrifs?.nama || ''}</p>
                                            </Td>
                                        )}
                                        {/* If MusyrifId, we group by room or show room name if multiple rooms */}
                                        {musyrifId && (
                                            <Td>
                                                <p className="text-slate-700 font-medium">{s.kamars?.nama_kamar || '-'}</p>
                                            </Td>
                                        )}
                                        <Td className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleOpenEdit(s)}
                                                    className="p-1.5 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                {!musyrifId && (
                                                    <button
                                                        onClick={() => setConfirmDelete({ id: s.id, nama: s.nama })}
                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                                                        title="Hapus"
                                                    >
                                                        <Trash2 size={15} />
                                                    </button>
                                                )}
                                            </div>
                                        </Td>
                                    </Tr>
                                ))}
                            </tbody>
                        </DataTable>

                        <Pagination
                            currentPage={currentPage}
                            totalPages={totalPages}
                            totalItems={filtered.length}
                            itemsPerPage={ITEMS_PER_PAGE}
                            onPageChange={setCurrentPage}
                        />
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Santri' : 'Tambah Santri'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama Lengkap</label>
                        <input type="text" required autoFocus className={inputCls}
                            value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">NIM (Nomor Induk Murid)</label>
                        <input type="text" className={inputCls} placeholder="Masukkan NIM..."
                            value={formData.nim} onChange={e => setFormData({ ...formData, nim: e.target.value })} />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelas</label>
                        <select required className={inputCls}
                            value={formData.kelas_id} onChange={e => setFormData({ ...formData, kelas_id: e.target.value })}>
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kamar</label>
                        <select
                            required
                            disabled={!!musyrifId}
                            className={`${inputCls} ${musyrifId ? 'bg-slate-100 cursor-not-allowed text-slate-500' : ''}`}
                            value={formData.kamar_id}
                            onChange={e => setFormData({ ...formData, kamar_id: e.target.value })}
                        >
                            <option value="">-- Pilih Kamar --</option>
                            {kamarList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama_kamar}{k.musyrifs ? ` (${k.musyrifs.nama})` : ''}</option>
                            ))}
                        </select>
                        {musyrifId && <p className="text-[10px] text-slate-400 mt-1">Hanya Admin yang dapat memindahkan santri ke kamar lain.</p>}
                    </div>
                    <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200">
                        <input
                            type="checkbox"
                            id="is_ketua"
                            className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary/20"
                            checked={formData.is_ketua}
                            onChange={e => setFormData({ ...formData, is_ketua: e.target.checked })}
                        />
                        <label htmlFor="is_ketua" className="text-sm font-semibold text-slate-700 cursor-pointer flex items-center gap-2">
                            <Crown size={16} className="text-amber-500" />
                            Jadikan sebagai Ketua Kamar
                        </label>
                    </div>
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting}>Simpan</Button>
                    </div>
                </form>
            </Modal>

            {/* Confirm Delete */}
            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                loading={submitting}
                message={`Yakin ingin menghapus santri "${confirmDelete?.nama}"? Tindakan ini tidak dapat dibatalkan.`}
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
