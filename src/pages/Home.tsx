import { useState, useEffect } from 'react';
import { Search, Loader, FileText, LayoutDashboard, User, Calendar, MapPin, GraduationCap, ChevronRight, LogIn } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Link } from 'react-router-dom';

const getProgressBarColor = (val: number) => {
    if (val > 90) return '#1a4267'; // bg-excellent
    if (val > 75) return '#3b82f6'; // bg-good
    if (val > 60) return '#eab308'; // bg-fair
    if (val > 40) return '#f97316'; // bg-poor
    return '#ef4444'; // bg-bad
};

const ProgressBar = ({ value }: { value: number }) => {
    const color = getProgressBarColor(value);
    const isDarkText = value < 50;

    return (
        <div style={{
            width: '90px',
            height: '24px',
            backgroundColor: '#e2e8f0',
            borderRadius: '4px',
            position: 'relative',
            overflow: 'hidden',
            margin: '0 auto'
        }}>
            <div style={{ height: '100%', width: `${value}%`, backgroundColor: color, borderRadius: '4px' }} />
            <div style={{
                position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: '0.75rem', fontWeight: 600, color: isDarkText ? '#334155' : 'white'
            }}>
                {value.toFixed(1)}%
            </div>
        </div>
    );
};

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const barColors = ['#2dbdb6', '#69d2a1', '#7b61ff', '#ff6b6b', '#ffa94d', '#74c0fc', '#f06595', '#c0eb75', '#ffd43b'];

