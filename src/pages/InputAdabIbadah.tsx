import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { getLocalDateString } from '../lib/dateUtils';
import { Button } from '../components/ui/Button';
import { ToastContainer } from '../components/ui/Toast';
import { FullPageSpinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useToast } from '../hooks/useToast';
import { CheckSquare } from 'lucide-react';
import { PageHeader } from '../components/layout/PageHeader';

const selectCls = `w-full h-10 px-3 rounded-xl border border-slate-200 bg-slate-50 text-sm
  focus:outline-none focus:ring-2 focus:ring-primary/20 focus:bg-white transition-all`;

export default function InputAdabIbadah({ musyrifContextId }: { musyrifContextId?: string }) {
    const today = getLocalDateString();
    const [tanggal, setTanggal] = useState(today);
    const [musyrif, setMusyrif] = useState(musyrifContextId || '');
    const [kamar, setKamar] = useState('');
    const [santriId, setSantriId] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

    const [santriList, setSantriList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [categories, setCategories] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [checks, setChecks] = useState<Record<string, boolean>>({});

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    const { toasts, showToast, removeToast } = useToast();

    useEffect(() => { fetchMetadata(); }, []);
    useEffect(() => {
        if (santriId && tanggal) loadExistingRecords();
        else setChecks({});
    }, [santriId, tanggal]);

    const fetchMetadata = async () => {
        setLoading(true);
        const [catRes, actRes, santriRes, musRes, kamRes] = await Promise.all([
            supabase.from('kategori_kegiatan').select('*').order('created_at'),
            supabase.from('kegiatan').select('*').order('created_at'),
            supabase.from('santri').select('id, nama, kelas_id, kamar_id, kelas_list(nama_kelas), kamars(id, nama_kamar, musyrif_id, musyrifs(id, nama))').order('nama'),
            supabase.from('musyrifs').select('*').order('nama'),
            supabase.from('kamars').select('*').order('nama_kamar'),
        ]);
        if (catRes.data) { setCategories(catRes.data); if (catRes.data[0]) setActiveCategoryId(catRes.data[0].id); }
        if (actRes.data) setActivities(actRes.data);
        if (santriRes.data) setSantriList(santriRes.data);
        if (musRes.data) setMusyrifList(musRes.data);
        if (kamRes.data) setKamarList(kamRes.data);
        setLoading(false);
    };

    const loadExistingRecords = async () => {
        const { data, error } = await supabase.from('kegiatan_records')
            .select('kegiatan_id, is_done').eq('santri_id', santriId).eq('tanggal', tanggal);
        if (!error && data) {
            const newChecks: Record<string, boolean> = {};
            data.forEach(r => { newChecks[r.kegiatan_id] = r.is_done; });
            setChecks(newChecks);
        } else setChecks({});
    };

    const toggleCheck = (id: string) => setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    const selectAllCat = (catId: string) => {
        const next = { ...checks };
        activities.filter(a => a.kategori_id === catId).forEach(a => { next[a.id] = true; });
        setChecks(next);
    };

    const handleSave = async () => {
        if (!santriId) return showToast('Pilih santri terlebih dahulu', 'error');
        setSaving(true);
        try {
            await supabase.from('kegiatan_records').delete().eq('santri_id', santriId).eq('tanggal', tanggal);
            const inserts = activities.map(a => ({ santri_id: santriId, tanggal, kegiatan_id: a.id, is_done: !!checks[a.id] }));
            if (inserts.length) { const { error } = await supabase.from('kegiatan_records').insert(inserts); if (error) throw error; }
            showToast('Data berhasil disimpan', 'success');
        } catch (err: any) { showToast('Gagal menyimpan: ' + err.message, 'error'); }
        finally { setSaving(false); }
    };

    const filteredSantri = useMemo(() =>
        santriList.filter(s => {
            const matchKamar = !kamar || s.kamar_id === kamar;
            const matchMusyrif = !musyrif || s.kamars?.musyrif_id === musyrif;
            return matchKamar && matchMusyrif;
        }), [santriList, kamar, musyrif]
    );

    const filteredKamars = useMemo(() =>
        kamarList.filter(k => !musyrif || k.musyrif_id === musyrif),
        [kamarList, musyrif]
    );

    if (loading) return <FullPageSpinner label="Memuat form..." />;

    return (
        <div>
            {!musyrifContextId && <PageHeader title="Input Rekaman Kegiatan" subtitle="Catat kegiatan harian santri." />}

            {/* Filters */}
            <div className="bg-white rounded-2xl border border-slate-200 p-4 mb-5 grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    {
                        label: 'Tanggal',
                        node: <input type="date" value={tanggal} onChange={e => setTanggal(e.target.value)} className={selectCls} />
                    },
                    !musyrifContextId ? {
                        label: 'Musyrif',
                        node: (
                            <select value={musyrif} onChange={e => { setMusyrif(e.target.value); setKamar(''); setSantriId(''); }} className={selectCls}>
                                <option value="">Semua Musyrif</option>
                                {musyrifList.map(m => <option key={m.id} value={m.id}>{m.nama}</option>)}
                            </select>
                        )
                    } : null,
                    {
                        label: 'Kamar',
                        node: (
                            <select value={kamar} onChange={e => { setKamar(e.target.value); setSantriId(''); }} className={selectCls}>
                                <option value="">Semua Kamar</option>
                                {filteredKamars.map(k => <option key={k.id} value={k.id}>{k.nama_kamar}</option>)}
                            </select>
                        )
                    },
                    {
                        label: 'Santri',
                        node: (
                            <select value={santriId} onChange={e => setSantriId(e.target.value)} className={selectCls}>
                                <option value="">Pilih santri...</option>
                                {filteredSantri.map(s => <option key={s.id} value={s.id}>{s.nama} ({s.kelas_list?.nama_kelas || '-'})</option>)}
                            </select>
                        )
                    },
                ].filter(Boolean).map((item: any) => (
                    <div key={item.label}>
                        <label className="block text-xs font-semibold text-slate-500 mb-1.5 uppercase tracking-wide">{item.label}</label>
                        {item.node}
                    </div>
                ))}
            </div>

            {!santriId ? (
                <EmptyState message="Pilih santri untuk mulai mencatat kegiatan." />
            ) : (
                <>
                    {/* Category selector */}
                    {categories.length > 0 && (
                        <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 mb-5 flex flex-col sm:flex-row items-start sm:items-center gap-3">
                            <div className="flex-1 min-w-0">
                                <label className="block text-xs font-bold text-amber-700 uppercase tracking-wide mb-1.5">Filter Kategori</label>
                                <select value={activeCategoryId} onChange={e => setActiveCategoryId(e.target.value)}
                                    className="w-full h-10 px-3 rounded-xl border border-amber-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-amber-300 transition-all">
                                    <option value="all">Tampilkan Semua Kategori</option>
                                    {categories.map(c => <option key={c.id} value={c.id}>{c.nama_kategori}</option>)}
                                </select>
                            </div>
                            <p className="text-sm text-amber-600 shrink-0">Menampilkan kegiatan santri terpilih</p>
                        </div>
                    )}

                    {/* Checkbox panels */}
                    <div className={`grid gap-4 mb-5 ${activeCategoryId !== 'all' ? 'grid-cols-1' : 'grid-cols-1 md:grid-cols-2'}`}>
                        {categories.filter(c => activeCategoryId === 'all' || c.id === activeCategoryId).map(cat => {
                            const catActs = activities.filter(a => a.kategori_id === cat.id);
                            if (!catActs.length) return null;
                            const checkedCount = catActs.filter(a => checks[a.id]).length;
                            return (
                                <div key={cat.id} className="bg-white rounded-2xl border border-slate-200 overflow-hidden">
                                    <div className="flex items-center justify-between px-5 py-3.5 bg-slate-50 border-b border-slate-200">
                                        <div className="flex items-center gap-2">
                                            <h3 className="font-bold text-slate-800 text-sm">{cat.nama_kategori}</h3>
                                            <span className="text-xs bg-primary/10 text-primary px-2 py-0.5 rounded-full font-semibold">
                                                {checkedCount}/{catActs.length}
                                            </span>
                                        </div>
                                        <button onClick={() => selectAllCat(cat.id)}
                                            className="text-xs font-semibold text-primary hover:text-primary-hover flex items-center gap-1 transition-colors">
                                            <CheckSquare size={14} /> Pilih Semua
                                        </button>
                                    </div>
                                    <div className="p-3 grid gap-1">
                                        {catActs.map(item => (
                                            <label key={item.id}
                                                className={`flex items-center gap-3 px-3 py-2.5 rounded-xl cursor-pointer transition-colors ${checks[item.id] ? 'bg-primary/5 border border-primary/20' : 'hover:bg-slate-50 border border-transparent'
                                                    }`}
                                            >
                                                <input type="checkbox" checked={!!checks[item.id]} onChange={() => toggleCheck(item.id)}
                                                    className="w-4 h-4 rounded accent-primary shrink-0" />
                                                <span className={`text-sm ${checks[item.id] ? 'text-primary font-medium' : 'text-slate-700'}`}>
                                                    {item.nama_kegiatan}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                    </div>

                    <Button onClick={handleSave} loading={saving} size="lg" fullWidth>
                        Simpan Data Hari Ini
                    </Button>
                </>
            )}

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
