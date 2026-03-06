import { useState, useEffect, useMemo } from 'react';
import { Plus, Edit2, Trash2 } from 'lucide-react';
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

export default function DataSantri() {
    const [kelasFilter, setKelasFilter] = useState('');
    const [santriData, setSantriData] = useState<any[]>([]);
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; nama: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ nama: '', kelas_id: '', kamar_id: '' });
    const [submitting, setSubmitting] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => { fetchMasterData(); fetchSantri(); }, []);

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
        const { data, error } = await supabase
            .from('santri')
            .select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(nama_kamar, musyrifs(nama))')
            .order('nama');
        if (error) showToast('Gagal memuat data santri', 'error');
        else setSantriData(data || []);
        setLoading(false);
    };

    const handleOpenAdd = () => { setEditingId(null); setFormData({ nama: '', kelas_id: '', kamar_id: '' }); setIsModalOpen(true); };
    const handleOpenEdit = (s: any) => { setEditingId(s.id); setFormData({ nama: s.nama, kelas_id: s.kelas_id || '', kamar_id: s.kamar_id || '' }); setIsModalOpen(true); };

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
        const payload = { nama: formData.nama, kelas_id: formData.kelas_id || null, kamar_id: formData.kamar_id || null };
        const fn = editingId
            ? supabase.from('santri').update(payload).eq('id', editingId)
            : supabase.from('santri').insert([payload]);
        const { error } = await fn;
        if (error) showToast('Gagal menyimpan: ' + error.message, 'error');
        else { showToast(editingId ? 'Santri diperbarui' : 'Santri ditambahkan', 'success'); setIsModalOpen(false); fetchSantri(); }
        setSubmitting(false);
    };

    const filtered = useMemo(() =>
        kelasFilter ? santriData.filter(s => s.kelas_id === kelasFilter) : santriData,
        [santriData, kelasFilter]
    );

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleFilterChange = (v: string) => { setKelasFilter(v); setCurrentPage(1); };

    return (
        <div>
            <PageHeader
                title="Data Santri"
                subtitle="Kelola data santri beserta kamar dan kelas."
                action={
                    <Button icon={<Plus size={16} />} onClick={handleOpenAdd} fullWidth>
                        Tambah Santri
                    </Button>
                }
            />

            {/* Filter */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 flex flex-col sm:flex-row gap-3">
                <select
                    value={kelasFilter}
                    onChange={e => handleFilterChange(e.target.value)}
                    className="flex-1 h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                >
                    <option value="">Semua Kelas</option>
                    {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                </select>
            </div>

            {/* Table */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <FullPageSpinner label="Memuat data santri..." />
                ) : (
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
                                    <tr><td colSpan={5}><EmptyState message="Tidak ada data santri." /></td></tr>
                                ) : paginated.map((s, i) => (
                                    <Tr key={s.id}>
                                        <Td className="text-slate-400 text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</Td>
                                        <Td>
                                            <p className="font-semibold text-slate-800 leading-tight">{s.nama}</p>
                                            <p className="text-xs text-slate-400 mt-0.5">ID: {s.id.slice(0, 8)}</p>
                                        </Td>
                                        <Td>
                                            <span className="px-2 py-0.5 bg-primary-light text-primary text-xs font-medium rounded-lg">
                                                {s.kelas_list?.nama_kelas || '-'}
                                            </span>
                                        </Td>
                                        <Td>
                                            <p className="text-slate-700">{s.kamars?.nama_kamar || '-'}</p>
                                            <p className="text-xs text-slate-400">{s.kamars?.musyrifs?.nama || ''}</p>
                                        </Td>
                                        <Td className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleOpenEdit(s)}
                                                    className="p-1.5 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                <button
                                                    onClick={() => setConfirmDelete({ id: s.id, nama: s.nama })}
                                                    className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors"
                                                    title="Hapus"
                                                >
                                                    <Trash2 size={15} />
                                                </button>
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
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kelas</label>
                        <select required className={inputCls}
                            value={formData.kelas_id} onChange={e => setFormData({ ...formData, kelas_id: e.target.value })}>
                            <option value="">-- Pilih Kelas --</option>
                            {kelasList.map(k => <option key={k.id} value={k.id}>{k.nama_kelas}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Kamar</label>
                        <select required className={inputCls}
                            value={formData.kamar_id} onChange={e => setFormData({ ...formData, kamar_id: e.target.value })}>
                            <option value="">-- Pilih Kamar --</option>
                            {kamarList.map(k => (
                                <option key={k.id} value={k.id}>{k.nama_kamar}{k.musyrifs ? ` (${k.musyrifs.nama})` : ''}</option>
                            ))}
                        </select>
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
