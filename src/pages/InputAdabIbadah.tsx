import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Loader } from 'lucide-react';

const InputAdabIbadah = () => {
    const today = new Date().toISOString().split('T')[0];
    const [tanggal, setTanggal] = useState(today);
    const [kelas] = useState('Semua');
    const [musyrif, setMusyrif] = useState('Semua');
    const [kamar, setKamar] = useState('Semua');
    const [santriId, setSantriId] = useState('');
    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

    // Data list
    const [santriList, setSantriList] = useState<any[]>([]);
    // const [kelasList, setKelasList] = useState<any[]>([]); // Removed unused
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);

    // Dynamic Categories & Activities
    const [categories, setCategories] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Checks state mapping kegiatan_id -> boolean
    const [checks, setChecks] = useState<Record<string, boolean>>({});

    useEffect(() => {
        fetchMetadata();
    }, []);

    // When Santri or Tanggal changes, we load their existing records
    useEffect(() => {
        if (santriId && tanggal) {
            loadExistingRecords();
        } else {
            setChecks({});
        }
    }, [santriId, tanggal]);

    const fetchMetadata = async () => {
        setLoading(true);
        const [catRes, actRes, santriRes, musyrifRes, kamarRes] = await Promise.all([
            supabase.from('kategori_kegiatan').select('*').order('created_at', { ascending: true }),
            supabase.from('kegiatan').select('*').order('created_at', { ascending: true }),
            // Join with kelas_list and kamars (with musyrifs) to filter
            supabase.from('santri').select(`
                id, 
                nama, 
                kelas_id, 
                kamar_id,
                kelas_list ( nama_kelas ),
                kamars ( id, nama_kamar, musyrif_id, musyrifs ( id, nama ) )
            `).order('nama', { ascending: true }),
            supabase.from('musyrifs').select('*').order('nama', { ascending: true }),
            supabase.from('kamars').select('*').order('nama_kamar', { ascending: true })
        ]);

        if (catRes.data) {
            setCategories(catRes.data);
            if (catRes.data.length > 0) {
                setActiveCategoryId(catRes.data[0].id);
            }
        }
        if (actRes.data) setActivities(actRes.data);
        if (santriRes.data) setSantriList(santriRes.data);
        // if (kelasRes.data) setKelasList(kelasRes.data); // Removed unused
        if (musyrifRes.data) setMusyrifList(musyrifRes.data);
        if (kamarRes.data) setKamarList(kamarRes.data);

        setLoading(false);
    };

    const loadExistingRecords = async () => {
        const { data, error } = await supabase
            .from('kegiatan_records')
            .select('kegiatan_id, is_done')
            .eq('santri_id', santriId)
            .eq('tanggal', tanggal);

        if (!error && data) {
            const newChecks: Record<string, boolean> = {};
            data.forEach(record => {
                newChecks[record.kegiatan_id] = record.is_done;
            });
            setChecks(newChecks);
        } else {
            setChecks({});
        }
    };

    const toggleCheck = (id: string) => {
        setChecks(prev => ({ ...prev, [id]: !prev[id] }));
    };

    const selectAllInCategory = (catId: string) => {
        const next = { ...checks };
        activities.filter(a => a.kategori_id === catId).forEach(item => {
            next[item.id] = true;
        });
        setChecks(next);
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSave = async () => {
        if (!santriId) return showToast('Pilih santri terlebih dahulu', 'error');

        setSaving(true);
        try {
            await supabase.from('kegiatan_records').delete().eq('santri_id', santriId).eq('tanggal', tanggal);

            const inserts = activities.map(item => ({
                santri_id: santriId,
                tanggal: tanggal,
                kegiatan_id: item.id,
                is_done: !!checks[item.id]
            }));

            if (inserts.length > 0) {
                const { error } = await supabase.from('kegiatan_records').insert(inserts);
                if (error) throw error;
            }

            showToast('Data berhasil disimpan', 'success');
        } catch (error: any) {
            console.error('Save error', error);
            showToast('Gagal menyimpan data: ' + error.message, 'error');
        } finally {
            setSaving(false);
        }
    };
    const filteredSantri = santriList.filter(s => {
        const matchKelas = kelas === 'Semua' || s.kelas_id === kelas;
        const matchKamar = kamar === 'Semua' || s.kamar_id === kamar;
        const matchMusyrif = musyrif === 'Semua' || s.kamars?.musyrif_id === musyrif;
        return matchKelas && matchKamar && matchMusyrif;
    });

    if (loading) {
        return <div className="page-transition" style={{ padding: '2rem', textAlign: 'center' }}><Loader className="animate-spin inline" size={20} style={{ marginRight: '8px' }} /> Memuat form...</div>;
    }

    return (
        <div className="page-transition">
            <h1 className="page-title" style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
                Input Rekaman Kegiatan
            </h1>

            <div className="filters-bar compact-filters">
                <div className="filter-group">
                    <label className="filter-label">Tanggal</label>
                    <input
                        type="date"
                        className="filter-select"
                        value={tanggal}
                        onChange={e => setTanggal(e.target.value)}
                    />
                </div>

                <div className="filter-group">
                    <label className="filter-label">Musyrif</label>
                    <select
                        className="filter-select"
                        value={musyrif}
                        onChange={e => { setMusyrif(e.target.value); setKamar('Semua'); }}
                    >
                        <option value="Semua">Semua Musyrif</option>
                        {musyrifList.map(m => (
                            <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Kamar</label>
                    <select
                        className="filter-select"
                        value={kamar}
                        onChange={e => setKamar(e.target.value)}
                    >
                        <option value="Semua">Semua Kamar</option>
                        {kamarList
                            .filter(k => musyrif === 'Semua' || k.musyrif_id === musyrif)
                            .map(k => (
                                <option key={k.id} value={k.id}>{k.nama_kamar}</option>
                            ))}
                    </select>
                </div>

                <div className="filter-group">
                    <label className="filter-label">Santri</label>
                    <select
                        className="filter-select"
                        value={santriId}
                        onChange={e => setSantriId(e.target.value)}
                    >
                        <option value="">Pilih santri...</option>
                        {filteredSantri.map(s => (
                            <option key={s.id} value={s.id}>{s.nama} ({s.kelas_list?.nama_kelas || '7A'})</option>
                        ))}
                    </select>
                </div>
            </div>

            {santriId && categories.length > 0 && (
                <div className="filters-bar" style={{
                    marginBottom: '1.5rem',
                    background: '#f8fafc',
                    padding: '1.25rem',
                    borderRadius: '12px',
                    border: '1px dashed var(--border-color)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '1rem'
                }}>
                    <div className="filter-group" style={{ flex: 1, maxWidth: '350px' }}>
                        <label className="filter-label" style={{ fontWeight: 600, color: 'var(--text-main)', marginBottom: '0.4rem' }}>
                            Pilih Kategori Kegiatan:
                        </label>
                        <select
                            className="filter-select"
                            value={activeCategoryId}
                            onChange={(e) => setActiveCategoryId(e.target.value)}
                            style={{ width: '100%', padding: '0.65rem', fontSize: '1rem', background: 'white' }}
                        >
                            <option value="all">Tampilkan Semua Kategori</option>
                            {categories.map(cat => (
                                <option key={`view-${cat.id}`} value={cat.id}>
                                    {cat.nama_kategori}
                                </option>
                            ))}
                        </select>
                    </div>
                    <div style={{ flex: 1, textAlign: 'right', fontSize: '0.9rem', color: 'var(--text-light)' }}>
                        Menampilkan daftar kegiatan untuk santri terpilih.
                    </div>
                </div>
            )}

            {santriId && (
                <>
                    <div className="checkbox-list-container" style={{ gridTemplateColumns: activeCategoryId !== 'all' ? '1fr' : '1fr 1fr' }}>
                        {categories.filter(c => activeCategoryId === 'all' || c.id === activeCategoryId).map(cat => {
                            const catActivities = activities.filter(a => a.kategori_id === cat.id);
                            if (catActivities.length === 0) return null;

                            return (
                                <div className="checkbox-panel" key={`cat-${cat.id}`}>
                                    <div className="checkbox-panel-header">
                                        <h3 className="checkbox-panel-title">{cat.nama_kategori}</h3>
                                        <button className="btn-link" onClick={() => selectAllInCategory(cat.id)}>Pilih Semua</button>
                                    </div>
                                    <div>
                                        {catActivities.map((item) => (
                                            <div className="checkbox-item" key={`act-${item.id}`}>
                                                <input
                                                    type="checkbox"
                                                    id={`act-${item.id}`}
                                                    checked={!!checks[item.id]}
                                                    onChange={() => toggleCheck(item.id)}
                                                />
                                                <label htmlFor={`act-${item.id}`}>{item.nama_kegiatan}</label>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            );
                        })}
                        {categories.length === 0 && (
                            <div style={{ padding: '2rem', textAlign: 'center', width: '100%', color: 'var(--text-light)' }}>
                                Belum ada kategori tersimpan.
                            </div>
                        )}
                    </div>

                    <button
                        className="btn-primary"
                        style={{ padding: '1rem', fontSize: '1rem', display: 'flex', justifyContent: 'center' }}
                        onClick={handleSave}
                        disabled={saving}
                    >
                        {saving ? <Loader className="animate-spin" size={20} /> : 'Simpan Data'}
                    </button>
                </>
            )}

            {/* Toast Notification */}
            {toast && (
                <div className={`alert-toast ${toast.type}`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    );
};

export default InputAdabIbadah;
