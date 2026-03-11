import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString, getLocalDateTimeString } from '../lib/dateUtils';
import { Search, Plus, Edit2, Trash2, Stethoscope, Pill, Activity, ShieldCheck, HeartPulse } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function InventarisKesehatan({ musyrifId }: { musyrifId?: string }) {
    const [activeTab, setActiveTab] = useState<'log_sakit' | 'riwayat_obat' | 'obat_uks' | 'pj_kesehatan'>('log_sakit');
    const [isPjKesehatan, setIsPjKesehatan] = useState(false);
    const [santriList, setSantriList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const { toasts, removeToast, showToast } = useToast();

    useEffect(() => {
        setupAccessAndData();
    }, [musyrifId]);

    const setupAccessAndData = async () => {
        setLoading(true);
        try {
            // Check PJ Status
            if (musyrifId) {
                const { data: mData } = await supabase.from('musyrifs').select('is_pj_kesehatan').eq('id', musyrifId).single();
                if (mData?.is_pj_kesehatan) {
                    setIsPjKesehatan(true);
                } else {
                    setIsPjKesehatan(false);
                }
            } else {
                setIsPjKesehatan(true); // Admin is implicitly a PJ
            }

            // Fetch Santri List
            let sQuery = supabase.from('santri').select('id, nama, kelas_list(nama_kelas), kamars(nama_kamar, musyrif_id, musyrifs(nama))');
            if (musyrifId) {
                const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
                const roomIds = (rooms || []).map(r => r.id);
                sQuery = sQuery.in('kamar_id', roomIds);
            }
            const { data: sData } = await sQuery.order('nama');
            setSantriList(sData || []);
        } catch (error) {
            console.error('Error init UKS:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return <div className="py-12"><FullPageSpinner label="Memuat Data UKS..." /></div>;
    }

    const tabs = [
        { id: 'log_sakit', label: 'Log Sakit', icon: Activity },
        { id: 'riwayat_obat', label: 'Riwayat Obat', icon: HeartPulse },
        { id: 'obat_uks', label: 'Stok Obat UKS', icon: Pill },
    ];

    if (!musyrifId) {
        tabs.push({ id: 'pj_kesehatan', label: 'Kelola PJ Kesehatan', icon: ShieldCheck });
    }

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card overflow-hidden">
                <div className="p-6 md:p-8 flex flex-col md:flex-row gap-6 md:items-center justify-between border-b border-slate-100 bg-slate-50">
                    <div>
                        <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                            <Stethoscope className="text-rose-500" />
                            UKS & Inventaris Kesehatan
                        </h2>
                        <p className="text-slate-500 mt-1">Kelola data sakit santri, riwayat pengobatan, dan stok UKS.</p>
                    </div>
                </div>

                {/* Tabs Header */}
                <div className="flex border-b border-slate-200 overflow-x-auto custom-scrollbar">
                    {tabs.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id as any)}
                            className={`flex items-center gap-2 px-6 py-4 font-bold text-sm transition-colors whitespace-nowrap ${activeTab === tab.id
                                ? 'text-rose-600 border-b-2 border-rose-500 bg-rose-50/50'
                                : 'text-slate-500 hover:text-slate-700 hover:bg-slate-50 border-b-2 border-transparent'
                                }`}
                        >
                            <tab.icon size={18} className={activeTab === tab.id ? 'text-rose-500' : 'text-slate-400'} />
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* Tabs Content */}
                <div className="p-6 md:p-8">
                    {activeTab === 'log_sakit' && <TabLogSakit santriList={santriList} showToast={showToast} musyrifId={musyrifId} />}
                    {activeTab === 'riwayat_obat' && <TabRiwayatObat santriList={santriList} showToast={showToast} musyrifId={musyrifId} />}
                    {activeTab === 'obat_uks' && <TabObatUks isPjKesehatan={isPjKesehatan} showToast={showToast} />}
                    {activeTab === 'pj_kesehatan' && !musyrifId && <TabPjKesehatan showToast={showToast} />}
                </div>
            </div>
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB COMPONENT: Log Sakit
// ----------------------------------------------------------------------
function TabLogSakit({ santriList, showToast, musyrifId }: any) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null);
    const [searchSantri, setSearchSantri] = useState('');
    const [formData, setFormData] = useState({
        santri_id: '',
        waktu_mulai_sakit: getLocalDateTimeString(),
        gejala: '',
        status_ortu: 'Belum Dikabari',
        keterangan: ''
    });

    useEffect(() => { fetchRecords(); }, [santriList]);

    const fetchRecords = async () => {
        if (!santriList.length && musyrifId) {
            setRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let q = supabase.from('log_sakit').select('*, santri(nama, kelas_list(nama_kelas), kamars(nama_kamar, musyrifs(nama)))').order('waktu_mulai_sakit', { ascending: false });
            if (musyrifId) q = q.in('santri_id', santriList.map((s: any) => s.id));
            const { data, error } = await q;
            if (error) throw error;
            setRecords(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (r?: any) => {
        setSearchSantri('');
        if (r) {
            setEditId(r.id);
            const formatted = getLocalDateTimeString(new Date(r.waktu_mulai_sakit));
            setFormData({
                santri_id: r.santri_id,
                waktu_mulai_sakit: formatted,
                gejala: r.gejala,
                status_ortu: r.status_ortu || 'Belum Dikabari',
                keterangan: r.keterangan || ''
            });
        } else {
            setEditId(null);
            setFormData({
                santri_id: '',
                waktu_mulai_sakit: getLocalDateTimeString(),
                gejala: '',
                status_ortu: 'Belum Dikabari',
                keterangan: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // convert local datetime to UTC for postgres
            const payload = {
                ...formData,
                waktu_mulai_sakit: new Date(formData.waktu_mulai_sakit).toISOString()
            };

            if (editId) {
                const { error } = await supabase.from('log_sakit').update(payload).eq('id', editId);
                if (error) throw error;
                showToast('Log sakit diperbarui', 'success');
            } else {
                const { error } = await supabase.from('log_sakit').insert([payload]);
                if (error) throw error;
                showToast('Log sakit ditambahkan', 'success');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const { error } = await supabase.from('log_sakit').delete().eq('id', confirmDelete.id);
        if (error) showToast(error.message, 'error');
        else fetchRecords();
        setConfirmDelete(null);
    };

    const filtered = records.filter(r =>
        (r.santri?.nama || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.gejala || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Cari santri, gejala..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
                </div>
                <Button className="!bg-rose-500 hover:!bg-rose-600" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>Catat Sakit</Button>
            </div>

            {loading ? <div className="py-6"><FullPageSpinner label="Memuat Log Sakit..." /></div> :
                filtered.length === 0 ? <EmptyState message="Tidak ada data log sakit." /> : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="px-4 py-3">Waktu Mulai Sakit</th>
                                    <th className="px-4 py-3">Nama Santri</th>
                                    <th className="px-4 py-3">Kelas & Kamar</th>
                                    <th className="px-4 py-3">Gejala</th>
                                    <th className="px-4 py-3">Status Ortu</th>
                                    <th className="px-4 py-3">Keterangan</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 text-sm hover:bg-slate-50/50">
                                        <td className="px-4 py-3">{new Date(r.waktu_mulai_sakit).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">{r.santri?.nama || '-'}</td>
                                        <td className="px-4 py-3">
                                            <div className="text-primary font-medium text-xs">{r.santri?.kelas_list?.nama_kelas || '-'}</div>
                                            <div className="text-slate-500 text-[11px]">{r.santri?.kamars?.nama_kamar || '-'}</div>
                                        </td>
                                        <td className="px-4 py-3">{r.gejala}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide ${r.status_ortu === 'Sudah Dikabari' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'
                                                }`}>{r.status_ortu}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{r.keterangan || '-'}</td>
                                        <td className="px-4 py-3 flex justify-center gap-2">
                                            <button onClick={() => handleOpenModal(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => setConfirmDelete({ id: r.id })} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{editId ? 'Edit Log Sakit' : 'Catat Sakit Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Santri</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" placeholder="Ketik nama santri..." value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                                </div>
                                <select required value={formData.santri_id} onChange={e => setFormData({ ...formData, santri_id: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20">
                                    <option value="">-- Pilih Santri --</option>
                                    {santriList
                                        .filter((s: any) => s.nama.toLowerCase().includes(searchSantri.toLowerCase()) || s.id === formData.santri_id)
                                        .map((s: any) => <option key={s.id} value={s.id}>{s.nama} ({s.kamars?.nama_kamar})</option>)}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Waktu Mulai Sakit</label>
                                <input type="datetime-local" required value={formData.waktu_mulai_sakit} onChange={e => setFormData({ ...formData, waktu_mulai_sakit: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Gejala</label>
                                <input type="text" required placeholder="Contoh: Demam, Batuk" value={formData.gejala} onChange={e => setFormData({ ...formData, gejala: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Status Informasi ke Ortu</label>
                                <select value={formData.status_ortu} onChange={e => setFormData({ ...formData, status_ortu: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20">
                                    <option value="Belum Dikabari">Belum Dikabari</option>
                                    <option value="Sudah Dikabari">Sudah Dikabari</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Keterangan Tambahan / Tindakan</label>
                                <input type="text" placeholder="Catatan opsional..." value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                <Button type="submit" className="!bg-rose-500 hover:!bg-rose-600">Simpan Log</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                message="Yakin ingin menghapus catatan log sakit ini? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB COMPONENT: Riwayat Pemberian Obat
// ----------------------------------------------------------------------
function TabRiwayatObat({ santriList, showToast, musyrifId }: any) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null);
    const [searchSantri, setSearchSantri] = useState('');
    const [formData, setFormData] = useState({
        santri_id: '',
        waktu_diberikan: getLocalDateTimeString(),
        nama_obat: '',
        jenis_obat: 'UKS',
        pemberi_obat: '',
        keterangan: ''
    });
    const [obatUksList, setObatUksList] = useState<any[]>([]);
    const [sakitSantriIds, setSakitSantriIds] = useState<Set<string>>(new Set());

    useEffect(() => {
        fetchRecords();
        fetchAuxData();
    }, [santriList]);

    const fetchAuxData = async () => {
        const { data: oData } = await supabase.from('obat_uks').select('nama_obat, stok').order('nama_obat');
        if (oData) setObatUksList(oData);

        const { data: sData } = await supabase.from('log_sakit').select('santri_id');
        if (sData) {
            setSakitSantriIds(new Set(sData.map((s: any) => s.santri_id)));
        }
    };

    const fetchRecords = async () => {
        if (!santriList.length && musyrifId) {
            setRecords([]);
            setLoading(false);
            return;
        }
        setLoading(true);
        try {
            let q = supabase.from('riwayat_obat').select('*, santri(nama, kelas_list(nama_kelas), kamars(nama_kamar, musyrifs(nama)))').order('waktu_diberikan', { ascending: false });
            if (musyrifId) q = q.in('santri_id', santriList.map((s: any) => s.id));
            const { data, error } = await q;
            if (error) throw error;
            setRecords(data || []);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(false);
        }
    };

    const handleOpenModal = (r?: any) => {
        setSearchSantri('');
        if (r) {
            setEditId(r.id);
            const formatted = getLocalDateTimeString(new Date(r.waktu_diberikan));
            setFormData({
                santri_id: r.santri_id,
                waktu_diberikan: formatted,
                nama_obat: r.nama_obat,
                jenis_obat: r.jenis_obat || 'UKS',
                pemberi_obat: r.pemberi_obat,
                keterangan: r.keterangan || ''
            });
        } else {
            setEditId(null);
            const musyrifSession = localStorage.getItem('musyrif_session');
            let mName = '';
            if (musyrifSession) {
                try { mName = JSON.parse(musyrifSession).nama; } catch (e) { }
            }

            setFormData({
                santri_id: '',
                waktu_diberikan: getLocalDateTimeString(),
                nama_obat: '',
                jenis_obat: 'UKS',
                pemberi_obat: mName,
                keterangan: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            const payload = {
                ...formData,
                waktu_diberikan: new Date(formData.waktu_diberikan).toISOString()
            };
            if (editId) {
                const { error } = await supabase.from('riwayat_obat').update(payload).eq('id', editId);
                if (error) throw error;
                showToast('Riwayat obat diperbarui', 'success');
            } else {
                const { error } = await supabase.from('riwayat_obat').insert([payload]);
                if (error) throw error;
                showToast('Riwayat obat ditambahkan', 'success');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        const { error } = await supabase.from('riwayat_obat').delete().eq('id', confirmDelete.id);
        if (error) showToast(error.message, 'error');
        else fetchRecords();
        setConfirmDelete(null);
    };

    const filtered = records.filter(r =>
        (r.santri?.nama || '').toLowerCase().includes(search.toLowerCase()) ||
        (r.nama_obat || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Cari santri, obat..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
                </div>
                <Button className="!bg-rose-500 hover:!bg-rose-600" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>Catat Pemberian Obat</Button>
            </div>

            {loading ? <div className="py-6"><FullPageSpinner label="Memuat Riwayat Obat..." /></div> :
                filtered.length === 0 ? <EmptyState message="Tidak ada riwayat pemberian obat." /> : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse min-w-[900px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="px-4 py-3">Waktu Diberikan</th>
                                    <th className="px-4 py-3">Nama Santri</th>
                                    <th className="px-4 py-3">Nama Obat</th>
                                    <th className="px-4 py-3">Jenis Obat</th>
                                    <th className="px-4 py-3">Pemberi Obat</th>
                                    <th className="px-4 py-3">Keterangan</th>
                                    <th className="px-4 py-3 text-center">Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map(r => (
                                    <tr key={r.id} className="border-b border-slate-100 text-sm hover:bg-slate-50/50">
                                        <td className="px-4 py-3">{new Date(r.waktu_diberikan).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}</td>
                                        <td className="px-4 py-3 font-semibold text-slate-700">{r.santri?.nama || '-'}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{r.nama_obat}</td>
                                        <td className="px-4 py-3">
                                            <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${r.jenis_obat === 'Pribadi' ? 'bg-amber-100 text-amber-700' : 'bg-rose-100 text-rose-700'
                                                }`}>{r.jenis_obat}</span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-600">{r.pemberi_obat}</td>
                                        <td className="px-4 py-3 text-slate-500">{r.keterangan || '-'}</td>
                                        <td className="px-4 py-3 flex justify-center gap-2">
                                            <button onClick={() => handleOpenModal(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                            <button onClick={() => setConfirmDelete({ id: r.id })} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-xl overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center">
                            <h3 className="font-bold text-lg text-slate-800">{editId ? 'Edit Pemberian Obat' : 'Catat Pemberian Obat'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-100 p-2 rounded-xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Santri</label>
                                <div className="relative mb-2">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                                    <input type="text" placeholder="Ketik nama santri..." value={searchSantri} onChange={e => setSearchSantri(e.target.value)}
                                        className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                                </div>
                                <select required value={formData.santri_id} onChange={e => setFormData({ ...formData, santri_id: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20">
                                    <option value="">-- Pilih Santri --</option>
                                    {(() => {
                                        const filteredSantri = santriList.filter((s: any) => s.nama.toLowerCase().includes(searchSantri.toLowerCase()) || s.id === formData.santri_id);
                                        const sakitList = filteredSantri.filter((s: any) => sakitSantriIds.has(s.id));
                                        const sehatList = filteredSantri.filter((s: any) => !sakitSantriIds.has(s.id));
                                        return (
                                            <>
                                                {sakitList.length > 0 && (
                                                    <optgroup label="--- SEDANG SAKIT ---">
                                                        {sakitList.map((s: any) => <option key={s.id} value={s.id}>{s.nama} ({s.kamars?.nama_kamar})</option>)}
                                                    </optgroup>
                                                )}
                                                {sehatList.length > 0 && (
                                                    <optgroup label="--- SANTRI LAINNYA ---">
                                                        {sehatList.map((s: any) => <option key={s.id} value={s.id}>{s.nama} ({s.kamars?.nama_kamar})</option>)}
                                                    </optgroup>
                                                )}
                                            </>
                                        );
                                    })()}
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Waktu Diberikan</label>
                                <input type="datetime-local" required value={formData.waktu_diberikan} onChange={e => setFormData({ ...formData, waktu_diberikan: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Jenis Obat</label>
                                    <select value={formData.jenis_obat} onChange={e => setFormData({ ...formData, jenis_obat: e.target.value, nama_obat: '' })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20">
                                        <option value="UKS">Sedia UKS</option>
                                        <option value="Pribadi">Obat Pribadi / Dari Ortu</option>
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nama Obat</label>
                                    {formData.jenis_obat === 'UKS' ? (
                                        <select required value={formData.nama_obat} onChange={e => setFormData({ ...formData, nama_obat: e.target.value })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20">
                                            <option value="">-- Pilih Obat UKS --</option>
                                            {obatUksList.map(o => (
                                                <option key={o.nama_obat} value={o.nama_obat}>{o.nama_obat} (Stok: {o.stok})</option>
                                            ))}
                                            {formData.nama_obat && !obatUksList.find(o => o.nama_obat === formData.nama_obat) && (
                                                <option value={formData.nama_obat}>{formData.nama_obat}</option>
                                            )}
                                        </select>
                                    ) : (
                                        <input type="text" required placeholder="Ketik secara manual..." value={formData.nama_obat} onChange={e => setFormData({ ...formData, nama_obat: e.target.value })}
                                            className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                                    )}
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Pemberi Obat / Penanggung Jawab</label>
                                <input type="text" required placeholder="Nama yang memberi" value={formData.pemberi_obat} onChange={e => setFormData({ ...formData, pemberi_obat: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Keterangan Tambahan / Dosis</label>
                                <input type="text" placeholder="Contoh: Diberikan 1 tablet paska makan" value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-slate-50 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                <Button type="submit" className="!bg-rose-500 hover:!bg-rose-600">Simpan Catatan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                message="Yakin ingin menghapus riwayat pemberian obat ini? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB COMPONENT: Data Obat P3K UKS
// ----------------------------------------------------------------------
function TabObatUks({ isPjKesehatan, showToast }: any) {
    const [records, setRecords] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editId, setEditId] = useState<string | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string } | null>(null);
    const [formData, setFormData] = useState({
        nama_obat: '',
        tanggal_pembelian: getLocalDateString(),
        stok: 0,
        keterangan: ''
    });

    useEffect(() => { fetchRecords(); }, []);

    const fetchRecords = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('obat_uks').select('*').order('nama_obat');
        if (error) showToast(error.message, 'error');
        else setRecords(data || []);
        setLoading(false);
    };

    const handleOpenModal = (r?: any) => {
        if (!isPjKesehatan) return;
        if (r) {
            setEditId(r.id);
            setFormData({
                nama_obat: r.nama_obat,
                tanggal_pembelian: r.tanggal_pembelian || getLocalDateString(),
                stok: r.stok,
                keterangan: r.keterangan || ''
            });
        } else {
            setEditId(null);
            setFormData({
                nama_obat: '',
                tanggal_pembelian: getLocalDateString(),
                stok: 0,
                keterangan: ''
            });
        }
        setIsModalOpen(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editId) {
                const { error } = await supabase.from('obat_uks').update(formData).eq('id', editId);
                if (error) throw error;
                showToast('Obat diperbarui', 'success');
            } else {
                const { error } = await supabase.from('obat_uks').insert([formData]);
                if (error) throw error;
                showToast('Obat ditambahkan', 'success');
            }
            setIsModalOpen(false);
            fetchRecords();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    const handleDelete = async () => {
        if (!isPjKesehatan || !confirmDelete) return;
        const { error } = await supabase.from('obat_uks').delete().eq('id', confirmDelete.id);
        if (error) showToast(error.message, 'error');
        else fetchRecords();
        setConfirmDelete(null);
    };

    const filtered = records.filter(r =>
        (r.nama_obat || '').toLowerCase().includes(search.toLowerCase())
    );

    return (
        <div>
            {!isPjKesehatan && (
                <div className="mb-6 p-4 bg-amber-50 text-amber-800 rounded-xl border border-amber-200 text-sm">
                    <strong>Pemberitahuan:</strong> Anda hanya dapat <b>melihat</b> stok obat. Hanya <b>PJ Kesehatan</b> dan <b>Admin</b> yang berwenang memperbarui stok obat UKS.
                </div>
            )}

            <div className="flex flex-col sm:flex-row gap-4 justify-between mb-6">
                <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input type="text" placeholder="Cari obat..." value={search} onChange={e => setSearch(e.target.value)}
                        className="pl-9 pr-4 py-2 w-full sm:w-64 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-rose-500/20" />
                </div>
                {isPjKesehatan && (
                    <Button className="!bg-rose-500 hover:!bg-rose-600" icon={<Plus size={16} />} onClick={() => handleOpenModal()}>Tambah Stok Obat</Button>
                )}
            </div>

            {loading ? <div className="py-6"><FullPageSpinner label="Memuat Data Obat..." /></div> :
                filtered.length === 0 ? <EmptyState message="Belum ada obat yang terdaftar di UKS." /> : (
                    <div className="overflow-x-auto rounded-xl border border-slate-200">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="px-4 py-3 w-16 text-center">No</th>
                                    <th className="px-4 py-3">Nama Obat</th>
                                    <th className="px-4 py-3">Tanggal Pembelian</th>
                                    <th className="px-4 py-3 text-center">Stok Tersedia</th>
                                    <th className="px-4 py-3">Keterangan / Kegunaan</th>
                                    {isPjKesehatan && <th className="px-4 py-3 text-center w-24">Aksi</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {filtered.map((r, idx) => (
                                    <tr key={r.id} className="border-b border-slate-100 text-sm hover:bg-slate-50/50">
                                        <td className="px-4 py-3 text-center text-slate-400">{idx + 1}</td>
                                        <td className="px-4 py-3 font-bold text-slate-800">{r.nama_obat}</td>
                                        <td className="px-4 py-3 text-slate-600">{r.tanggal_pembelian}</td>
                                        <td className="px-4 py-3 text-center">
                                            <span className={`px-3 py-1 rounded-full font-bold ${r.stok <= 5 ? 'bg-red-100 text-red-700' : 'bg-slate-100 text-slate-700'}`}>
                                                {r.stok}
                                            </span>
                                        </td>
                                        <td className="px-4 py-3 text-slate-500">{r.keterangan || '-'}</td>
                                        {isPjKesehatan && (
                                            <td className="px-4 py-3 flex justify-center gap-2">
                                                <button onClick={() => handleOpenModal(r)} className="p-1.5 text-blue-600 hover:bg-blue-50 rounded"><Edit2 size={16} /></button>
                                                <button onClick={() => setConfirmDelete({ id: r.id })} className="p-1.5 text-red-600 hover:bg-red-50 rounded"><Trash2 size={16} /></button>
                                            </td>
                                        )}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}

            {/* Modal */}
            {isModalOpen && isPjKesehatan && (
                <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-3xl shadow-xl w-full max-w-lg overflow-hidden">
                        <div className="px-6 py-5 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                            <h3 className="font-bold text-lg text-slate-800">{editId ? 'Edit Stok Obat' : 'Tambah Obat Baru'}</h3>
                            <button onClick={() => setIsModalOpen(false)} className="text-slate-400 hover:bg-slate-200 p-2 rounded-xl">&times;</button>
                        </div>
                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Nama Obat & Merek</label>
                                <input type="text" required placeholder="Contoh: Panadol 500mg" value={formData.nama_obat} onChange={e => setFormData({ ...formData, nama_obat: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Tanggal Pembelian</label>
                                    <input type="date" required value={formData.tanggal_pembelian} onChange={e => setFormData({ ...formData, tanggal_pembelian: e.target.value })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                                </div>
                                <div>
                                    <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Jumlah Stok / Pcs</label>
                                    <input type="number" min="0" required value={formData.stok} onChange={e => setFormData({ ...formData, stok: parseInt(e.target.value) || 0 })}
                                        className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                                </div>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-slate-500 mb-2 uppercase">Kegunaan / Keterangan Tambahan</label>
                                <input type="text" placeholder="Contoh: Sakit Kepala, Demam" value={formData.keterangan} onChange={e => setFormData({ ...formData, keterangan: e.target.value })}
                                    className="w-full h-11 px-4 rounded-xl border border-slate-200 text-sm focus:ring-2 focus:ring-rose-500/20" />
                            </div>
                            <div className="flex justify-end gap-3 pt-4">
                                <Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>Batal</Button>
                                <Button type="submit" className="!bg-rose-500 hover:!bg-rose-600">Simpan Inventaris</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            <ConfirmModal
                open={!!confirmDelete}
                onClose={() => setConfirmDelete(null)}
                onConfirm={handleDelete}
                message="Yakin ingin menghapus obat ini dari inventaris UKS? Tindakan ini tidak dapat dibatalkan."
            />
        </div>
    );
}

// ----------------------------------------------------------------------
// SUB COMPONENT: Kelola PJ Kesehatan (Admin Only)
// ----------------------------------------------------------------------
function TabPjKesehatan({ showToast }: any) {
    const [musyrifs, setMusyrifs] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => { fetchMusyrifs(); }, []);

    const fetchMusyrifs = async () => {
        setLoading(true);
        const { data, error } = await supabase.from('musyrifs').select('id, nama, is_pj_kesehatan').order('nama');
        if (error) showToast(error.message, 'error');
        else setMusyrifs(data || []);
        setLoading(false);
    };

    const togglePjRole = async (id: string, currentStatus: boolean) => {
        try {
            const { error } = await supabase.from('musyrifs').update({ is_pj_kesehatan: !currentStatus }).eq('id', id);
            if (error) throw error;
            showToast('Hak akses PJ Kesehatan diperbarui', 'success');
            fetchMusyrifs();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
    };

    if (loading) return <div className="py-6"><FullPageSpinner label="Memuat Data Musyrif..." /></div>;

    const pjs = musyrifs.filter(m => m.is_pj_kesehatan);
    const nonPjs = musyrifs.filter(m => !m.is_pj_kesehatan);

    return (
        <div className="space-y-8">
            <div className="bg-rose-50 p-5 rounded-2xl border border-rose-100 flex items-start gap-4">
                <ShieldCheck size={28} className="text-rose-500 shrink-0 mt-1" />
                <div>
                    <h3 className="font-bold text-rose-900 text-lg">Kelola Hak Akses UKS</h3>
                    <p className="text-rose-700 text-sm leading-relaxed mt-1">
                        Secara bawaan, semua Musyrif hanya dapat melihat data obat P3K UKS tanpa bisa mengubah stoknya.
                        Jadikan Musyrif sebagai <b>PJ Kesehatan</b> di sini agar mereka mendapat akses penuh (Tambah/Ubah/Hapus Obat). Anda dapat menunjuk lebih dari satu PJ.
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                {/* List PJ */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 font-bold text-slate-800 flex justify-between items-center">
                        Daftar PJ Kesehatan Aktif
                        <span className="bg-rose-100 text-rose-700 px-2.5 py-0.5 rounded-full text-xs">{pjs.length} Orang</span>
                    </div>
                    <div className="p-4 space-y-3">
                        {pjs.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Belum ada PJ Kesehatan terpilih.</p> :
                            pjs.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-rose-100 bg-rose-50/30">
                                    <span className="font-semibold text-slate-700">{m.nama}</span>
                                    <Button variant="outline" size="sm" onClick={() => togglePjRole(m.id, m.is_pj_kesehatan)}>Cabut Akses</Button>
                                </div>
                            ))}
                    </div>
                </div>

                {/* List Non PJ */}
                <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-sm">
                    <div className="bg-slate-50 px-5 py-4 border-b border-slate-200 font-bold text-slate-800 flex justify-between items-center">
                        Musyrif Ekstra (Bukan PJ)
                    </div>
                    <div className="p-4 space-y-3 h-[400px] overflow-y-auto custom-scrollbar">
                        {nonPjs.length === 0 ? <p className="text-sm text-slate-400 text-center py-4">Semua musyrif telah menjadi PJ.</p> :
                            nonPjs.map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl border border-slate-100 bg-white shadow-sm hover:border-rose-200 transition-colors">
                                    <span className="text-slate-600 font-medium">{m.nama}</span>
                                    <button onClick={() => togglePjRole(m.id, m.is_pj_kesehatan)} className="text-sm font-bold text-rose-600 hover:bg-rose-50 px-3 py-1.5 rounded-lg transition-colors">
                                        + Jadikan PJ
                                    </button>
                                </div>
                            ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
