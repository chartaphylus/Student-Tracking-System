import { useState, useEffect } from 'react';
import { Edit2, Trash2, KeyRound, Plus, RefreshCw, Search } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';
import { supabase } from '../lib/supabase';
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

export default function DataAkunWali({ musyrifId }: { musyrifId?: string }) {
    const [akunData, setAkunData] = useState<any[]>([]);
    const [santriList, setSantriList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [search, setSearch] = useState('');
    const [kelasFilter, setKelasFilter] = useState('');
    const [kamarFilter, setKamarFilter] = useState('');
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);

    // Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; nim_id: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ nim_id: '', password: '', santri_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => {
        fetchMasterData();
        fetchAkunWali();
    }, []);

    const fetchMasterData = async () => {
        const [santriRes, kelasRes, kamarRes] = await Promise.all([
            supabase.from('santri').select('id, nama, nim, kamar_id'),
            supabase.from('kelas_list').select('*').order('nama_kelas'),
            supabase.from('kamars').select('id, nama_kamar, musyrifs(id, nama)').order('nama_kamar'),
        ]);

        if (santriRes.data) {
            let sList = santriRes.data;
            if (musyrifId) {
                const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
                const roomIds = (rooms || []).map(r => r.id);
                sList = sList.filter(s => roomIds.includes(s.kamar_id));
            }
            setSantriList(sList);
        }
        if (kelasRes.data) setKelasList(kelasRes.data);
        if (kamarRes.data) setKamarList(kamarRes.data);
    };

    const fetchAkunWali = async () => {
        setLoading(true);
        let query = supabase
            .from('akun_wali')
            .select('id, nim_id, password, santri_id, created_at, santri(id, nama, nim, kelas_id, kamar_id, kamars(musyrif_id))');

        if (musyrifId) {
            // Complex filter: we need students in musyrif's rooms
            const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
            const roomIds = (rooms || []).map(r => r.id);

            // First fetch santri IDs in those rooms
            const { data: santris } = await supabase.from('santri').select('id').in('kamar_id', roomIds);
            const santriIds = (santris || []).map(s => s.id);
            query = query.in('santri_id', santriIds);
        }

        const { data, error } = await query.order('created_at', { ascending: false });

        if (error) {
            // Check if table undefined error
            if (error.code === '42P01') {
                showToast('Tabel akun_wali belum dibuat di Database.', 'error');
            } else {
                showToast('Gagal memuat data akun: ' + error.message, 'error');
            }
        } else {
            setAkunData(data || []);
        }
        setLoading(false);
    };

    const handleOpenAdd = () => { setEditingId(null); setFormData({ nim_id: '', password: '', santri_id: '' }); setIsModalOpen(true); };

    const handleOpenEdit = (a: any) => {
        setEditingId(a.id);
        setFormData({ nim_id: a.nim_id, password: a.password, santri_id: a.santri_id });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);
        const { error } = await supabase.from('akun_wali').delete().eq('id', confirmDelete.id);
        if (error) showToast('Gagal menghapus: ' + error.message, 'error');
        else { showToast('Akun berhasil dihapus', 'success'); fetchAkunWali(); }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSyncAll = async () => {
        setIsSyncConfirmOpen(false);
        setSyncing(true);
        try {
            // Ambil data terbaru
            const { data: allSantri } = await supabase.from('santri').select('id, nama, nim');
            const { data: allAkun } = await supabase.from('akun_wali').select('id, nim_id, santri_id');
            
            if (!allSantri || !allAkun) throw new Error('Gagal mengambil data untuk sinkronisasi');

            const toCreate: any[] = [];
            const toUpdate: any[] = [];

            allSantri.forEach(s => {
                const akun = allAkun.find(a => a.santri_id === s.id);
                if (!akun) {
                    if (s.nim) {
                        toCreate.push({
                            santri_id: s.id,
                            nim_id: s.nim,
                            password: 'password123'
                        });
                    }
                } else if (akun.nim_id !== s.nim && s.nim) {
                    toUpdate.push({
                        id: akun.id,
                        nim_id: s.nim
                    });
                }
            });

            let createdCount = 0;
            let updatedCount = 0;

            if (toCreate.length > 0) {
                const { error } = await supabase.from('akun_wali').insert(toCreate);
                if (!error) createdCount = toCreate.length;
            }

            if (toUpdate.length > 0) {
                for (const item of toUpdate) {
                    const { error } = await supabase.from('akun_wali').update({ nim_id: item.nim_id }).eq('id', item.id);
                    if (!error) updatedCount++;
                }
            }

            showToast(`Sinkronisasi selesai: ${createdCount} akun dibuat, ${updatedCount} NIS diperbarui`, 'success');
            fetchAkunWali();
        } catch (err: any) {
            showToast('Gagal sinkronisasi: ' + err.message, 'error');
        } finally {
            setSyncing(false);
        }
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        // Ambil NIS dari data santri untuk disinkronkan ke nim_id
        const selectedSantri = santriList.find(s => s.id === formData.santri_id);
        const finalNimId = selectedSantri?.nim || formData.nim_id;

        if (!finalNimId) {
            showToast('NIS santri belum diisi. Harap isi NIS di Data Santri terlebih dahulu.', 'error');
            setSubmitting(false);
            return;
        }

        const payload = { nim_id: finalNimId, password: formData.password, santri_id: formData.santri_id };

        const fn = editingId
            ? supabase.from('akun_wali').update(payload).eq('id', editingId)
            : supabase.from('akun_wali').insert([payload]);

        const { error } = await fn;
        if (error) showToast('Gagal menyimpan: ' + error.message, 'error');
        else { showToast(editingId ? 'Akun diperbarui' : 'Akun ditambahkan', 'success'); setIsModalOpen(false); fetchAkunWali(); }
        setSubmitting(false);
    };

    const filtered = akunData.filter(a => {
        const matchesSearch = (a.nim_id || '').toLowerCase().includes(search.toLowerCase()) ||
            ((a.santri as any)?.nama || '').toLowerCase().includes(search.toLowerCase());
        
        const santri = a.santri as any;
        const matchesKelas = !kelasFilter || santri?.kelas_id === kelasFilter;
        const matchesKamar = !kamarFilter || santri?.kamar_id === kamarFilter;
        
        return matchesSearch && matchesKelas && matchesKamar;
    });

    const totalPages = Math.max(1, Math.ceil(filtered.length / ITEMS_PER_PAGE));
    const paginated = filtered.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    return (
        <div className="space-y-5">
            {!musyrifId && (
                <PageHeader
                    title="Data Akun Wali"
                    subtitle="Kelola akses masuk orang tua dan wali santri."
                    action={
                        <div className="flex gap-2">
                            <Button 
                                variant="outline" 
                                icon={<RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />} 
                                onClick={() => setIsSyncConfirmOpen(true)}
                                disabled={syncing}
                            >
                                {syncing ? 'Sinkroning...' : 'Sinkronkan Data'}
                            </Button>
                            <Button icon={<Plus size={16} />} onClick={handleOpenAdd}>Tambah Akun</Button>
                        </div>
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
                            placeholder="Cari NIS atau nama santri..."
                            value={search}
                            onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                            className="w-full h-10 pl-10 pr-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all"
                        />
                    </div>
                </div>
                <div className="flex flex-wrap gap-3">
                    <select
                        value={kelasFilter}
                        onChange={e => { setKelasFilter(e.target.value); setCurrentPage(1); }}
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
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {loading ? (
                    <FullPageSpinner label="Memuat data akun..." />
                ) : (
                    <>
                        <DataTable>
                            <thead>
                                <tr>
                                    <Th className="w-12">No</Th>
                                    <Th>NIS</Th>
                                    <Th>Password</Th>
                                    <Th>Data Santri</Th>
                                    <Th className="text-right">Aksi</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginated.length === 0 ? (
                                    <tr><td colSpan={5}><EmptyState message="Tidak ada data akun wali santri." /></td></tr>
                                ) : paginated.map((a, i) => (
                                    <Tr key={a.id}>
                                        <Td className="text-slate-400 text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</Td>
                                        <Td>
                                            <p className="font-semibold text-slate-800">{a.nim_id}</p>
                                        </Td>
                                        <Td>
                                            <div className="flex items-center gap-1.5 text-slate-500 bg-slate-50 px-2 py-1 rounded inline-flex">
                                                <KeyRound size={14} className="text-slate-400" />
                                                <span className="font-mono text-xs">{a.password}</span>
                                            </div>
                                        </Td>
                                        <Td>
                                            <p className="font-semibold text-primary">{(a.santri as any)?.nama || 'Tidak Ditemukan'}</p>
                                        </Td>
                                        <Td className="text-right">
                                            <div className="flex items-center justify-end gap-1.5">
                                                <button
                                                    onClick={() => handleOpenEdit(a)}
                                                    className="p-1.5 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors"
                                                    title="Edit"
                                                >
                                                    <Edit2 size={15} />
                                                </button>
                                                {!musyrifId && (
                                                    <button
                                                        onClick={() => setConfirmDelete({ id: a.id, nim_id: a.nim_id })}
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
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingId ? 'Edit Akun Wali' : 'Tambah Akun Wali'}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Santri (Anak)</label>
                        <select required className={inputCls}
                            value={formData.santri_id} onChange={e => setFormData({ ...formData, santri_id: e.target.value })}>
                            <option value="">-- Pilih Santri --</option>
                            {santriList.map(s => <option key={s.id} value={s.id}>{s.nama}</option>)}
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">NIS (ID Login)</label>
                        <div className="flex items-center gap-2">
                            <input type="text" readOnly className={`${inputCls} bg-slate-100 cursor-not-allowed`}
                                value={santriList.find(s => s.id === formData.santri_id)?.nim || 'Pilih santri...'} />
                        </div>
                        <p className="text-[10px] text-slate-400 mt-1">* Otomatis mengambil NIS dari Data Santri</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                        <input type="text" required className={inputCls} placeholder="Password singkat..."
                            value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
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
                message={`Yakin ingin menghapus akun dengan NIS "${confirmDelete?.nim_id}"?`}
            />

            {/* Confirm Sync All */}
            <ConfirmModal
                open={isSyncConfirmOpen}
                onClose={() => setIsSyncConfirmOpen(false)}
                onConfirm={handleSyncAll}
                loading={syncing}
                title="Sinkronisasi Akun Wali"
                confirmLabel="Ya, Sinkronkan"
                message="Sinkronkan semua data akun wali dengan data santri? Ini akan membuat akun yang belum ada dan memperbarui NIS yang salah untuk akun yang sudah ada."
            />

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
