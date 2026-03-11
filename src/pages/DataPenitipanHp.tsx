import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import {
    Search, Plus, Edit2, Trash2, Smartphone, ShieldAlert,
    CheckCircle2, XCircle, UserCheck, Calendar,
    Camera, Eye, Settings, RefreshCw, Image as ImageIcon,
    History
} from 'lucide-react';
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

    // HP Proof States
    const [isSettingsOpen, setIsSettingsOpen] = useState(false);
    const [hpSettings, setHpSettings] = useState({ auto_delete: false, interval_months: 1 });
    const [viewPhoto, setViewPhoto] = useState<string | null>(null);
    const [isCapturing, setIsCapturing] = useState(false);
    const [videoRef, setVideoRef] = useState<HTMLVideoElement | null>(null);
    const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null);
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [isCleaning, setIsCleaning] = useState(false);
    const [isShutterActive, setIsShutterActive] = useState(false);

    const [formTitip, setFormTitip] = useState({
        santri_id: '',
        tanggal_titip: getLocalDateString(),
        penerima: '',
        penanggung_jawab: '',
        merek_hp: '',
        tipe_hp: '',
        warna: '',
        nomor_hp: '',
        keterangan: '',
        status: 'Dititipkan',
        bukti_foto: ''
    });

    const [formSita, setFormSita] = useState({
        santri_id: '',
        tanggal_sita: getLocalDateString(),
        tanggal_kembali: '',
        alasan: '',
        penyita: '',
        pemegang: '',
        status_ortu: 'Belum Dikabari',
        merek_hp: '',
        tipe_hp: '',
        warna: '',
        keterangan: '',
        status: 'Disita',
        bukti_foto: ''
    });

    const { toasts, removeToast, showToast } = useToast();

    useEffect(() => {
        const loadPageData = async () => {
            await fetchSettings();
            await fetchData();
        };
        loadPageData();
    }, [musyrifId]);

    const fetchSettings = async () => {
        try {
            const { data } = await supabase.from('hp_settings').select('*').maybeSingle();
            if (data) {
                setHpSettings(data);
                if (data.auto_delete) {
                    cleanupOldPhotos(data);
                }
            } else {
                // Default settings if table doesn't exist or empty
                const defaults = { auto_delete: false, interval_months: 1 };
                setHpSettings(defaults);
            }
        } catch (e) {
            console.error('Settings error:', e);
        }
    };

    const updateSettings = async (newSettings: any) => {
        try {
            const { error } = await supabase.from('hp_settings').upsert({ id: 1, ...newSettings });
            if (error) throw error;
            setHpSettings(newSettings);
            showToast('Pengaturan disimpan', 'success');
            setIsSettingsOpen(false);
        } catch (err: any) {
            showToast(err.message, 'error');
        }
    };

    const cleanupOldPhotos = async (settings: any) => {
        if (!settings.auto_delete) return;
        setIsCleaning(true);
        try {
            const cutoff = new Date();
            cutoff.setMonth(cutoff.getMonth() - settings.interval_months);
            const cutoffStr = cutoff.toISOString();

            const { data: oldTitip } = await supabase.from('penitipan_hp').select('id, bukti_foto').lt('created_at', cutoffStr).not('bukti_foto', 'is', null);
            const { data: oldSita } = await supabase.from('penyitaan_hp').select('id, bukti_foto').lt('created_at', cutoffStr).not('bukti_foto', 'is', null);

            const allOld = [...(oldTitip || []), ...(oldSita || [])].filter(r => r.bukti_foto);

            for (const record of allOld) {
                const filePath = record.bukti_foto.split('/').pop();
                if (filePath) {
                    await supabase.storage.from('hp-proofs').remove([filePath]);
                }
                const table = oldTitip?.find(t => t.id === record.id) ? 'penitipan_hp' : 'penyitaan_hp';
                await supabase.from(table).update({ bukti_foto: null }).eq('id', record.id);
            }
            if (allOld.length > 0) showToast(`${allOld.length} foto lama dihapus otomatis`, 'success');
        } catch (e) {
            console.error('Cleanup failed:', e);
        } finally {
            setIsCleaning(false);
        }
    };

    const startCamera = () => {
        setIsCapturing(true);
    };

    useEffect(() => {
        let stream: MediaStream | null = null;
        const initCamera = async () => {
            if (isCapturing && videoRef) {
                try {
                    stream = await navigator.mediaDevices.getUserMedia({
                        video: {
                            facingMode: 'environment',
                            width: { ideal: 1920 },
                            height: { ideal: 1080 }
                        }
                    });
                    videoRef.srcObject = stream;
                    await videoRef.play();
                } catch (err) {
                    console.error('Camera error:', err);
                    showToast('Gagal mengakses kamera. Pastikan izin diberikan.', 'error');
                    setIsCapturing(false);
                }
            }
        };
        initCamera();

        return () => {
            if (stream) {
                stream.getTracks().forEach(track => track.stop());
            }
        };
    }, [isCapturing, videoRef]);

    const stopCamera = () => {
        setIsCapturing(false);
    };

    const takePhoto = () => {
        if (!videoRef) return;

        // Shutter flash effect
        setIsShutterActive(true);
        setTimeout(() => setIsShutterActive(false), 150);

        const canvas = document.createElement('canvas');
        canvas.width = videoRef.videoWidth;
        canvas.height = videoRef.videoHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
            ctx.drawImage(videoRef, 0, 0);

            ctx.fillStyle = 'rgba(255, 255, 255, 0.9)';
            ctx.font = 'bold 24px sans-serif';
            const timestamp = new Date().toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' });
            const text = `BUKTI HP - ${timestamp}`;
            const padding = 20;
            const textWidth = ctx.measureText(text).width;

            // Draw text background shadow
            ctx.fillStyle = 'rgba(0,0,0,0.5)';
            ctx.fillRect(padding - 5, canvas.height - padding - 30, textWidth + 10, 35);

            ctx.fillStyle = '#fff';
            ctx.fillText(text, padding, canvas.height - padding - 5);

            canvas.toBlob((blob) => {
                if (blob) {
                    setCapturedBlob(blob);
                    setPreviewUrl(URL.createObjectURL(blob));
                    stopCamera();
                }
            }, 'image/jpeg', 0.8);
        }
    };

    const uploadPhoto = async (type: 'titip' | 'sita') => {
        if (!capturedBlob) return null;
        const fileName = `${type}_${Date.now()}.jpg`;
        const { data, error } = await supabase.storage.from('hp-proofs').upload(fileName, capturedBlob);
        if (error) throw error;
        const { data: { publicUrl } } = supabase.storage.from('hp-proofs').getPublicUrl(data.path);
        return publicUrl;
    };

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
                tanggal_titip: getLocalDateString(),
                penerima: '',
                penanggung_jawab: '',
                merek_hp: '',
                tipe_hp: '',
                warna: '',
                nomor_hp: '',
                keterangan: '',
                status: 'Dititipkan',
                bukti_foto: ''
            });
        }
        setIsModalTitipOpen(true);
        setCapturedBlob(null);
        setPreviewUrl(record?.bukti_foto || null);
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
                tanggal_sita: getLocalDateString(),
                tanggal_kembali: '',
                alasan: '',
                penyita: '',
                pemegang: '',
                status_ortu: 'Belum Dikabari',
                merek_hp: '',
                tipe_hp: '',
                warna: '',
                keterangan: '',
                status: 'Disita',
                bukti_foto: ''
            });
        }
        setIsModalSitaOpen(true);
        setCapturedBlob(null);
        setPreviewUrl(record?.bukti_foto || null);
    };

    const submitTitip = async (e: React.FormEvent) => {
        e.preventDefault();
        setIsSubmitting(true);
        try {
            const { santri, ...payload } = formTitip as any;

            if (capturedBlob) {
                const photoUrl = await uploadPhoto('titip');
                payload.bukti_foto = photoUrl;
            }

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
            setCapturedBlob(null);
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

            if (capturedBlob) {
                const photoUrl = await uploadPhoto('sita');
                payload.bukti_foto = photoUrl;
            }

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
            setCapturedBlob(null);
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

            // Delete associated photo from storage
            const { data } = await supabase.from(table).select('bukti_foto').eq('id', confirmDelete.id).single();
            if (data?.bukti_foto) {
                const filePath = data.bukti_foto.split('/').pop();
                if (filePath) {
                    await supabase.storage.from('hp-proofs').remove([filePath]);
                }
            }

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
                    <button
                        onClick={() => setIsSettingsOpen(true)}
                        className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-all text-sm font-bold"
                    >
                        <Settings size={18} className={isCleaning ? 'animate-spin text-primary' : ''} />
                        Auto-Cleanup
                    </button>
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
                                                                <button onClick={() => setViewPhoto(r.bukti_foto)} disabled={!r.bukti_foto} className={`p-2 rounded-lg transition-colors ${r.bukti_foto ? 'text-primary hover:bg-primary/5' : 'text-slate-200 cursor-not-allowed'}`} title="Lihat Bukti Foto"><Eye size={16} /></button>
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
                                                            <div className="font-bold italic text-slate-800">"{r.alasan}"</div>
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
                                                                <button onClick={() => setViewPhoto(r.bukti_foto)} disabled={!r.bukti_foto} className={`p-2 rounded-lg transition-colors ${r.bukti_foto ? 'text-primary hover:bg-primary/5' : 'text-slate-200 cursor-not-allowed'}`} title="Lihat Bukti Foto"><Eye size={16} /></button>
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

                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2"><Camera size={14} /> Bukti Foto (Wajib Foto Langsung)</label>
                                    {isCapturing ? (
                                        <div className="relative rounded-[32px] overflow-hidden bg-black aspect-square md:aspect-video border-4 border-primary shadow-2xl group">
                                            <video
                                                ref={setVideoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Grid Overlay */}
                                            <div className="absolute inset-0 pointer-events-none flex">
                                                <div className="w-1/3 border-r border-white/10 h-full"></div>
                                                <div className="w-1/3 border-r border-white/10 h-full"></div>
                                            </div>
                                            <div className="absolute inset-0 pointer-events-none flex flex-col">
                                                <div className="h-1/3 border-b border-white/10 w-full"></div>
                                                <div className="h-1/3 border-b border-white/10 w-full"></div>
                                            </div>

                                            {/* Shutter Flash */}
                                            {isShutterActive && <div className="absolute inset-0 bg-white z-20 animate-fade-out" />}

                                            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-around px-10">
                                                <button type="button" onClick={stopCamera} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all border border-white/20 font-bold text-xl">&times;</button>

                                                <button
                                                    type="button"
                                                    onClick={takePhoto}
                                                    className="w-20 h-20 rounded-full bg-white p-1 shadow-2xl active:scale-90 transition-all border-none outline-none"
                                                >
                                                    <div className="w-full h-full rounded-full border-4 border-black/5 flex items-center justify-center">
                                                        <div className="w-14 h-14 rounded-full border-2 border-black/10" />
                                                    </div>
                                                </button>

                                                <div className="w-12 h-12" />
                                            </div>

                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-black/50 backdrop-blur-md rounded-full border border-white/20 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Live Camera</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-slate-200 rounded-[32px] bg-slate-50/50 gap-5 transition-all hover:bg-slate-50 hover:border-primary/30">
                                            {previewUrl ? (
                                                <div className="relative group">
                                                    <img src={previewUrl} alt="Preview" className="w-full max-w-sm rounded-2xl shadow-2xl border-4 border-white" />
                                                    <button type="button" onClick={() => { setPreviewUrl(null); setCapturedBlob(null); setFormTitip({ ...formTitip, bukti_foto: '' }) }} className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 font-bold text-xl">&times;</button>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-3">
                                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-slate-300 mx-auto"><ImageIcon size={40} /></div>
                                                    <div>
                                                        <p className="text-sm text-slate-500 font-bold">Belum ada foto bukti</p>
                                                        <p className="text-[10px] text-slate-400">Ambil foto untuk transparansi penitipan</p>
                                                    </div>
                                                </div>
                                            )}
                                            <Button type="button" icon={<Camera size={18} />} onClick={startCamera} className="rounded-2xl shadow-lg shadow-primary/20">Ambil Foto Bukti</Button>
                                        </div>
                                    )}
                                </div>
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

                                <div className="md:col-span-2 space-y-3">
                                    <label className="text-[11px] font-black text-red-400 uppercase tracking-widest flex items-center gap-2"><Camera size={14} /> Bukti Penyitaan</label>
                                    {isCapturing ? (
                                        <div className="relative rounded-[32px] overflow-hidden bg-black aspect-square md:aspect-video border-4 border-red-500 shadow-2xl group">
                                            <video
                                                ref={setVideoRef}
                                                autoPlay
                                                playsInline
                                                muted
                                                className="w-full h-full object-cover"
                                            />

                                            {/* Grid Overlay */}
                                            <div className="absolute inset-0 pointer-events-none flex text-white/5">
                                                <div className="w-1/3 border-r border-current h-full"></div>
                                                <div className="w-1/3 border-r border-current h-full"></div>
                                            </div>
                                            <div className="absolute inset-0 pointer-events-none flex flex-col text-white/5">
                                                <div className="h-1/3 border-b border-current w-full"></div>
                                                <div className="h-1/3 border-b border-current w-full"></div>
                                            </div>

                                            {/* Shutter Flash */}
                                            {isShutterActive && <div className="absolute inset-0 bg-white z-20 animate-fade-out" />}

                                            <div className="absolute bottom-6 left-0 right-0 flex items-center justify-around px-10">
                                                <button type="button" onClick={stopCamera} className="w-12 h-12 rounded-full bg-black/40 backdrop-blur-md flex items-center justify-center text-white hover:bg-black/60 transition-all border border-white/20 font-bold text-xl">&times;</button>

                                                <button
                                                    type="button"
                                                    onClick={takePhoto}
                                                    className="w-20 h-20 rounded-full bg-white p-1 shadow-2xl active:scale-90 transition-all border-none outline-none"
                                                >
                                                    <div className="w-full h-full rounded-full border-4 border-red-500/10 flex items-center justify-center">
                                                        <div className="w-14 h-14 rounded-full border-2 border-red-500/20" />
                                                    </div>
                                                </button>

                                                <div className="w-12 h-12" />
                                            </div>

                                            <div className="absolute top-4 left-1/2 -translate-x-1/2 px-4 py-1.5 bg-red-600/90 backdrop-blur-md rounded-full border border-red-400 flex items-center gap-2">
                                                <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                                                <span className="text-[10px] font-black text-white uppercase tracking-widest">Sita Evidence Mode</span>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="flex flex-col items-center justify-center p-10 border-2 border-dashed border-red-100 rounded-[32px] bg-red-50/30 gap-5">
                                            {previewUrl ? (
                                                <div className="relative group">
                                                    <img src={previewUrl} alt="Preview" className="w-full max-w-sm rounded-2xl shadow-2xl border-4 border-white" />
                                                    <button type="button" onClick={() => { setPreviewUrl(null); setCapturedBlob(null); setFormSita({ ...formSita, bukti_foto: '' }) }} className="absolute -top-3 -right-3 w-10 h-10 bg-red-500 text-white rounded-full flex items-center justify-center shadow-xl opacity-0 group-hover:opacity-100 transition-all hover:scale-110 font-bold text-xl">&times;</button>
                                                </div>
                                            ) : (
                                                <div className="text-center space-y-3">
                                                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center text-red-200 mx-auto"><ImageIcon size={40} /></div>
                                                    <div className="text-red-900/40 font-bold text-sm">Belum ada foto bukti penyitaan</div>
                                                </div>
                                            )}
                                            <Button type="button" icon={<Camera size={18} />} onClick={startCamera} className="bg-red-600 hover:bg-red-700 rounded-2xl shadow-lg shadow-red-200">Foto Barang Bukti</Button>
                                        </div>
                                    )}
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

            {/* View Photo Modal */}
            {viewPhoto && (
                <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-md z-[60] flex items-center justify-center p-4 animate-fade-in" onClick={() => setViewPhoto(null)}>
                    <div className="bg-white rounded-[40px] p-3 shadow-2xl max-w-2xl w-full animate-scale-in relative overflow-hidden" onClick={e => e.stopPropagation()}>
                        <div className="absolute top-6 right-6 z-10">
                            <button onClick={() => setViewPhoto(null)} className="w-12 h-12 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-md hover:bg-black/70 transition-all font-bold text-2xl shadow-xl">&times;</button>
                        </div>
                        <img src={viewPhoto} alt="Bukti Foto" className="w-full h-auto rounded-[32px] max-h-[80vh] object-contain shadow-inner" />
                        <div className="p-6 text-center border-t border-slate-50">
                            <p className="text-slate-400 text-xs font-black uppercase tracking-widest flex items-center justify-center gap-2">
                                <ImageIcon size={14} /> Bukti Serah Terima Perangkat
                            </p>
                        </div>
                    </div>
                </div>
            )}

            {/* Settings Modal */}
            {isSettingsOpen && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-[32px] shadow-2xl w-full max-w-md animate-scale-in border border-slate-200">
                        <div className="px-8 py-6 border-b border-slate-100 flex items-center justify-between">
                            <h3 className="font-black text-slate-800 text-xl flex items-center gap-3">
                                <Settings className="text-primary" /> Pengaturan Data
                            </h3>
                            <button onClick={() => setIsSettingsOpen(false)} className="text-slate-400 hover:text-slate-600 text-2xl font-bold">&times;</button>
                        </div>
                        <div className="p-8 space-y-6">
                            <div className="space-y-4">
                                <div className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                                    <div className="space-y-0.5">
                                        <div className="font-black text-slate-800 text-sm">Auto-Cleanup Foto</div>
                                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Hapus bukti foto lama otomatis</div>
                                    </div>
                                    <button
                                        onClick={() => setHpSettings({ ...hpSettings, auto_delete: !hpSettings.auto_delete })}
                                        className={`w-14 h-8 rounded-full transition-all relative ${hpSettings.auto_delete ? 'bg-primary shadow-lg shadow-primary/30' : 'bg-slate-200'}`}
                                    >
                                        <div className={`absolute top-1 w-6 h-6 rounded-full bg-white transition-all shadow-sm ${hpSettings.auto_delete ? 'left-7' : 'left-1'}`} />
                                    </button>
                                </div>

                                {hpSettings.auto_delete && (
                                    <div className="space-y-3 animate-fade-in">
                                        <label className="text-[11px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                                            <History size={14} /> Interval Penghapusan
                                        </label>
                                        <div className="grid grid-cols-2 gap-3">
                                            {[1, 2, 3, 6].map(m => (
                                                <button
                                                    key={m}
                                                    onClick={() => setHpSettings({ ...hpSettings, interval_months: m })}
                                                    className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${hpSettings.interval_months === m ? 'border-primary bg-primary/5 text-primary' : 'border-slate-100 text-slate-400 hover:border-slate-200 dark:hover:bg-slate-50'}`}
                                                >
                                                    {m} Bulan
                                                </button>
                                            ))}
                                        </div>
                                        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-xl text-amber-600 border border-amber-100">
                                            <ShieldAlert size={16} className="shrink-0 mt-0.5" />
                                            <p className="text-[10px] font-bold leading-relaxed">PENTING: Foto yang berusia lebih dari interval yang dipilih akan dihapus permanen untuk menghemat penyimpanan database.</p>
                                        </div>
                                    </div>
                                )}
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <Button onClick={() => updateSettings(hpSettings)} className="w-full py-4 text-sm uppercase tracking-widest font-black rounded-2xl shadow-xl shadow-primary/20">Simpan Perubahan</Button>
                                <button onClick={() => setIsSettingsOpen(false)} className="text-[11px] font-black text-slate-400 uppercase tracking-widest hover:text-slate-600 transition-colors">Tetap Pakai Yang Lama</button>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {isCleaning && (
                <div className="fixed bottom-8 right-8 bg-slate-900 border border-slate-700 text-white px-6 py-4 rounded-3xl shadow-2xl z-[100] animate-bounce-in flex items-center gap-4">
                    <RefreshCw className="animate-spin text-primary" size={20} />
                    <div>
                        <div className="text-sm font-black">Membersihkan Penyimpanan...</div>
                        <div className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">Optimasi storage sedang berjalan</div>
                    </div>
                </div>
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
