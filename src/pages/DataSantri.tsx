import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Loader, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DataSantri = () => {
    const [kelasFilter, setKelasFilter] = useState('Semua Kelas');
    const [santriData, setSantriData] = useState<any[]>([]);

    // Master data
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);

    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, nama: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [formData, setFormData] = useState({ nama: '', kelas_id: '', kamar_id: '' });
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Bit more compact

    useEffect(() => {
        fetchMasterData();
        fetchSantri();
    }, []);

    const fetchMasterData = async () => {
        const [kelasRes, kamarRes] = await Promise.all([
            supabase.from('kelas_list').select('*').order('nama_kelas'),
            // Fetch kamar along with its musyrif
            supabase.from('kamars').select(`
                id,
                nama_kamar,
                musyrifs ( id, nama )
            `).order('nama_kamar')
        ]);

        if (kelasRes.data) setKelasList(kelasRes.data);
        if (kamarRes.data) setKamarList(kamarRes.data);
    };

    const fetchSantri = async () => {
        setLoading(true);
        const { data, error } = await supabase
            .from('santri')
            .select(`
                id,
                nama,
                kelas_id,
                kamar_id,
                kelas_list ( nama_kelas ),
                kamars ( nama_kamar, musyrifs ( nama ) )
            `)
            .order('nama', { ascending: true });

        if (error) {
            console.error('Error fetching santri:', error);
            showToast('Gagal memuat data santri', 'error');
        } else {
            setSantriData(data || []);
        }
        setLoading(false);
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleOpenAdd = () => {
        setEditingId(null);
        setFormData({ nama: '', kelas_id: '', kamar_id: '' });
        setIsModalOpen(true);
    };

    const handleOpenEdit = (santri: any) => {
        setEditingId(santri.id);
        setFormData({
            nama: santri.nama,
            kelas_id: santri.kelas_id || '',
            kamar_id: santri.kamar_id || ''
        });
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;
        setSubmitting(true);
        const { error } = await supabase.from('santri').delete().eq('id', confirmDelete.id);
        if (error) {
            showToast('Gagal menghapus data: ' + error.message, 'error');
        } else {
            showToast('Data santri berhasil dihapus', 'success');
            fetchSantri();
        }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        const payload = {
            nama: formData.nama,
            kelas_id: formData.kelas_id || null,
            kamar_id: formData.kamar_id || null
        };

        if (editingId) {
            const { error } = await supabase.from('santri').update(payload).eq('id', editingId);
            if (error) {
                showToast('Gagal mengupdate data: ' + error.message, 'error');
            } else {
                showToast('Data santri berhasil diperbarui', 'success');
            }
        } else {
            const { error } = await supabase.from('santri').insert([payload]);
            if (error) {
                showToast('Gagal menambah data: ' + error.message, 'error');
            } else {
                showToast('Santri baru berhasil ditambahkan', 'success');
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
        fetchSantri();
    };

    const filteredSantri = kelasFilter === 'Semua Kelas'
        ? santriData
        : santriData.filter(s => s.kelas_id === kelasFilter);

    const totalPages = Math.ceil(filteredSantri.length / itemsPerPage);
    const paginatedSantri = filteredSantri.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [kelasFilter]);

    return (
        <div className="page-transition">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title">Data Santri</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                        Kelola data santri beserta pemempatan kamar dan kelas (Diatur lewat Data Master terlebih dahulu).
                    </p>
                </div>
            </div>

            <div className="filters-bar">
                <div className="filter-group">
                    <select
                        className="filter-select"
                        value={kelasFilter}
                        onChange={e => setKelasFilter(e.target.value)}
                    >
                        <option value="Semua Kelas">Semua Kelas</option>
                        {kelasList.map(k => (
                            <option key={`filter-${k.id}`} value={k.id}>{k.nama_kelas}</option>
                        ))}
                    </select>
                </div>
                <div className="page-actions">
                    <button className="btn-secondary" style={{ backgroundColor: 'var(--primary-color)', color: 'white' }} onClick={handleOpenAdd}>
                        <Plus size={16} /> Tambah Santri
                    </button>
                </div>
            </div>

            <div className="card table-responsive">
                {loading ? (
                    <div style={{ padding: '3rem', textAlign: 'center' }}><Loader className="animate-spin inline" size={24} /> Memuat data...</div>
                ) : (
                    <>
                        <table>
                            <thead>
                                <tr>
                                    <th>No</th>
                                    <th>Nama</th>
                                    <th>Kelas</th>
                                    <th>Kamar</th>
                                    <th>Aksi</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedSantri.map((santri, index) => (
                                    <tr key={santri.id}>
                                        <td>{(currentPage - 1) * itemsPerPage + index + 1}</td>
                                        <td>
                                            <div style={{ fontWeight: 600, color: 'var(--text-main)' }}>{santri.nama}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>ID: {santri.id.slice(0, 8)}</div>
                                        </td>
                                        <td>{santri.kelas_list?.nama_kelas || '-'}</td>
                                        <td>
                                            <div>{santri.kamars?.nama_kamar || '-'}</div>
                                            <div style={{ fontSize: '0.75rem', color: 'var(--text-light)' }}>{santri.kamars?.musyrifs?.nama || ''}</div>
                                        </td>
                                        <td style={{ textAlign: 'right' }}>
                                            <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                <button className="btn-icon edit" onClick={() => handleOpenEdit(santri)} title="Edit"><Edit2 size={16} /></button>
                                                <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: santri.id, nama: santri.nama })} title="Hapus"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {filteredSantri.length === 0 && (
                                    <tr>
                                        <td colSpan={5} style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data santri. Pastikan sudah mengisi Data Kelas/Kamar.</td>
                                    </tr>
                                )}
                            </tbody>
                        </table>

                        {/* Pagination UI */}
                        {totalPages > 1 && (
                            <div className="pagination-container">
                                <div className="pagination-info">
                                    Menampilkan {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, filteredSantri.length)} dari {filteredSantri.length} santri
                                </div>
                                <div className="pagination-btns">
                                    <button
                                        className="page-btn"
                                        disabled={currentPage === 1}
                                        onClick={() => setCurrentPage(prev => prev - 1)}
                                    >
                                        &lt;
                                    </button>
                                    {(() => {
                                        const pages = [];
                                        const maxVisible = 5;
                                        let start = Math.max(1, currentPage - Math.floor(maxVisible / 2));
                                        let end = Math.min(totalPages, start + maxVisible - 1);

                                        if (end - start + 1 < maxVisible) {
                                            start = Math.max(1, end - maxVisible + 1);
                                        }

                                        if (start > 1) {
                                            pages.push(
                                                <button key={1} className="page-btn" onClick={() => setCurrentPage(1)}>1</button>
                                            );
                                            if (start > 2) pages.push(<span key="dots-1" style={{ alignSelf: 'center', padding: '0 0.5rem' }}>...</span>);
                                        }

                                        for (let i = start; i <= end; i++) {
                                            pages.push(
                                                <button
                                                    key={i}
                                                    className={`page-btn ${currentPage === i ? 'active' : ''}`}
                                                    onClick={() => setCurrentPage(i)}
                                                >
                                                    {i}
                                                </button>
                                            );
                                        }

                                        if (end < totalPages) {
                                            if (end < totalPages - 1) pages.push(<span key="dots-2" style={{ alignSelf: 'center', padding: '0 0.5rem' }}>...</span>);
                                            pages.push(
                                                <button key={totalPages} className="page-btn" onClick={() => setCurrentPage(totalPages)}>{totalPages}</button>
                                            );
                                        }
                                        return pages;
                                    })()}
                                    <button
                                        className="page-btn"
                                        disabled={currentPage === totalPages}
                                        onClick={() => setCurrentPage(prev => prev + 1)}
                                    >
                                        &gt;
                                    </button>
                                </div>
                            </div>
                        )}
                    </>
                )}
            </div>

            {/* Toast Notification */}
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
                            Apakah Anda yakin ingin menghapus data santri <strong>{confirmDelete.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
                        </div>
                        <div className="modal-footer">
                            <button className="btn-secondary" onClick={() => setConfirmDelete(null)} disabled={submitting}>Batal</button>
                            <button className="btn-danger" onClick={handleDelete} disabled={submitting}>
                                {submitting ? <Loader className="animate-spin" size={18} /> : 'Ya, Hapus'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Modal Tambah/Edit */}
            {
                isModalOpen && (
                    <div className="modal-overlay">
                        <div className="modal-content">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <h2 className="modal-header" style={{ marginBottom: 0 }}>{editingId ? 'Edit Santri' : 'Tambah Santri'}</h2>
                                <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                            </div>
                            <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
                                <div className="form-group">
                                    <label>Nama Lengkap</label>
                                    <input type="text" className="form-control" value={formData.nama} onChange={e => setFormData({ ...formData, nama: e.target.value })} required autoFocus />
                                </div>
                                <div className="form-group">
                                    <label>Kelas</label>
                                    <select className="form-control" value={formData.kelas_id} onChange={e => setFormData({ ...formData, kelas_id: e.target.value })} required>
                                        <option value="">-- Pilih Kelas --</option>
                                        {kelasList.map((k) => (
                                            <option key={k.id} value={k.id}>{k.nama_kelas}</option>
                                        ))}
                                    </select>
                                </div>
                                <div className="form-group">
                                    <label>Kamar</label>
                                    <select className="form-control" value={formData.kamar_id} onChange={e => setFormData({ ...formData, kamar_id: e.target.value })} required>
                                        <option value="">-- Pilih Kamar --</option>
                                        {kamarList.map((k) => (
                                            <option key={k.id} value={k.id}>
                                                {k.nama_kamar} {k.musyrifs ? `(Oleh: ${k.musyrifs.nama})` : ''}
                                            </option>
                                        ))}
                                    </select>
                                </div>

                                <div className="modal-actions">
                                    <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
                                    <button type="submit" className="btn-save" disabled={submitting}>
                                        {submitting ? 'Menyimpan...' : 'Simpan'}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                )
            }
        </div >
    );
};

export default DataSantri;
