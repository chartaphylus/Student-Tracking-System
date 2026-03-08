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

type TabType = 'musyrif' | 'kamar' | 'kelas';

const ITEMS_PER_PAGE = 8;
const inputCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/50 focus:bg-white transition-all`;

export default function DataReferensi() {
    const [activeTab, setActiveTab] = useState<TabType>('musyrif');
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string; nama: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nama, setNama] = useState('');
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [isPjKesehatan, setIsPjKesehatan] = useState(false);
    const [selectedMusyrifId, setSelectedMusyrifId] = useState('');
    const [submitting, setSubmitting] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => { fetchData(); setCurrentPage(1); }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'kelas') {
            const { data } = await supabase.from('kelas_list').select('*').order('nama_kelas');
            setKelasList(data || []);
        } else if (activeTab === 'musyrif') {
            const { data } = await supabase.from('musyrifs').select('*').order('nama');
            setMusyrifList(data || []);
        } else {
            const { data } = await supabase.from('kamars').select('id, nama_kamar, musyrif_id, musyrifs(nama)').order('nama_kamar');
            setKamarList(data || []);
            const musRes = await supabase.from('musyrifs').select('id, nama').order('nama');
            setMusyrifList(musRes.data || []);
        }
        setLoading(false);
    };

    const activeList = useMemo(() =>
        activeTab === 'kelas' ? kelasList : activeTab === 'musyrif' ? musyrifList : kamarList,
        [activeTab, kelasList, musyrifList, kamarList]
    );

    const totalPages = Math.max(1, Math.ceil(activeList.length / ITEMS_PER_PAGE));
    const paginatedItems = activeList.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    const handleOpenAdd = () => { setEditingId(null); setNama(''); setUsername(''); setPassword(''); setSelectedMusyrifId(''); setIsPjKesehatan(false); setIsModalOpen(true); };
    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        setNama(activeTab === 'kelas' ? item.nama_kelas : activeTab === 'musyrif' ? item.nama : item.nama_kamar);
        setUsername(item.username || '');
        setPassword(item.password || '');
        setIsPjKesehatan(!!item.is_pj_kesehatan);
        setSelectedMusyrifId(item.musyrif_id || '');
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);
        const table = activeTab === 'kelas' ? 'kelas_list' : activeTab === 'musyrif' ? 'musyrifs' : 'kamars';
        const { error } = await supabase.from(table as any).delete().eq('id', confirmDelete.id);
        if (error) showToast('Gagal menghapus: ' + error.message, 'error');
        else { showToast('Data berhasil dihapus', 'success'); fetchData(); }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const table = activeTab === 'kelas' ? 'kelas_list' : activeTab === 'musyrif' ? 'musyrifs' : 'kamars';
        const payload: any = activeTab === 'kelas'
            ? { nama_kelas: nama }
            : activeTab === 'musyrif'
                ? { nama, username, password, is_pj_kesehatan: isPjKesehatan }
                : { nama_kamar: nama, musyrif_id: selectedMusyrifId || null };

        const fn = editingId
            ? supabase.from(table as any).update(payload).eq('id', editingId)
            : supabase.from(table as any).insert([payload]);
        const { error } = await fn;
        if (error) showToast('Gagal menyimpan: ' + error.message, 'error');
        else { showToast(editingId ? 'Data diperbarui' : 'Data ditambahkan', 'success'); setIsModalOpen(false); fetchData(); }
        setSubmitting(false);
    };

    const labelMap: Record<TabType, string> = { musyrif: 'Musyrif', kamar: 'Kamar', kelas: 'Kelas' };
    const tabs: TabType[] = ['musyrif', 'kamar', 'kelas'];

    return (
        <div>
            <PageHeader title="Master Data Referensi" subtitle="Kelola daftar Musyrif, Kamar (Asrama), dan Kelas." />

            {/* Tabs */}
            <div className="flex gap-1 bg-slate-100 rounded-2xl p-1 mb-5 w-fit">
                {tabs.map(t => (
                    <button
                        key={t}
                        onClick={() => setActiveTab(t)}
                        className={`px-5 py-2 rounded-xl text-sm font-semibold transition-all ${activeTab === t
                            ? 'bg-white text-primary shadow-card'
                            : 'text-slate-500 hover:text-slate-700'
                            }`}
                    >
                        {t === 'musyrif' ? 'Musyrif' : t === 'kamar' ? 'Kamar' : 'Kelas'}
                    </button>
                ))}
            </div>

            {/* Table Card */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                {/* Card Header */}
                <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800">Daftar {labelMap[activeTab]}</h2>
                    <Button icon={<Plus size={15} />} size="sm" onClick={handleOpenAdd}>
                        Tambah {labelMap[activeTab]}
                    </Button>
                </div>

                {loading ? (
                    <FullPageSpinner label={`Memuat data ${labelMap[activeTab]}...`} />
                ) : (
                    <>
                        <DataTable>
                            <thead>
                                <tr>
                                    <Th className="w-12">No</Th>
                                    <Th>Nama</Th>
                                    {activeTab === 'musyrif' && <Th>Username</Th>}
                                    {activeTab === 'musyrif' && <Th>Password</Th>}
                                    {activeTab === 'musyrif' && <Th>PJ Kesehatan</Th>}
                                    {activeTab === 'kamar' && <Th>Musyrif</Th>}
                                    <Th className="text-right">Aksi</Th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedItems.length === 0 ? (
                                    <tr><td colSpan={4}><EmptyState message="Tidak ada data." /></td></tr>
                                ) : paginatedItems.map((item, i) => {
                                    const name = activeTab === 'kelas' ? item.nama_kelas : activeTab === 'musyrif' ? item.nama : item.nama_kamar;
                                    return (
                                        <Tr key={item.id}>
                                            <Td className="text-slate-400 text-xs">{(currentPage - 1) * ITEMS_PER_PAGE + i + 1}</Td>
                                            <Td className="font-medium text-slate-800">{name}</Td>
                                            {activeTab === 'musyrif' && (
                                                <>
                                                    <Td className="text-xs text-slate-500 font-mono">{item.username || '-'}</Td>
                                                    <Td className="text-xs text-slate-500 font-mono">{item.password || '-'}</Td>
                                                    <Td className="text-xs font-semibold">
                                                        {item.is_pj_kesehatan ? (
                                                            <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 rounded-lg">Ya</span>
                                                        ) : (
                                                            <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded-lg">Bukan</span>
                                                        )}
                                                    </Td>
                                                </>
                                            )}
                                            {activeTab === 'kamar' && (
                                                <Td>
                                                    <span className="px-2 py-0.5 bg-slate-100 text-slate-600 text-xs rounded-lg">
                                                        {item.musyrifs?.nama || '-'}
                                                    </span>
                                                </Td>
                                            )}
                                            <Td className="text-right">
                                                <div className="flex items-center justify-end gap-1.5">
                                                    <button onClick={() => handleOpenEdit(item)}
                                                        className="p-1.5 rounded-lg hover:bg-primary-light text-slate-400 hover:text-primary transition-colors">
                                                        <Edit2 size={15} />
                                                    </button>
                                                    <button onClick={() => setConfirmDelete({ id: item.id, nama: name })}
                                                        className="p-1.5 rounded-lg hover:bg-danger/10 text-slate-400 hover:text-danger transition-colors">
                                                        <Trash2 size={15} />
                                                    </button>
                                                </div>
                                            </Td>
                                        </Tr>
                                    );
                                })}
                            </tbody>
                        </DataTable>
                        <Pagination currentPage={currentPage} totalPages={totalPages} totalItems={activeList.length}
                            itemsPerPage={ITEMS_PER_PAGE} onPageChange={setCurrentPage} />
                    </>
                )}
            </div>

            {/* Add/Edit Modal */}
            <Modal open={isModalOpen} onClose={() => setIsModalOpen(false)}
                title={`${editingId ? 'Edit' : 'Tambah'} ${labelMap[activeTab]}`}>
                <form onSubmit={handleSave} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1.5">Nama {labelMap[activeTab]}</label>
                        <input type="text" required autoFocus className={inputCls}
                            value={nama} onChange={e => setNama(e.target.value)} />
                    </div>
                    {activeTab === 'kamar' && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1.5">Penanggung Jawab (Musyrif)</label>
                            <select required className={inputCls}
                                value={selectedMusyrifId} onChange={e => setSelectedMusyrifId(e.target.value)}>
                                <option value="">Pilih Musyrif</option>
                                {musyrifList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                            </select>
                        </div>
                    )}
                    {activeTab === 'musyrif' && (
                        <>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Username</label>
                                <input type="text" required className={inputCls} placeholder="Username login..."
                                    value={username} onChange={e => setUsername(e.target.value)} />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-1.5">Password</label>
                                <input type="text" required className={inputCls} placeholder="Password login..."
                                    value={password} onChange={e => setPassword(e.target.value)} />
                            </div>
                            <div className="flex items-center gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200 mt-2">
                                <input
                                    type="checkbox"
                                    id="is_pj_kesehatan"
                                    className="w-5 h-5 rounded-lg border-slate-300 text-primary focus:ring-primary/20"
                                    checked={isPjKesehatan}
                                    onChange={e => setIsPjKesehatan(e.target.checked)}
                                />
                                <label htmlFor="is_pj_kesehatan" className="text-sm font-semibold text-slate-700 cursor-pointer">
                                    Jadikan sebagai PJ Kesehatan (UKS)
                                </label>
                            </div>
                        </>
                    )}
                    <div className="flex gap-3 pt-2">
                        <Button type="button" variant="outline" fullWidth onClick={() => setIsModalOpen(false)} disabled={submitting}>Batal</Button>
                        <Button type="submit" fullWidth loading={submitting}>Simpan</Button>
                    </div>
                </form>
            </Modal>

            <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete}
                loading={submitting} message={`Yakin ingin menghapus "${confirmDelete?.nama}"?`} />
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div >
    );
}
