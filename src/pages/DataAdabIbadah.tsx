import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Loader, X, Settings } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DataAdabIbadah = () => {
    const [categories, setCategories] = useState<any[]>([]);
    const [activities, setActivities] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state for Activities
    const [isActModalOpen, setIsActModalOpen] = useState(false);
    const [editingActId, setEditingActId] = useState<string | null>(null);
    const [namaAct, setNamaAct] = useState('');
    const [selectedCatId, setSelectedCatId] = useState('');

    const [activeCategoryId, setActiveCategoryId] = useState<string>('all');

    // Modal state for Categories
    const [isCatModalOpen, setIsCatModalOpen] = useState(false);
    const [editingCatId, setEditingCatId] = useState<string | null>(null);
    const [namaCat, setNamaCat] = useState('');

    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, nama: string, type: 'category' | 'activity' } | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setLoading(true);
        const [catRes, actRes] = await Promise.all([
            supabase.from('kategori_kegiatan').select('*').order('created_at', { ascending: true }),
            supabase.from('kegiatan').select('*').order('created_at', { ascending: true })
        ]);

        if (catRes.data) {
            setCategories(catRes.data);
            if (catRes.data.length > 0 && activeCategoryId === 'all') {
                setActiveCategoryId(catRes.data[0].id);
            }
        }
        if (actRes.data) setActivities(actRes.data);
        setLoading(false);
    };

    // --- Category Actions ---
    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenAddCat = () => {
        setEditingCatId(null);
        setNamaCat('');
        setIsCatModalOpen(true);
    };

    const handleOpenEditCat = (id: string, nama: string) => {
        setEditingCatId(id);
        setNamaCat(nama);
        setIsCatModalOpen(true);
    };

    const handleDeleteCat = async () => {
        if (!confirmDelete || confirmDelete.type !== 'category') return;

        setSubmitting(true);
        const { error } = await supabase.from('kategori_kegiatan').delete().eq('id', confirmDelete.id);
        if (error) {
            showToast('Gagal menghapus kategori: ' + error.message, 'error');
        } else {
            showToast('Kategori berhasil dihapus', 'success');
            fetchData();
        }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSaveCat = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const payload = { nama_kategori: namaCat };

        if (editingCatId) {
            const { error } = await supabase.from('kategori_kegiatan').update(payload).eq('id', editingCatId);
            if (error) {
                showToast('Gagal update: ' + error.message, 'error');
            } else {
                showToast('Kategori diperbarui', 'success');
            }
        } else {
            const { error } = await supabase.from('kategori_kegiatan').insert([payload]);
            if (error) {
                showToast('Gagal menambah kategori: ' + error.message, 'error');
            } else {
                showToast('Kategori ditambahkan', 'success');
            }
        }
        setSubmitting(false);
        setIsCatModalOpen(false);
        fetchData();
    };


    // --- Activity Actions ---
    const handleOpenAddAct = (catId: string) => {
        setEditingActId(null);
        setNamaAct('');
        setSelectedCatId(catId);
        setIsActModalOpen(true);
    };

    const handleOpenEditAct = (id: string, nama: string, catId: string) => {
        setEditingActId(id);
        setNamaAct(nama);
        setSelectedCatId(catId);
        setIsActModalOpen(true);
    };

    const handleDeleteAct = async () => {
        if (!confirmDelete || confirmDelete.type !== 'activity') return;

        setSubmitting(true);
        const { error } = await supabase.from('kegiatan').delete().eq('id', confirmDelete.id);
        if (error) {
            showToast('Gagal menghapus kegiatan: ' + error.message, 'error');
        } else {
            showToast('Kegiatan berhasil dihapus', 'success');
            fetchData();
        }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSaveAct = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);
        const payload = {
            nama_kegiatan: namaAct,
            kategori_id: selectedCatId
        };

        if (editingActId) {
            const { error } = await supabase.from('kegiatan').update(payload).eq('id', editingActId);
            if (error) {
                showToast('Gagal update: ' + error.message, 'error');
            } else {
                showToast('Kegiatan diperbarui', 'success');
            }
        } else {
            const { error } = await supabase.from('kegiatan').insert([payload]);
            if (error) {
                showToast('Gagal menambah: ' + error.message, 'error');
            } else {
                showToast('Kegiatan baru ditambahkan', 'success');
            }
        }
        setSubmitting(false);
        setIsActModalOpen(false);
        fetchData();
    };


    return (
        <div className="page-transition">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title" style={{ color: 'var(--text-main)', fontSize: '1.5rem', fontWeight: 600 }}>
                        Kategori & Kegiatan
                    </h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                        Kelola data Adab, Ibadah, dan buat kategori kegiatan baru sesuai kebutuhan.
                    </p>
                </div>
            </div>

            {loading ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}><Loader className="animate-spin inline" size={24} /> Memuat data...</div>
            ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>

                    {categories.length === 0 && (
                        <div style={{ textAlign: 'center', padding: '3rem', border: '1px dashed var(--border-color)', borderRadius: '8px' }}>
                            Belum ada Kategori Kegiatan terdaftar. Silakan tambahkan kategori.
                        </div>
                    )}

                    {categories.length > 0 && (
                        <div className="filters-bar" style={{
                            marginBottom: '1.5rem',
                            display: 'flex',
                            flexWrap: 'wrap',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            gap: '1rem'
                        }}>
                            <div className="filter-group" style={{ flex: '1', minWidth: '200px', maxWidth: '400px' }}>
                                <label className="filter-label">Kategori:</label>
                                <select
                                    className="filter-select"
                                    value={activeCategoryId}
                                    onChange={(e) => setActiveCategoryId(e.target.value)}
                                >
                                    <option value="all">Tampilkan Semua</option>
                                    {categories.map(cat => (
                                        <option key={`view-${cat.id}`} value={cat.id}>
                                            {cat.nama_kategori}
                                        </option>
                                    ))}
                                </select>
                            </div>
                            <button className="btn-secondary" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleOpenAddCat}>
                                <Plus size={16} /> Kelompok Baru
                            </button>
                        </div>
                    )}

                    {/* Render grid cards for each Category */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem', alignItems: 'start' }}>
                        {categories.filter(c => activeCategoryId === 'all' || c.id === activeCategoryId).map(cat => {
                            const catActivities = activities.filter(a => a.kategori_id === cat.id);

                            return (
                                <div className="card" key={`cat-${cat.id}`} style={{ margin: 0 }}>
                                    <div className="card-header" style={{ borderBottom: '2px solid var(--border-color)', paddingBottom: '1rem', alignItems: 'center' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', flexWrap: 'wrap', width: '100%', justifyContent: 'space-between' }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                                                <h2 className="card-title" style={{ margin: 0 }}>{cat.nama_kategori}</h2>
                                                <button className="btn-icon edit" onClick={() => handleOpenEditCat(cat.id, cat.nama_kategori)} title="Edit Kategori"><Settings size={14} /></button>
                                                <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: cat.id, nama: cat.nama_kategori, type: 'category' })} title="Hapus Kategori"><Trash2 size={14} /></button>
                                            </div>
                                            <button className="btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', backgroundColor: 'white', color: 'var(--primary-color)' }} onClick={() => handleOpenAddAct(cat.id)}>
                                                <Plus size={14} /> Tambah Item
                                            </button>
                                        </div>
                                    </div>
                                    <div className="table-responsive">
                                        <table>
                                            <thead>
                                                <tr>
                                                    <th style={{ width: '50px' }}>No</th>
                                                    <th>Nama Aktivitas</th>
                                                    <th style={{ textAlign: 'right' }}>Aksi</th>
                                                </tr>
                                            </thead>
                                            <tbody>
                                                {catActivities.map((act, index) => (
                                                    <tr key={`act-${act.id}`}>
                                                        <td>{index + 1}</td>
                                                        <td>{act.nama_kegiatan}</td>
                                                        <td style={{ textAlign: 'right' }}>
                                                            <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                                <button className="btn-icon edit" onClick={() => handleOpenEditAct(act.id, act.nama_kegiatan, cat.id)}><Edit2 size={16} /></button>
                                                                <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: act.id, nama: act.nama_kegiatan, type: 'activity' })}><Trash2 size={16} /></button>
                                                            </div>
                                                        </td>
                                                    </tr>
                                                ))}
                                                {catActivities.length === 0 && (
                                                    <tr>
                                                        <td colSpan={3} style={{ textAlign: 'center', padding: '1rem', color: 'var(--text-light)' }}>
                                                            Belum ada kegiatan untuk {cat.nama_kategori}
                                                        </td>
                                                    </tr>
                                                )}
                                            </tbody>
                                        </table>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}

            {/* Modal Category */}
            {isCatModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="modal-header" style={{ marginBottom: 0 }}>
                                {editingCatId ? 'Edit' : 'Tambah'} Kategori
                            </h2>
                            <button onClick={() => setIsCatModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveCat} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Nama Kategori (Judul Tabel)</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={namaCat}
                                    onChange={e => setNamaCat(e.target.value)}
                                    required
                                    autoFocus
                                    placeholder="Misal: Adab, Ibadah, Tahfidz"
                                />
                            </div>
                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsCatModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn-save" disabled={submitting}>
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}

            {/* Modal Activity */}
            {isActModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="modal-header" style={{ marginBottom: 0 }}>
                                {editingActId ? 'Edit' : 'Tambah'} Kegiatan
                            </h2>
                            <button onClick={() => setIsActModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSaveAct} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Masuk ke Kategori / Tabel:</label>
                                <select
                                    className="form-control"
                                    value={selectedCatId}
                                    onChange={e => setSelectedCatId(e.target.value)}
                                    required
                                >
                                    {categories.map(c => (
                                        <option key={`opt-${c.id}`} value={c.id}>{c.nama_kategori}</option>
                                    ))}
                                </select>
                            </div>
                            <div className="form-group">
                                <label>Nama Kegiatan</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={namaAct}
                                    onChange={e => setNamaAct(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsActModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn-save" disabled={submitting}>
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
            {/* Modal Toast */}
            {toast && (
                <div className={`alert-toast ${toast.type}`}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}

            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3 className="modal-title">Konfirmasi Hapus</h3>
                        </div>
                        <div className="modal-body">
                            {confirmDelete.type === 'category' ? (
                                <>Apakah Anda yakin ingin menghapus kategori <strong>{confirmDelete.nama}</strong>? Seluruh kegiatan di dalamnya akan ikut terhapus.</>
                            ) : (
                                <>Apakah Anda yakin ingin menghapus kegiatan <strong>{confirmDelete.nama}</strong>?</>
                            )}
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setConfirmDelete(null)} disabled={submitting}>Batal</button>
                            <button className="btn-danger" onClick={confirmDelete.type === 'category' ? handleDeleteCat : handleDeleteAct} disabled={submitting}>
                                {submitting ? <Loader className="animate-spin" size={18} /> : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default DataAdabIbadah;