const Home = () => {
    const today = new Date();
    const [monthYear, setMonthYear] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [searchTerm, setSearchTerm] = useState('');
    const [searching, setSearching] = useState(false);
    const [foundSantri, setFoundSantri] = useState<any[]>([]);
    const [selectedSantri, setSelectedSantri] = useState<any>(null);
    const [categoryReports, setCategoryReports] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        if (!searchTerm.trim()) {
            showToast('Masukkan nama santri', 'error');
            return;
        }

        setSearching(true);
        setSelectedSantri(null);
        setCategoryReports([]);
        setFoundSantri([]);

        try {
            console.log('Searching for:', searchTerm);
            const { data, error } = await supabase
                .from('santri')
                .select('id, nama, kelas_id, kamar_id, kelas_list ( nama_kelas ), kamars ( id, nama_kamar, musyrif_id, musyrifs ( nama ) )')
                .ilike('nama', `%${searchTerm.trim()}%`)
                .limit(10);

            if (error) {
                console.error('Search error:', error);
                showToast(`Gagal mencari: ${error.message}`, 'error');
            } else {
                console.log('Search results:', data);
                setFoundSantri(data || []);
                if (!data || data.length === 0) {
                    showToast('Santri tidak ditemukan. Pastikan nama sudah benar.', 'error');
                }
            }
        } catch (err) {
            console.error('Unexpected search error:', err);
            showToast('Terjadi kesalahan koneksi', 'error');
        } finally {
            setSearching(false);
        }
    };

    const selectSantri = (santri: any) => {
        setSelectedSantri(santri);
        setFoundSantri([]);
    };

    useEffect(() => {
        if (selectedSantri) {
            fetchData();
        }
    }, [selectedSantri, monthYear]);

    const fetchData = async () => {
        if (!selectedSantri) return;

        setLoading(true);
        const [targetYear, targetMonth] = monthYear.split('-');
        const year = parseInt(targetYear);
        const monthIndex = parseInt(targetMonth) - 1;

        const startOfMonth = new Date(year, monthIndex, 1);
        const endOfMonth = new Date(year, monthIndex + 1, 0);
        const startStr = startOfMonth.toISOString().split('T')[0];
        const endStr = endOfMonth.toISOString().split('T')[0];
        const daysInMonth = endOfMonth.getDate();

        try {
            const catRes = await supabase.from('kategori_kegiatan').select('*').order('created_at', { ascending: true });
            const categories = catRes.data || [];

            const actRes = await supabase.from('kegiatan').select('id, nama_kegiatan, kategori_id');
            const activities = actRes.data || [];

            const actDict: Record<string, any> = {};
            activities.forEach(a => actDict[a.id] = a);

            const recRes = await supabase.from('kegiatan_records').select('*')
                .eq('santri_id', selectedSantri.id)
                .gte('tanggal', startStr)
                .lte('tanggal', endStr);

            const allRecords = recRes.data || [];

            const reports = categories.map((cat, idx) => {
                const catRecords = allRecords.filter(r => actDict[r.kegiatan_id]?.kategori_id === cat.id);
                const catActivities = activities.filter(a => a.kategori_id === cat.id);
                const myActDict: Record<string, string> = {};
                catActivities.forEach(a => myActDict[a.id] = a.nama_kegiatan);

                const chart = processDailyChart(catRecords, daysInMonth);
                const weekly = processWeekly(catRecords);
                const { items, avg } = processByItem(catRecords, myActDict);

                return {
                    id: cat.id,
                    title: cat.nama_kategori,
                    chartColor: barColors[idx % barColors.length],
                    chart,
                    weekly,
                    items,
                    avg
                };
            });

            setCategoryReports(reports.filter((r: any) => r.items.length > 0));
        } catch (error) {
            console.error('Error fetching data', error);
        } finally {
            setLoading(false);
        }
    };

    const processDailyChart = (records: any[], daysInMonth: number) => {
        const byDay: Record<number, { true: number, total: number }> = {};
        for (let i = 1; i <= daysInMonth; i++) byDay[i] = { true: 0, total: 0 };

        records.forEach(r => {
            const d = new Date(r.tanggal).getDate();
            byDay[d].total += 1;
            if (r.is_done) byDay[d].true += 1;
        });

        return Array.from({ length: daysInMonth }, (_, i) => {
            const d = i + 1;
            let val = 0;
            if (byDay[d].total > 0) {
                val = Math.round((byDay[d].true / byDay[d].total) * 100);
            }
            return { day: d, value: val };
        });
    };

    const processWeekly = (records: any[]) => {
        const weeks = [
            { pekan: 'Pekan 1', sum: 0, total: 0 },
            { pekan: 'Pekan 2', sum: 0, total: 0 },
            { pekan: 'Pekan 3', sum: 0, total: 0 },
            { pekan: 'Pekan 4', sum: 0, total: 0 },
        ];

        records.forEach(r => {
            const d = new Date(r.tanggal).getDate();
            let wIndex = Math.floor((d - 1) / 7);
            if (wIndex > 3) wIndex = 3;

            weeks[wIndex].total += 1;
            if (r.is_done) weeks[wIndex].sum += 1;
        });

        const res = weeks.map((w, no) => ({
            no: no + 1,
            pekan: w.pekan,
            jumlah: w.total,
            capaian: w.total === 0 ? 0 : (w.sum / w.total) * 100
        }));

        if (res.every(r => r.jumlah === 0)) return [];
        return res;
    };

    const processByItem = (records: any[], dict: Record<string, string>) => {
        const itemStats: Record<string, { sum: number, total: number }> = {};
        Object.keys(dict).forEach(id => itemStats[id] = { sum: 0, total: 0 });

        records.forEach(r => {
            if (itemStats[r.kegiatan_id]) {
                itemStats[r.kegiatan_id].total += 1;
                if (r.is_done) itemStats[r.kegiatan_id].sum += 1;
            }
        });

        let grandSum = 0;
        let grandTotal = 0;
        let no = 1;
        const res: any[] = [];
        Object.keys(itemStats).forEach(id => {
            if (itemStats[id].total > 0) {
                const itemTot = itemStats[id].total;
                const itemSum = itemStats[id].sum;
                res.push({
                    no: no++,
                    aktivitas: dict[id],
                    jml: itemTot,
                    capaian: (itemSum / itemTot) * 100
                });
                grandTotal += itemTot;
                grandSum += itemSum;
            }
        });

        return {
            items: res,
            avg: grandTotal > 0 ? (grandSum / grandTotal) * 100 : 0
        };
    };

    const generatePDF = async () => {
        if (!selectedSantri || categoryReports.length === 0) return;
        showToast('Menghasilkan dokumen PDF...', 'success');

        try {
            const doc = new jsPDF();
            const year = monthYear.split('-')[0];
            const monthStr = monthNames[parseInt(monthYear.split('-')[1]) - 1];

            // Header
            doc.setFontSize(18);
            doc.setTextColor(26, 66, 103);
            doc.text('LAPORAN BULANAN KEGIATAN & PRESTASI', 105, 15, { align: 'center' });

            doc.setFontSize(10);
            doc.setTextColor(100);
            doc.text(`Periode: ${monthStr} ${year}`, 105, 22, { align: 'center' });

            // Info Table
            autoTable(doc, {
                startY: 30,
                head: [],
                body: [
                    ['Nama Santri', ':', selectedSantri.nama, 'Musyrif', ':', selectedSantri.kamars?.musyrifs?.nama || '-'],
                    ['Kelas', ':', selectedSantri.kelas_list?.nama_kelas || '-', 'Kamar', ':', selectedSantri.kamars?.nama_kamar || '-'],
                ],
                theme: 'plain',
                styles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 }, 1: { cellWidth: 5 }, 3: { fontStyle: 'bold', cellWidth: 25 }, 4: { cellWidth: 5 } }
            });

            let currentY = (doc as any).lastAutoTable.finalY + 10;

            // Visual Summary Circles in PDF
            doc.setFontSize(14);
            doc.setTextColor(26, 66, 103);
            doc.text('RINGKASAN PENCAPAIAN', 14, currentY);
            currentY += 10;

            const circleSize = 25;
            const spacing = 45;
            categoryReports.forEach((cat, idx) => {
                const x = 30 + (idx * spacing);
                const color = getProgressBarColor(cat.avg);
                const rgb = hexToRgb(color);

                // Draw circle
                doc.setDrawColor(200);
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
                doc.circle(x, currentY + circleSize / 2, circleSize / 2, 'F');

                // Circle text
                doc.setTextColor(255);
                doc.setFontSize(8);
                doc.text(cat.title, x, currentY + circleSize / 2 - 2, { align: 'center' });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${cat.avg.toFixed(1)}%`, x, currentY + circleSize / 2 + 4, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            });

            currentY += circleSize + 15;

            // Categories
            for (const catReport of categoryReports) {
                if (currentY > 240) {
                    doc.addPage();
                    currentY = 20;
                }

                doc.setFontSize(12);
                doc.setTextColor(26, 66, 103);
                doc.text(catReport.title.toUpperCase(), 14, currentY);
                doc.setFontSize(9);
                doc.text(`Rata-rata: ${catReport.avg.toFixed(1)}%`, 170, currentY);

                autoTable(doc, {
                    startY: currentY + 5,
                    head: [['No', 'Pekan', 'Jumlah Record', '% Capaian']],
                    body: catReport.weekly.map((w: any) => [w.no, w.pekan, w.jumlah, `${w.capaian.toFixed(1)}%`]),
                    headStyles: { fillColor: [26, 66, 103] },
                    styles: { fontSize: 8 }
                });

                currentY = (doc as any).lastAutoTable.finalY + 10;

                autoTable(doc, {
                    startY: currentY,
                    head: [['No', 'Aktivitas / Kegiatan', 'Total Input', '% Keberhasilan']],
                    body: catReport.items.map((i: any) => [i.no, i.aktivitas, i.jml, `${i.capaian.toFixed(1)}%`]),
                    headStyles: { fillColor: [71, 85, 105] },
                    styles: { fontSize: 8 }
                });

                currentY = (doc as any).lastAutoTable.finalY + 15;
            }

            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 285);
                doc.text(`Halaman ${i} dari ${pageCount}`, 196, 285, { align: 'right' });
            }

            doc.save(`Laporan_${selectedSantri.nama}_${monthStr}_${year}.pdf`);
            showToast('PDF Berhasil diunduh', 'success');
        } catch (err) {
            console.error(err);
            showToast('Gagal membuat PDF', 'error');
        }
    };

    const hexToRgb = (hex: string) => {
        const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
        return result ? {
            r: parseInt(result[1], 16),
            g: parseInt(result[2], 16),
            b: parseInt(result[3], 16)
        } : { r: 26, g: 66, b: 103 };
    };

    return (
        <div className="landing-page" style={{ minHeight: '100vh', background: 'var(--bg-main)' }}>
            {/* Header / Navbar */}
            <nav className="home-navbar">
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ background: 'var(--primary-color)', padding: '0.5rem', borderRadius: '10px', color: 'white' }}>
                        <LayoutDashboard size={24} />
                    </div>
                    <div style={{ textAlign: 'left' }}>
                        <h1 style={{ fontSize: '1.25rem', marginBottom: 0, fontWeight: 700 }}>Pesantren Rabbaanii</h1>
                        <p style={{ fontSize: '0.75rem', color: 'var(--text-light)', marginTop: '-2px' }}>Student Tracking System</p>
                    </div>
                </div>
                <Link to="/login" className="btn-save navbar-login" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem',
                    fontSize: '0.9rem',
                    flexShrink: 0
                }}>
                    <LogIn size={20} /> <span className="login-text">Admin Login</span>
                </Link>
            </nav>

            <main className="page-transition" style={{ padding: '1.5rem', maxWidth: '1200px', margin: '0 auto' }}>
                {/* Hero Section */}
                <section className="landing-hero" style={{ marginBottom: '3rem', paddingTop: '1.5rem' }}>
                    <h2 style={{ fontSize: '2.5rem', marginBottom: '0.75rem', color: 'var(--primary-color)', fontWeight: 800, lineHeight: 1.2 }}>Pantau Perkembangan<br />Anak Anda</h2>
                    <p style={{ fontSize: '1.1rem', color: 'var(--text-light)', maxWidth: '600px', marginBottom: '2rem', lineHeight: 1.6 }}>
                        Masukan nama santri untuk melihat laporan capaian adab, ibadah, dan kegiatan harian secara langsung melalui sistem monitoring Pesantren Rabbaanii.
                    </p>

                    <form onSubmit={handleSearch} className="search-form-responsive" style={{ margin: '0 auto', maxWidth: '600px' }}>
                        <div style={{ position: 'relative', flex: 1, minWidth: '200px' }}>
                            <Search style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-light)' }} size={20} />
                            <input
                                type="text"
                                className="form-control"
                                placeholder="Klik di sini, ketik nama santri..."
                                value={searchTerm}
                                onChange={e => setSearchTerm(e.target.value)}
                                style={{
                                    paddingLeft: '3rem',
                                    height: '52px',
                                    borderRadius: '14px',
                                    fontSize: '1rem',
                                    boxShadow: 'var(--shadow-md)',
                                    border: '1px solid #cbd5e1',
                                    backgroundColor: 'white',
                                    width: '100%'
                                }}
                            />
                        </div>
                        <button type="submit" className="btn-primary search-btn" style={{ height: '52px', padding: '0 2.5rem', borderRadius: '14px', whiteSpace: 'nowrap' }}>
                            {searching ? 'Mencari...' : 'Cari'}
                        </button>
                    </form>
                    {foundSantri.length > 0 && (
                        <div style={{
                            maxWidth: '600px',
                            margin: '1rem auto 0',
                            background: 'white',
                            borderRadius: '14px',
                            boxShadow: 'var(--shadow-lg)',
                            border: '1px solid var(--border-color)',
                            overflow: 'hidden',
                            textAlign: 'left'
                        }}>
                            {foundSantri.map(s => (
                                <button
                                    key={s.id}
                                    onClick={() => selectSantri(s)}
                                    style={{
                                        width: '100%',
                                        padding: '1rem 1.5rem',
                                        display: 'flex',
                                        justifyContent: 'space-between',
                                        alignItems: 'center',
                                        background: 'none',
                                        borderBottom: '1px solid var(--border-color)',
                                        transition: 'background 0.2s'
                                    }}
                                    onMouseEnter={(e) => e.currentTarget.style.background = '#f8fafc'}
                                    onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
                                >
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                                        <div style={{ background: 'var(--secondary-color)', padding: '0.5rem', borderRadius: '8px' }}>
                                            <User size={20} color="var(--primary-color)" />
                                        </div>
                                        <div>
                                            <span style={{ fontWeight: 600, display: 'block' }}>{s.nama}</span>
                                            <span style={{ fontSize: '0.8rem', color: 'var(--text-light)' }}>
                                                {s.kelas_list?.nama_kelas || '-'} • {s.kamars?.nama_kamar || '-'}
                                            </span>
                                        </div>
                                    </div>
                                    <ChevronRight size={18} color="var(--text-light)" />
                                </button>
                            ))}
                        </div>
                    )}
                </section>

                {/* Dashboard Results */}
                {selectedSantri && (
                    <div className="dashboard-card" style={{
                        animation: 'fadeIn 0.5s ease-out',
                        background: 'white',
                        padding: '2rem',
                        borderRadius: '24px',
                        boxShadow: 'var(--shadow-lg)',
                        border: '1px solid var(--border-color)'
                    }}>
                        <div style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'flex-start',
                            flexWrap: 'wrap',
                            gap: '1.5rem',
                            marginBottom: '2.5rem'
                        }}>
                            <div style={{ flex: 1, minWidth: '280px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '0.5rem' }}>
                                    <h3 style={{ fontSize: '1.75rem', marginBottom: 0 }}>{selectedSantri.nama}</h3>
                                    <span style={{
                                        background: 'var(--primary-color)',
                                        color: 'white',
                                        padding: '0.2rem 0.75rem',
                                        borderRadius: '20px',
                                        fontSize: '0.8rem',
                                        whiteSpace: 'nowrap'
                                    }}>SANTRI</span>
                                </div>
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem', maxWidth: '500px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                                        <GraduationCap size={18} /> <span>{selectedSantri.kelas_list?.nama_kelas || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                                        <MapPin size={18} /> <span>{selectedSantri.kamars?.nama_kamar || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                                        <User size={18} /> <span>Musyrif: {selectedSantri.kamars?.musyrifs?.nama || '-'}</span>
                                    </div>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-light)' }}>
                                        <Calendar size={18} /> <span>{monthNames[parseInt(monthYear.split('-')[1]) - 1]} {monthYear.split('-')[0]}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="action-buttons" style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                <input
                                    type="month"
                                    className="filter-select"
                                    value={monthYear}
                                    onChange={e => setMonthYear(e.target.value)}
                                    style={{ height: '42px', borderRadius: '10px', width: 'auto' }}
                                />
                                <button className="btn-primary" onClick={generatePDF} style={{ height: '42px', borderRadius: '10px', display: 'flex', alignItems: 'center', gap: '0.5rem', width: 'auto' }}>
                                    <FileText size={18} /> Download Laporan
                                </button>
                            </div>
                        </div>

                        {loading ? (
                            <div style={{ textAlign: 'center', padding: '5rem' }}>
                                <Loader className="animate-spin" size={40} />
                                <p style={{ marginTop: '1rem', color: 'var(--text-light)' }}>Memuat data pencapaian...</p>
                            </div>
                        ) : categoryReports.length === 0 ? (
                            <div style={{ textAlign: 'center', padding: '5rem', background: '#f8fafc', borderRadius: '16px' }}>
                                <LayoutDashboard size={48} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                                <p style={{ color: 'var(--text-light)' }}>Belum ada data kegiatan untuk bulan ini.</p>
                            </div>
                        ) : (
                            <div className="report-container" style={{ padding: 0, boxShadow: 'none', border: 'none' }}>
                                {/* Circles Summary Grid */}
                                <div className="report-grid-responsive" style={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                                    gap: '1.5rem',
                                    marginBottom: '3rem'
                                }}>
                                    {categoryReports.map((catReport) => (
                                        <div key={`summary-${catReport.id}`} className="summary-card-responsive" style={{
                                            background: '#f8fafc',
                                            padding: '1.5rem',
                                            borderRadius: '20px',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '1.5rem',
                                            border: '1px solid var(--border-color)'
                                        }}>
                                            <div className="chart-circle" style={{
                                                backgroundColor: getProgressBarColor(catReport.avg),
                                                width: '100px',
                                                height: '100px',
                                                flexShrink: 0
                                            }}>
                                                <span className="chart-circle-title" style={{ fontSize: '0.7rem' }}>Rata-Rata<br />{catReport.title}</span>
                                                <span className="chart-circle-value" style={{ fontSize: '1.1rem' }}>{catReport.avg.toFixed(1)}%</span>
                                            </div>
                                            <div style={{ flex: 1 }}>
                                                <h4 style={{ marginBottom: '0.25rem' }}>{catReport.title}</h4>
                                                <div style={{ fontSize: '0.85rem', color: 'var(--text-light)' }}>
                                                    {catReport.avg > 90 ? 'Sangat Memuaskan' : catReport.avg > 75 ? 'Perkembangan Baik' : 'Butuh Perhatian'}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                                {/* Charts */}
                                {categoryReports.map((catReport) => (
                                    <div key={`chart-box-${catReport.id}`} style={{
                                        marginBottom: '3rem',
                                        background: 'white',
                                        padding: '1.5rem',
                                        borderRadius: '20px',
                                        border: '1px solid var(--border-color)'
                                    }}>
                                        <h4 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                            <div style={{ width: '12px', height: '12px', borderRadius: '3px', background: catReport.chartColor }}></div>
                                            Grafik Harian {catReport.title}
                                        </h4>
                                        <div style={{ height: '200px', width: '100%' }}>
                                            <ResponsiveContainer width="100%" height="100%">
                                                <BarChart data={catReport.chart}>
                                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                                    <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: '#94a3b8' }} />
                                                    <YAxis hide domain={[0, 100]} />
                                                    <Tooltip cursor={{ fill: '#f8fafc' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: 'var(--shadow-md)' }} />
                                                    <Bar dataKey="value" fill={catReport.chartColor} radius={[4, 4, 0, 0]} />
                                                </BarChart>
                                            </ResponsiveContainer>
                                        </div>
                                    </div>
                                ))}

                                {/* Legend */}
                                <div className="legend">
                                    <div className="legend-item bg-bad">0-40% Perlu Perbaikan</div>
                                    <div className="legend-item bg-poor">41-60% Kurang</div>
                                    <div className="legend-item bg-fair">61-75% Cukup</div>
                                    <div className="legend-item bg-good">76-90% Baik</div>
                                    <div className="legend-item bg-excellent">91-100% Sangat Baik</div>
                                </div>

                                {/* Tables */}
                                <div className="progress-section" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                                    {categoryReports.map((catReport) => (
                                        <div key={`table-pecah-${catReport.id}`}>
                                            <h4 style={{ marginBottom: '1rem', color: 'var(--primary-color)', fontSize: '1.1rem' }}>Detail Capaian {catReport.title}</h4>
                                            <div className="table-responsive">
                                                <table className="progress-table" style={{ margin: 0 }}>
                                                    <thead>
                                                        <tr>
                                                            <th style={{ background: '#f8fafc', color: 'var(--text-main)', fontSize: '0.85rem' }}>Aktivitas</th>
                                                            <th style={{ background: '#f8fafc', color: 'var(--text-main)', textAlign: 'center', fontSize: '0.85rem' }}>% Capaian</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {catReport.items.map((row: any) => (
                                                            <tr key={`row-i-${row.no}`}>
                                                                <td style={{ fontSize: '0.85rem', padding: '0.75rem' }}>{row.aktivitas}</td>
                                                                <td style={{ padding: '0.5rem' }}><ProgressBar value={row.capaian} /></td>
                                                            </tr>
                                                        ))}
                                                    </tbody>
                                                </table>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </main>

            {/* Footer */}
            <footer style={{
                marginTop: '5rem',
                padding: '3rem 2rem',
                background: 'var(--primary-color)',
                color: 'rgba(255,255,255,0.8)',
                textAlign: 'center'
            }}>
                <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
                    <h3 style={{ color: 'white', marginBottom: '1rem' }}>Pesantren Rabbaanii</h3>
                    <p style={{ maxWidth: '600px', margin: '0 auto 2rem' }}>Memberikan pendidikan terbaik dengan sistem monitoring yang transparan untuk mencetak generasi Rabbani yang beradab dan berilmu.</p>
                    <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '2rem', fontSize: '0.85rem' }}>
                        © {new Date().getFullYear()} Pesantren Rabbaanii. All rights reserved.
                    </div>
                </div>
            </footer>

            {/* Toast */}
            {toast && (
                <div className={`alert-toast ${toast.type}`} style={{ zIndex: 1000 }}>
                    {toast.type === 'success' ? '✓' : '✕'} {toast.message}
                </div>
            )}
        </div>
    );
};

export default Home;
