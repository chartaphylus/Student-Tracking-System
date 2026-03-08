import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { Search, Plus, Edit2, Trash2, Smartphone, ShieldAlert, CheckCircle2, XCircle, UserCheck, Calendar } from 'lucide-react';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { ConfirmModal } from '../components/ui/ConfirmModal';

export default function DataHP({ musyrifId }: { musyrifId?: string }) {
    const [activeTab, setActiveTab] = useState<'penitipan' | 'penyitaan'>('penitipan');
    const [recordsTitip, setRecordsTitip] = useState<any[]>([]);
    const [recordsSita, setRecordsSita] = useState<any[]>([]);
    const [santriList, setSantriList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');
    const [searchSantri, setSearchSantri] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, type: 'titip' | 'sita' } | null>(null);

    // Modal States
    const [isModalTitipOpen, setIsModalTitipOpen] = useState(false);
    const [isModalSitaOpen, setIsModalSitaOpen] = useState(false);
    const [editTitipId, setEditTitipId] = useState<string | null>(null);
    const [editSitaId, setEditSitaId] = useState<string | null>(null);

    const [formTitip, setFormTitip] = useState({
        santri_id: '',
        tanggal_titip: new Date().toISOString().split('T')[0],
        penerima: '',
        penanggung_jawab: '',
        merek_hp: '',
        tipe_hp: '',
        warna: '',
        nomor_hp: '',
        keterangan: '',
        status: 'Dititipkan'
    });

    const [formSita, setFormSita] = useState({
        santri_id: '',
        tanggal_sita: new Date().toISOString().split('T')[0],
        tanggal_kembali: '',
        alasan: '',
        penyita: '',
        pemegang: '',
        status_ortu: 'Belum Dikabari',
        merek_hp: '',
        tipe_hp: '',
        warna: '',
        keterangan: '',
        status: 'Disita'
    });

    const { toasts, removeToast, showToast } = useToast();

    useEffect(() => {
        fetchData();
    }, [musyrifId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Fetch Santri
            let sQuery = supabase.from('santri').select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(nama))');
            if (musyrifId) {
                const { data: rooms } = await supabase.from('kamars').select('id').eq('musyrif_id', musyrifId);
                const roomIds = (rooms || []).map(r => r.id);
                sQuery = sQuery.in('kamar_id', roomIds);
            }
            const { data: santris } = await sQuery.order('nama');
            setSantriList(santris || []);

            // Fetch Data
            const [pRes, pyRes] = await Promise.all([
                supabase.from('penitipan_hp').select('*, santri(nama, kelas_list(nama_kelas), kamars(nama_kamar, musyrifs(nama)))').order('created_at', { ascending: false }),
                supabase.from('penyitaan_hp').select('*, santri(nama, kelas_list(nama_kelas), kamars(nama_kamar, musyrifs(nama)))').order('created_at', { ascending: false })
            ]);

            let tData = pRes.data || [];
            let sData = pyRes.data || [];

            if (musyrifId && santris && santris.length > 0) {
                const sIds = santris.map(s => s.id);
                tData = tData.filter(d => sIds.includes(d.santri_id));
                sData = sData.filter(d => sIds.includes(d.santri_id));
            } else if (musyrifId) {
                tData = [];
                sData = [];
            }

            setRecordsTitip(tData);
            setRecordsSita(sData);

        } catch (error: any) {
            console.error('Error fetching data:', error);
            showToast('Gagal memuat data', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleOpenTitip = (record?: any) => {
        setSearchSantri('');
        if (record) {
            setEditTitipId(record.id);
            setFormTitip({ ...record });
        } else {
            setEditTitipId(null);
            setFormTitip({
                santri_id: '',
                tanggal_titip: new Date().toISOString().split('T')[0],
                penerima: '',
                penanggung_jawab: '',
                merek_hp: '',
                tipe_hp: '',
                warna: '',
                nomor_hp: '',
                keterangan: '',
                status: 'Dititipkan'
            });
        }
        setIsModalTitipOpen(true);
    };

    const handleOpenSita = (record?: any) => {
        setSearchSantri('');
        if (record) {
            setEditSitaId(record.id);
            setFormSita({ ...record });
        } else {
            setEditSitaId(null);
            setFormSita({
                santri_id: '',
                tanggal_sita: new Date().toISOString().split('T')[0],
                tanggal_kembali: '',
                alasan: '',
                penyita: '',
                pemegang: '',
                status_ortu: 'Belum Dikabari',
                merek_hp: '',
                tipe_hp: '',
                warna: '',
                keterangan: '',
                status: 'Disita'
            });
        }
        setIsModalSitaOpen(true);
    };

    const submitTitip = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { santri, ...payload } = formTitip as any;
            if (editTitipId) {
                const { error } = await supabase.from('penitipan_hp').update(payload).eq('id', editTitipId);
                if (error) throw error;
                showToast('Data penitipan diperbarui', 'success');
            } else {
                const { error } = await supabase.from('penitipan_hp').insert([payload]);
                if (error) throw error;
                showToast('Data penitipan ditambahkan', 'success');
            }
            setIsModalTitipOpen(false);
            fetchData();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const submitSita = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { santri, ...payload } = formSita as any;
            if (editSitaId) {
                const { error } = await supabase.from('penyitaan_hp').update(payload).eq('id', editSitaId);
                if (error) throw error;
                showToast('Data penyitaan diperbarui', 'success');
            } else {
                const { error } = await supabase.from('penyitaan_hp').insert([payload]);
                if (error) throw error;
                showToast('Data penyitaan ditambahkan', 'success');
            }
            setIsModalSitaOpen(false);
            fetchData();
        } catch (error: any) {
            showToast(error.message, 'error');
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        try {
            const table = confirmDelete.type === 'titip' ? 'penitipan_hp' : 'penyitaan_hp';
            const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
            if (error) throw error;
            showToast('Data dihapus', 'success');
            fetchData();
        } catch (error: any) {
            showToast(error.message, 'error');
        }
        setConfirmDelete(null);
    };

    const filteredTitip = useMemo(() => {
        return recordsTitip.filter(r => (r.santri?.nama?.toLowerCase() || '').includes(search.toLowerCase()));
    }, [recordsTitip, search]);

    const filteredSita = useMemo(() => {
        return recordsSita.filter(r => (r.santri?.nama?.toLowerCase() || '').includes(search.toLowerCase()));
    }, [recordsSita, search]);

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 p-6 md:p-8 shadow-card flex flex-col md:flex-row gap-6 md:items-center justify-between">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-slate-800 flex items-center gap-2">
                        <Smartphone className="text-primary" />
                        Inventaris & Manajemen HP
                    </h2>
                    <p className="text-slate-500 mt-1">Kelola data penitipan dan rekaman penyitaan perangkat santri.</p>
                </div>
                <div className="flex flex-col sm:flex-row gap-3">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                        <input
                            type="text"
                            placeholder="Cari nama santri..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="pl-10 pr-4 py-2.5 w-full sm:w-64 rounded-xl border border-slate-200 bg-slate-50 text-sm"
                        />
                    </div>
                </div>
            </div>

            {/* Navigation Tabs - Model Rekam Medis Style */}
            <div className="flex gap-4 border-b border-slate-200 overflow-x-auto pb-px">
                <button
                    onClick={() => setActiveTab('penitipan')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'penitipan' ? 'text-primary' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <Smartphone size={18} />
                        <span>Log Penitipan HP</span>
                        <span className="bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">{recordsTitip.length}</span>
                    </div>
                    {activeTab === 'penitipan' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-primary rounded-t-full shadow-[0_-2px_8px_rgba(79,70,229,0.3)]" />}
                </button>
                <button
                    onClick={() => setActiveTab('penyitaan')}
                    className={`pb-4 px-2 text-sm font-bold transition-all relative ${activeTab === 'penyitaan' ? 'text-red-600' : 'text-slate-400 hover:text-slate-600'
                        }`}
                >
                    <div className="flex items-center gap-2">
                        <ShieldAlert size={18} />
                        <span>Log Penyitaan HP</span>
                        <span className="bg-red-50 text-red-500 px-2 py-0.5 rounded-full text-[10px]">{recordsSita.length}</span>
                    </div>
                    {activeTab === 'penyitaan' && <div className="absolute bottom-0 left-0 right-0 h-1 bg-red-600 rounded-t-full shadow-[0_-2px_8px_rgba(220,38,38,0.3)]" />}
                </button>
            </div>

            {loading ? (
                <div className="py-12"><FullPageSpinner label="Memuat inventaris..." /></div>
            ) : (
                <div className="animate-fade-in">
                    {activeTab === 'penitipan' ? (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2 outline-none">
                                    <Smartphone className="text-blue-500" size={20} /> Data Penitipan
                                </h3>
                                <Button size="sm" icon={<Plus size={16} />} onClick={() => handleOpenTitip()}>Record Baru</Button>
                            </div>
                            {filteredTitip.length === 0 ? (
                                <EmptyState message="Tidak ada data penitipan HP ditemukan." />
                            ) : (
                                <div className="bg-white border border-slate-200 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-slate-50/80 border-b border-slate-200 text-[11px] uppercase tracking-wider font-bold text-slate-500">
                                                    <th className="px-5 py-4">Nama Santri</th>
                                                    <th className="px-5 py-4">Tgl Titip</th>
                                                    <th className="px-5 py-4">Merek & Warna</th>
                                                    <th className="px-5 py-4">Penerima & PJ</th>
                                                    <th className="px-5 py-4 text-center">Status</th>
                                                    <th className="px-5 py-4 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-slate-100">
                                                {filteredTitip.map(r => (
                                                    <tr key={r.id} className="hover:bg-slate-50/50 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-slate-800">{r.santri?.nama}</div>
                                                            <div className="text-[10px] text-slate-400 uppercase mt-0.5">{r.santri?.kelas_list?.nama_kelas} • {r.santri?.kamars?.nama_kamar}</div>
                                                        </td>
                                                        <td className="px-5 py-4 text-slate-600">{r.tanggal_titip}</td>
                                                        <td className="px-5 py-4">
                                                            <div className="font-medium text-slate-700">{r.merek_hp} {r.tipe_hp}</div>
                                                            <div className="text-[11px] text-slate-400 capitalize">{r.warna}</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="text-slate-600"><span className="text-slate-400 mr-1">Trm:</span>{r.penerima}</div>
                                                            <div className="text-slate-700 font-semibold"><span className="text-slate-400 font-normal mr-1">PJ:</span>{r.penanggung_jawab}</div>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <span className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase ${r.status === 'Dikembalikan' ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                                                                {r.status}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <button onClick={() => handleOpenTitip(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                                <button onClick={() => setConfirmDelete({ id: r.id, type: 'titip' })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-6">
                            <div className="flex justify-between items-center">
                                <h3 className="text-lg font-bold text-red-800 flex items-center gap-2">
                                    <ShieldAlert className="text-red-500" size={20} /> Data Penyitaan
                                </h3>
                                <Button variant="secondary" size="sm" icon={<Plus size={16} />} onClick={() => handleOpenSita()}>Catat Pelanggaran</Button>
                            </div>
                            {filteredSita.length === 0 ? (
                                <EmptyState message="Bersih! Tidak ada data penyitaan HP hari ini." />
                            ) : (
                                <div className="bg-white border border-red-100 rounded-3xl overflow-hidden shadow-sm">
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left text-sm">
                                            <thead>
                                                <tr className="bg-red-50/50 border-b border-red-100 text-[11px] uppercase tracking-wider font-bold text-red-600/70">
                                                    <th className="px-5 py-4">Info Santri</th>
                                                    <th className="px-5 py-4">Sita & Kembali</th>
                                                    <th className="px-5 py-4">Uraian Pelanggaran</th>
                                                    <th className="px-5 py-4">Petugas & Pemegang</th>
                                                    <th className="px-5 py-4">Status Ortu</th>
                                                    <th className="px-5 py-4 text-center">Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-red-200/30">
                                                {filteredSita.map(r => (
                                                    <tr key={r.id} className="hover:bg-red-50/30 transition-colors">
                                                        <td className="px-5 py-4">
                                                            <div className="font-bold text-slate-800">{r.santri?.nama}</div>
                                                            <div className="text-[10px] text-slate-400 uppercase mt-0.5">{r.santri?.kelas_list?.nama_kelas} • {r.santri?.kamars?.nama_kamar}</div>
                                                        </td>
                                                        <td className="px-5 py-4 font-medium">
                                                            <div className="text-red-600">S: {r.tanggal_sita}</div>
                                                            <div className="text-emerald-600 text-[10px] font-bold mt-1">K: {r.tanggal_kembali || '-'}</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="text-slate-800 font-bold italic">"{r.alasan}"</div>
                                                            <div className="text-[11px] text-slate-500 mt-1">{r.merek_hp} {r.tipe_hp} / {r.warna}</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <div className="text-slate-600 leading-tight">By: {r.penyita}</div>
                                                            <div className="text-slate-600 leading-tight mt-1 truncate max-w-[120px]">Hold: {r.pemegang}</div>
                                                        </td>
                                                        <td className="px-5 py-4">
                                                            <span className={`px-2 py-0.5 rounded text-[10px] font-black uppercase flex items-center gap-1 w-fit ${r.status_ortu === 'Sudah Dikabari' ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'}`}>
                                                                {r.status_ortu === 'Sudah Dikabari' ? <CheckCircle2 size={10} /> : <XCircle size={10} />}
                                                                {r.status_ortu}
                                                            </span>
                                                        </td>
                                                        <td className="px-5 py-4 text-center">
                                                            <div className="flex justify-center gap-1">
                                                                <button onClick={() => handleOpenSita(r)} className="p-2 text-blue-500 hover:bg-blue-50 rounded-lg"><Edit2 size={16} /></button>
                                                                <button onClick={() => setConfirmDelete({ id: r.id, type: 'sita' })} className="p-2 text-red-500 hover:bg-red-50 rounded-lg"><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                </div>
            )}

            {/* Modal Titip */}
            {isModalTitipOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl animate-scale-in border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-primary/10 rounded-xl flex items-center justify-center text-primary"><Smartphone size={22} /></div>
                                {editTitipId ? 'Edit Record Titipan' : 'Register Penitipan Baru'}
                            </h3>
                            <button onClick={() => setIsModalTitipOpen(false)} className="w-10 h-10 rounded-full hover:bg-slate-100 flex items-center justify-center text-slate-400 transition-all font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={submitTitip} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><UserCheck size={14} /> Identitas Santri</label>
                                    <div className="relative">
                                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
                                        <input type="text" placeholder="Ketik nama untuk mencari..." value={searchSantri} onChange={e => setSearchSantri(e.target.value)} className="w-full pl-12 h-12 rounded-2xl border border-slate-200 focus:ring-4 focus:ring-primary/10 transition-all outline-none" />
                                    </div>
                                    <select required value={formTitip.santri_id} onChange={e => setFormTitip({ ...formTitip, santri_id: e.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 bg-slate-50 px-4 font-bold text-sm outline-none">
                                        <option value="">-- Hasil Pencarian Santri --</option>
                                        {santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase())).map(s => (
                                            <option key={s.id} value={s.id}>{s.nama} ({s.kamars?.nama_kamar})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Calendar size={14} /> Tgl Penitipan</label>
                                    <input type="date" required value={formTitip.tanggal_titip} onChange={e => setFormTitip({ ...formTitip, tanggal_titip: e.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 outline-none focus:border-primary" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Status Barang</label>
                                    <select value={formTitip.status} onChange={e => setFormTitip({ ...formTitip, status: e.target.value })} className="w-full h-12 rounded-2xl border border-slate-200 px-4 font-black text-primary outline-none">
                                        <option value="Dititipkan">DITITIPKAN</option>
                                        <option value="Dikembalikan">DIKEMBALIKAN</option>
                                    </select>
                                </div>
                                <div className="md:col-span-2 grid grid-cols-1 sm:grid-cols-3 gap-4 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Merek</label>
                                        <input placeholder="Samsung" value={formTitip.merek_hp} onChange={e => setFormTitip({ ...formTitip, merek_hp: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white transition-all outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Tipe</label>
                                        <input placeholder="A52" value={formTitip.tipe_hp} onChange={e => setFormTitip({ ...formTitip, tipe_hp: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white transition-all outline-none" />
                                    </div>
                                    <div className="space-y-1.5">
                                        <label className="text-[10px] font-black text-slate-400 uppercase">Warna</label>
                                        <input placeholder="Hitam" value={formTitip.warna} onChange={e => setFormTitip({ ...formTitip, warna: e.target.value })} className="w-full h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white transition-all outline-none" />
                                    </div>
                                </div>
                                <input placeholder="Nomor HP (Pribadi)" value={formTitip.nomor_hp} onChange={e => setFormTitip({ ...formTitip, nomor_hp: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                                <input placeholder="Penerima Register" required value={formTitip.penerima} onChange={e => setFormTitip({ ...formTitip, penerima: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                                <input placeholder="Petugas Penanggung Jawab" required value={formTitip.penanggung_jawab} onChange={e => setFormTitip({ ...formTitip, penanggung_jawab: e.target.value })} className="md:col-span-2 h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                                <textarea placeholder="Keterangan kondisi fisik barang..." value={formTitip.keterangan} onChange={e => setFormTitip({ ...formTitip, keterangan: e.target.value })} className="md:col-span-2 p-5 rounded-3xl border border-slate-200 h-28 focus:border-primary outline-none text-sm transition-all" />
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalTitipOpen(false)} className="px-8 font-bold text-slate-400 hover:text-slate-600 transition-colors">Batal</button>
                                <Button type="submit" loading={isSubmitting} className="px-10 py-3 text-lg">Simpan Log Penitipan</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Sita - Red Theme */}
            {isModalSitaOpen && (
                <div className="fixed inset-0 bg-red-950/20 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-2xl animate-scale-in border border-red-100 box-shadow-red overflow-hidden">
                        <div className="px-8 py-6 border-b border-red-50 bg-red-50/50 flex items-center justify-between">
                            <h3 className="font-black text-red-800 text-xl flex items-center gap-3">
                                <div className="w-10 h-10 bg-red-600 rounded-xl flex items-center justify-center text-white"><ShieldAlert size={22} /></div>
                                {editSitaId ? 'Update Record Sita' : 'Catat Pelanggaran & Sita HP'}
                            </h3>
                            <button onClick={() => setIsModalSitaOpen(false)} className="w-10 h-10 rounded-full hover:bg-red-100 flex items-center justify-center text-red-400 transition-all font-bold text-xl">&times;</button>
                        </div>
                        <form onSubmit={submitSita} className="p-8 space-y-6 overflow-y-auto max-h-[70vh] custom-scrollbar">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Identifikasi Santri Pelanggar</label>
                                    <input type="text" placeholder="Cari Nama Santri..." value={searchSantri} onChange={e => setSearchSantri(e.target.value)} className="w-full h-12 px-5 rounded-2xl border border-red-100 focus:bg-red-50 transition-all outline-none" />
                                    <select required value={formSita.santri_id} onChange={e => setFormSita({ ...formSita, santri_id: e.target.value })} className="w-full h-12 rounded-2xl border border-red-200 bg-red-50/30 px-4 font-black text-sm text-red-900 outline-none">
                                        <option value="">-- Pilih Santri --</option>
                                        {santriList.filter(s => s.nama.toLowerCase().includes(searchSantri.toLowerCase())).map(s => (
                                            <option key={s.id} value={s.id}>{s.nama} ({s.kamars?.nama_kamar})</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Tgl Penyitaan</label>
                                    <input type="date" required value={formSita.tanggal_sita} onChange={e => setFormSita({ ...formSita, tanggal_sita: e.target.value })} className="w-full h-11 rounded-2xl border border-slate-200 px-4 outline-none" />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest">Prediksi Kembali</label>
                                    <input type="date" value={formSita.tanggal_kembali} onChange={e => setFormSita({ ...formSita, tanggal_kembali: e.target.value })} className="w-full h-11 rounded-2xl border border-slate-200 px-4 outline-none" />
                                </div>
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[11px] font-black uppercase tracking-widest text-red-600">Alasan / Jenis Pelanggaran</label>
                                    <input placeholder="Mis: Main game di jam malam, Bawa HP ke asrama tanpa izin..." required value={formSita.alasan} onChange={e => setFormSita({ ...formSita, alasan: e.target.value })} className="w-full h-12 rounded-2xl border-2 border-red-100 px-5 font-bold text-red-800 placeholder:text-red-200 outline-none focus:border-red-400 transition-all" />
                                </div>
                                <div className="md:col-span-2 grid grid-cols-2 gap-4 bg-slate-50 p-5 rounded-3xl border border-slate-200">
                                    <input placeholder="Merek HP" required value={formSita.merek_hp} onChange={e => setFormSita({ ...formSita, merek_hp: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white outline-none" />
                                    <input placeholder="Tipe HP" value={formSita.tipe_hp} onChange={e => setFormSita({ ...formSita, tipe_hp: e.target.value })} className="h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white outline-none" />
                                    <input placeholder="Warna" value={formSita.warna} onChange={e => setFormSita({ ...formSita, warna: e.target.value })} className="md:col-span-2 h-10 rounded-xl border border-slate-200 px-3 text-sm focus:bg-white outline-none" />
                                </div>
                                <input placeholder="Penyita (Ustadz/Musyrif)" required value={formSita.penyita} onChange={e => setFormSita({ ...formSita, penyita: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                                <input placeholder="Pemegang Barang" required value={formSita.pemegang} onChange={e => setFormSita({ ...formSita, pemegang: e.target.value })} className="h-12 rounded-2xl border border-slate-200 px-4 outline-none" />
                                <div className="md:col-span-2 grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase">Status Ortu</label>
                                        <div className="flex gap-2">
                                            {['Belum Dikabari', 'Sudah Dikabari'].map(opt => (
                                                <button key={opt} type="button" onClick={() => setFormSita({ ...formSita, status_ortu: opt })} className={`flex-1 py-2 rounded-xl text-[10px] font-black tracking-widest transition-all ${formSita.status_ortu === opt ? 'bg-red-600 text-white shadow-lg shadow-red-200' : 'bg-slate-100 text-slate-400'}`}>{opt}</button>
                                            ))}
                                        </div>
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[11px] font-black text-slate-400 uppercase">Status Barang</label>
                                        <select value={formSita.status} onChange={e => setFormSita({ ...formSita, status: e.target.value })} className="w-full h-10 rounded-xl border font-bold text-red-600">
                                            <option value="Disita">DISITA</option>
                                            <option value="Dikembalikan">KEMBALI</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className="flex justify-end gap-4 pt-4">
                                <button type="button" onClick={() => setIsModalSitaOpen(false)} className="px-8 font-black text-slate-400 uppercase tracking-widest text-[11px]">Batal</button>
                                <Button type="submit" loading={isSubmitting} className="bg-red-600 hover:bg-red-700 shadow-xl shadow-red-100 h-12 px-12">Simpan Laporan Sita</Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            <ConfirmModal open={!!confirmDelete} onClose={() => setConfirmDelete(null)} onConfirm={handleDelete} message="Hapus record inventaris ini secara permanen?" />
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
