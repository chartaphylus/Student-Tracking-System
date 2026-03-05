import { useState, useEffect } from 'react';
import { Edit2, Trash2, Plus, Loader, X } from 'lucide-react';
import { supabase } from '../lib/supabase';

const DataReferensi = () => {
    const [activeTab, setActiveTab] = useState<'kelas' | 'musyrif' | 'kamar'>('musyrif');

    // Data list
    const [kelasList, setKelasList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    // Modal state
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [confirmDelete, setConfirmDelete] = useState<{ id: string, nama: string } | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [nama, setNama] = useState('');
    const [selectedMusyrifId, setSelectedMusyrifId] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    // Pagination
    const [currentPage, setCurrentPage] = useState(1);
    const itemsPerPage = 8; // Adjust for tabs layout space

    useEffect(() => {
        fetchData();
    }, [activeTab]);

    const fetchData = async () => {
        setLoading(true);
        if (activeTab === 'kelas') {
            const { data } = await supabase.from('kelas_list').select('*').order('nama_kelas', { ascending: true });
            setKelasList(data || []);
        } else if (activeTab === 'musyrif') {
            const { data } = await supabase.from('musyrifs').select('*').order('nama', { ascending: true });
            setMusyrifList(data || []);
        } else if (activeTab === 'kamar') {
            // Kamar includes musyrif name for display
            const { data } = await supabase.from('kamars').select(`
                id,
                nama_kamar,
                musyrif_id,
                musyrifs (
                    nama
                )
            `).order('nama_kamar', { ascending: true });
            setKamarList(data || []);

            // prefetch musyrifs for the kamar modal in case they want to add
            const musRes = await supabase.from('musyrifs').select('id, nama').order('nama', { ascending: true });
            setMusyrifList(musRes.data || []);
        }
        setLoading(false);
    };

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    // Pagination Logic
    const getActiveListData = () => {
        if (activeTab === 'kelas') return kelasList;
        if (activeTab === 'musyrif') return musyrifList;
        return kamarList;
    };

    const activeList = getActiveListData();
    const totalPages = Math.ceil(activeList.length / itemsPerPage);
    const paginatedItems = activeList.slice(
        (currentPage - 1) * itemsPerPage,
        currentPage * itemsPerPage
    );

    useEffect(() => {
        setCurrentPage(1);
    }, [activeTab]);

    const handleOpenAdd = () => {
        setEditingId(null);
        setNama('');
        setSelectedMusyrifId('');
        setIsModalOpen(true);
    };

    const handleOpenEdit = (item: any) => {
        setEditingId(item.id);
        if (activeTab === 'kelas') setNama(item.nama_kelas);
        if (activeTab === 'musyrif') setNama(item.nama);
        if (activeTab === 'kamar') {
            setNama(item.nama_kamar);
            setSelectedMusyrifId(item.musyrif_id || '');
        }
        setIsModalOpen(true);
    };

    const handleDelete = async () => {
        if (!confirmDelete) return;

        setSubmitting(true);
        let table = '';
        if (activeTab === 'kelas') table = 'kelas_list';
        if (activeTab === 'musyrif') table = 'musyrifs';
        if (activeTab === 'kamar') table = 'kamars';

        const { error } = await supabase.from(table).delete().eq('id', confirmDelete.id);
        if (error) {
            showToast('Gagal menghapus data: ' + error.message, 'error');
        } else {
            showToast('Data berhasil dihapus', 'success');
            fetchData();
        }
        setSubmitting(false);
        setConfirmDelete(null);
    };

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSubmitting(true);

        let table = '';
        let payload: any = {};

        if (activeTab === 'kelas') {
            table = 'kelas_list';
            payload = { nama_kelas: nama };
        } else if (activeTab === 'musyrif') {
            table = 'musyrifs';
            payload = { nama: nama };
        } else if (activeTab === 'kamar') {
            table = 'kamars';
            payload = {
                nama_kamar: nama,
                musyrif_id: selectedMusyrifId || null
            };
        }

        if (editingId) {
            const { error } = await supabase.from(table).update(payload).eq('id', editingId);
            if (error) {
                showToast('Gagal mengupdate data: ' + error.message, 'error');
            } else {
                showToast('Data berhasil diperbarui', 'success');
            }
        } else {
            const { error } = await supabase.from(table).insert([payload]);
            if (error) {
                showToast('Gagal menambah data: ' + error.message, 'error');
            } else {
                showToast('Data baru berhasil ditambahkan', 'success');
            }
        }

        setSubmitting(false);
        setIsModalOpen(false);
        fetchData();
    };

    return (
        <div className="page-transition">
            <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                <div>
                    <h1 className="page-title" style={{ fontSize: '1.5rem', fontWeight: 600 }}>Data Referensi</h1>
                    <p style={{ color: 'var(--text-light)', marginTop: '0.2rem', fontSize: '0.9rem' }}>
                        Kelola data Musyrif, Kamar, dan Kelas sebagai acuan sistem.
                    </p>
                </div>
            </div>

            {/* Tabs */}
            <div className="tab-container" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', background: '#f1f5f9', padding: '0.4rem', borderRadius: '12px', width: 'fit-content' }}>
                <button
                    onClick={() => setActiveTab('musyrif')}
                    style={{
                        background: activeTab === 'musyrif' ? 'white' : 'transparent',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: activeTab === 'musyrif' ? 600 : 500,
                        color: activeTab === 'musyrif' ? 'var(--primary-color)' : 'var(--text-light)',
                        borderRadius: '8px',
                        boxShadow: activeTab === 'musyrif' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}>
                    Data Musyrif
                </button>
                <button
                    onClick={() => setActiveTab('kamar')}
                    style={{
                        background: activeTab === 'kamar' ? 'white' : 'transparent',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: activeTab === 'kamar' ? 600 : 500,
                        color: activeTab === 'kamar' ? 'var(--primary-color)' : 'var(--text-light)',
                        borderRadius: '8px',
                        boxShadow: activeTab === 'kamar' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}>
                    Data Kamar
                </button>
                <button
                    onClick={() => setActiveTab('kelas')}
                    style={{
                        background: activeTab === 'kelas' ? 'white' : 'transparent',
                        border: 'none',
                        padding: '0.6rem 1.25rem',
                        fontSize: '0.9rem',
                        fontWeight: activeTab === 'kelas' ? 600 : 500,
                        color: activeTab === 'kelas' ? 'var(--primary-color)' : 'var(--text-light)',
                        borderRadius: '8px',
                        boxShadow: activeTab === 'kelas' ? '0 2px 4px rgba(0,0,0,0.05)' : 'none',
                        transition: 'all 0.2s',
                        cursor: 'pointer'
                    }}>
                    Data Kelas
                </button>
            </div>

            <div className="card">
                <div className="card-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1.25rem 1.5rem' }}>
                    <h2 className="card-title" style={{ fontSize: '1.1rem', fontWeight: 600 }}>
                        {activeTab === 'kelas' ? 'Daftar Kelas' : activeTab === 'musyrif' ? 'Daftar Musyrif' : 'Daftar Kamar'}
                    </h2>
                    <button className="btn-secondary" style={{ backgroundColor: 'var(--white)', color: 'var(--primary-color)', padding: '0.5rem 1rem' }} onClick={handleOpenAdd}>
                        <Plus size={16} /> Tambah {activeTab === 'kelas' ? 'Kelas' : activeTab === 'musyrif' ? 'Musyrif' : 'Kamar'}
                    </button>
                </div>

                <div className="table-responsive">
                    {loading ? (
                        <div style={{ padding: '3rem', textAlign: 'center' }}><Loader className="animate-spin inline" size={24} /> Memuat data...</div>
                    ) : (
                        <>
                            <table>
                                <thead>
                                    <tr>
                                        <th style={{ width: '80px' }}>No</th>
                                        <th>Nama</th>
                                        {activeTab === 'kamar' && <th>Oleh Musyrif</th>}
                                        <th style={{ textAlign: 'right' }}>Aksi</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {activeTab === 'kelas' && paginatedItems.map((item, i) => (
                                        <tr key={item.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                            <td>{item.nama_kelas}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon edit" onClick={() => handleOpenEdit(item)}><Edit2 size={16} /></button>
                                                    <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: item.id, nama: item.nama_kelas })}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {activeTab === 'musyrif' && paginatedItems.map((item, i) => (
                                        <tr key={item.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                            <td>{item.nama}</td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon edit" onClick={() => handleOpenEdit(item)}><Edit2 size={16} /></button>
                                                    <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: item.id, nama: item.nama })}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {activeTab === 'kamar' && paginatedItems.map((item, i) => (
                                        <tr key={item.id}>
                                            <td>{(currentPage - 1) * itemsPerPage + i + 1}</td>
                                            <td>{item.nama_kamar}</td>
                                            <td><span style={{ backgroundColor: 'var(--secondary-color)', padding: '0.2rem 0.6rem', borderRadius: '4px', fontSize: '0.85rem' }}>{item.musyrifs?.nama || '-'}</span></td>
                                            <td style={{ textAlign: 'right' }}>
                                                <div className="action-buttons" style={{ justifyContent: 'flex-end' }}>
                                                    <button className="btn-icon edit" onClick={() => handleOpenEdit(item)}><Edit2 size={16} /></button>
                                                    <button className="btn-icon delete" onClick={() => setConfirmDelete({ id: item.id, nama: item.nama_kamar })}><Trash2 size={16} /></button>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}

                                    {activeList.length === 0 && (
                                        <tr>
                                            <td colSpan={4} style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada data.</td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>

                            {/* Pagination */}
                            {totalPages > 1 && (
                                <div className="pagination-container">
                                    <div className="pagination-info">
                                        Halaman {currentPage} dari {totalPages}
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
            </div>

            {/* Modal */}
            {/* Delete Confirmation Modal */}
            {confirmDelete && (
                <div className="modal-overlay">
                    <div className="modal-container">
                        <div className="modal-header">
                            <h3 className="modal-title">Konfirmasi Hapus</h3>
                        </div>
                        <div className="modal-body">
                            Apakah Anda yakin ingin menghapus <strong>{confirmDelete.nama}</strong>? Tindakan ini tidak dapat dibatalkan.
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

            {isModalOpen && (
                <div className="modal-overlay">
                    <div className="modal-content">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <h2 className="modal-header" style={{ marginBottom: 0 }}>
                                {editingId ? 'Edit' : 'Tambah'} {activeTab === 'kelas' ? 'Kelas' : activeTab === 'musyrif' ? 'Musyrif' : 'Kamar'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} style={{ background: 'none', border: 'none', cursor: 'pointer' }}><X size={20} /></button>
                        </div>
                        <form onSubmit={handleSave} style={{ marginTop: '1.5rem' }}>
                            <div className="form-group">
                                <label>Nama {activeTab === 'kelas' ? 'Kelas' : activeTab === 'musyrif' ? 'Musyrif' : 'Kamar'}</label>
                                <input
                                    type="text"
                                    className="form-control"
                                    value={nama}
                                    onChange={e => setNama(e.target.value)}
                                    required
                                    autoFocus
                                />
                            </div>

                            {activeTab === 'kamar' && (
                                <div className="form-group">
                                    <label>Penanggung Jawab (Musyrif)</label>
                                    <select
                                        className="filter-select"
                                        value={selectedMusyrifId}
                                        onChange={e => setSelectedMusyrifId(e.target.value)}
                                        required
                                        style={{ width: '100%' }}
                                    >
                                        <option value="">Pilih Musyrif</option>
                                        {musyrifList.map((m) => (
                                            <option key={m.id} value={m.id}>{m.nama}</option>
                                        ))}
                                    </select>
                                </div>
                            )}

                            <div className="modal-actions">
                                <button type="button" className="btn-cancel" onClick={() => setIsModalOpen(false)}>Batal</button>
                                <button type="submit" className="btn-save" disabled={submitting}>
                                    {submitting ? 'Menyimpan...' : 'Simpan'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
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

export default DataReferensi;
