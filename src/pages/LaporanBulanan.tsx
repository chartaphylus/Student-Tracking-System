import { useState, useEffect } from 'react';
import { Download, Loader, FileText } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { supabase } from '../lib/supabase';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';

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
                {value.toFixed(2)}%
            </div>
        </div>
    );
};

const monthNames = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const barColors = ['#2dbdb6', '#69d2a1', '#7b61ff', '#ff6b6b', '#ffa94d', '#74c0fc', '#f06595', '#c0eb75', '#ffd43b'];

const LaporanBulanan = () => {
    const today = new Date();
    const [monthYear, setMonthYear] = useState(`${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`);
    const [musyrif, setMusyrif] = useState('Semua');
    const [kamar, setKamar] = useState('Semua');
    const [santriId, setSantriId] = useState('');

    const [santriList, setSantriList] = useState<any[]>([]);
    const [musyrifList, setMusyrifList] = useState<any[]>([]);
    const [kamarList, setKamarList] = useState<any[]>([]);

    // Calculated State
    const [loading, setLoading] = useState(false);

    // Dynamic categories reporting
    const [categoryReports, setCategoryReports] = useState<any[]>([]);
    const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);
    const [downloading, setDownloading] = useState(false);

    const generatePDF = async () => {
        if (!activeSantri) {
            showToast('Pilih santri terlebih dahulu', 'error');
            return;
        }
        if (categoryReports.length === 0) {
            showToast('Tidak ada data kegiatan untuk bulan ini', 'error');
            return;
        }

        setDownloading(true);
        console.log('Generating PDF for:', activeSantri.nama);
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
                    ['Nama Santri', ':', activeSantri.nama, 'Musyrif', ':', activeSantri.kamars?.musyrifs?.nama || '-'],
                    ['Kelas', ':', activeSantri.kelas_list?.nama_kelas || '-', 'Kamar', ':', activeSantri.kamars?.nama_kamar || '-'],
                ],
                theme: 'plain',
                styles: { fontSize: 9 },
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 25 }, 1: { cellWidth: 5 }, 3: { fontStyle: 'bold', cellWidth: 25 }, 4: { cellWidth: 5 } }
            });

            let currentY = (doc as any).lastAutoTable.finalY + 10;

            // Ringkasan Visual di PDF
            doc.setFontSize(14);
            doc.setTextColor(26, 66, 103);
            doc.text('RINGKASAN PENCAPAIAN', 14, currentY);
            currentY += 10;

            const circleSize = 25;
            const maxPerRow = 4;
            // const totalWidth = 180; // Unused variable
            // const startX = 25; // Unused variable

            categoryReports.forEach((cat, idx) => {
                const row = Math.floor(idx / maxPerRow);
                const col = idx % maxPerRow;
                // const itemsInRow = Math.min(categoryReports.length - row * maxPerRow, maxPerRow); // Unused variable
                const rowWidth = Math.min(categoryReports.length - row * maxPerRow, maxPerRow) * 40;
                const rowStartX = (210 - rowWidth) / 2 + 20;

                const x = rowStartX + (col * 40);
                const y = currentY + (row * 35);

                const color = getProgressBarColor(cat.avg);
                const rgb = hexToRgb(color);

                // Draw circle
                doc.setDrawColor(220);
                doc.setFillColor(rgb.r, rgb.g, rgb.b);
                doc.circle(x, y + circleSize / 2, circleSize / 2, 'F');

                // Circle text
                doc.setTextColor(255);
                doc.setFontSize(7);
                doc.text(cat.title, x, y + circleSize / 2 - 2, { align: 'center', maxWidth: 20 });
                doc.setFontSize(10);
                doc.setFont('helvetica', 'bold');
                doc.text(`${cat.avg.toFixed(1)}%`, x, y + circleSize / 2 + 4, { align: 'center' });
                doc.setFont('helvetica', 'normal');
            });

            currentY += (Math.ceil(categoryReports.length / maxPerRow) * 35) + 5;

            // Categories Tables - Side-by-Side if possible
            for (let i = 0; i < categoryReports.length; i += 2) {
                const cat1 = categoryReports[i];
                const cat2 = (i + 1 < categoryReports.length) ? categoryReports[i + 1] : null;

                if (currentY > 230) {
                    doc.addPage();
                    currentY = 20;
                }

                // Row: Weekly Progress Tables
                const startYWeekly = currentY;

                // Cat 1 Weekly
                autoTable(doc, {
                    startY: startYWeekly,
                    margin: { left: 14 },
                    tableWidth: 88,
                    head: [[{ content: `${cat1.title} Berdasarkan Pekan`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Pekan', 'Jml', '%']],
                    body: cat1.weekly.map((w: any) => [w.no, w.pekan, w.jumlah, `${w.capaian.toFixed(1)}%`]),
                    styles: { fontSize: 7, cellPadding: 1 },
                    headStyles: { fillColor: [71, 85, 105] },
                    columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } }
                });

                let finalY1 = (doc as any).lastAutoTable.finalY;
                let finalY2 = finalY1;

                if (cat2) {
                    autoTable(doc, {
                        startY: startYWeekly,
                        margin: { left: 108 },
                        tableWidth: 88,
                        head: [[{ content: `${cat2.title} Berdasarkan Pekan`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Pekan', 'Jml', '%']],
                        body: cat2.weekly.map((w: any) => [w.no, w.pekan, w.jumlah, `${w.capaian.toFixed(1)}%`]),
                        styles: { fontSize: 7, cellPadding: 1 },
                        headStyles: { fillColor: [71, 85, 105] },
                        columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } }
                    });
                    finalY2 = (doc as any).lastAutoTable.finalY;
                }

                currentY = Math.max(finalY1, finalY2) + 12;

                if (currentY > 240) {
                    doc.addPage();
                    currentY = 20;
                }

                // Row: Items Detail Tables
                const startYItems = currentY;

                autoTable(doc, {
                    startY: startYItems,
                    margin: { left: 14 },
                    tableWidth: 88,
                    head: [[{ content: `% Capaian ${cat1.title}`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', 'Jml', '%']],
                    body: cat1.items.map((i: any) => [i.no, i.aktivitas.length > 30 ? i.aktivitas.substring(0, 27) + '...' : i.aktivitas, i.jml, `${i.capaian.toFixed(1)}%`]),
                    styles: { fontSize: 6.5, cellPadding: 1 },
                    headStyles: { fillColor: [71, 85, 105] },
                    columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } }
                });

                finalY1 = (doc as any).lastAutoTable.finalY;
                finalY2 = finalY1;

                if (cat2) {
                    autoTable(doc, {
                        startY: startYItems,
                        margin: { left: 108 },
                        tableWidth: 88,
                        head: [[{ content: `% Capaian ${cat2.title}`, colSpan: 4, styles: { halign: 'center', fillColor: [26, 66, 103] } }], ['No', 'Aktivitas', 'Jml', '%']],
                        body: cat2.items.map((i: any) => [i.no, i.aktivitas.length > 30 ? i.aktivitas.substring(0, 27) + '...' : i.aktivitas, i.jml, `${i.capaian.toFixed(1)}%`]),
                        styles: { fontSize: 6.5, cellPadding: 1 },
                        headStyles: { fillColor: [71, 85, 105] },
                        columnStyles: { 0: { cellWidth: 7 }, 2: { cellWidth: 10 }, 3: { cellWidth: 15 } }
                    });
                    finalY2 = (doc as any).lastAutoTable.finalY;
                }

                currentY = Math.max(finalY1, finalY2) + 15;
            }

            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.setFontSize(8);
                doc.setTextColor(150);
                doc.text(`Dicetak pada: ${new Date().toLocaleString('id-ID')}`, 14, 285);
                doc.text(`Halaman ${i} dari ${pageCount}`, 196, 285, { align: 'right' });
            }

            doc.save(`Laporan_${activeSantri.nama}_${monthStr}_${year}.pdf`);
            showToast('PDF Berhasil diunduh', 'success');
        } catch (err) {
            console.error(err);
            showToast('Gagal membuat PDF', 'error');
        } finally {
            setDownloading(false);
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

    const showToast = (message: string, type: 'success' | 'error') => {
        setToast({ message, type });
        setTimeout(() => setToast(null), 3000);
    };

    const checkAndFetchData = async () => {
        if (!santriId) return;

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
            // Fetch Categories
            const catRes = await supabase.from('kategori_kegiatan').select('*').order('created_at', { ascending: true });
            const categories = catRes.data || [];

            // Fetch Activities Reference Grouped
            const actRes = await supabase.from('kegiatan').select('id, nama_kegiatan, kategori_id');
            const activities = actRes.data || [];

            // Dictionary mapping kegiatan_id -> { nama, kategori_id }
            const actDict: Record<string, any> = {};
            activities.forEach(a => {
                actDict[a.id] = a;
            });

            // Fetch Records
            const recRes = await supabase.from('kegiatan_records').select('*')
                .eq('santri_id', santriId)
                .gte('tanggal', startStr)
                .lte('tanggal', endStr);

            const allRecords = recRes.data || [];

            // Process per category
            const reports = categories.map((cat, idx) => {
                // Filter records for this category
                const catRecords = allRecords.filter(r => actDict[r.kegiatan_id]?.kategori_id === cat.id);
                // Activities for this category
                const catActivities = activities.filter(a => a.kategori_id === cat.id);

                // Helper mapping just for this branch
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

            // only keep reports that have at least one valid item to show
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
            if (wIndex > 3) wIndex = 3; // cap at week 4

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

        Object.keys(dict).forEach(id => {
            itemStats[id] = { sum: 0, total: 0 };
        });

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

    useEffect(() => {
        fetchSantri();
    }, []);

    useEffect(() => {
        checkAndFetchData();
    }, [santriId, monthYear]);

    const fetchSantri = async () => {
        const [santriRes, musyrifRes, kamarRes] = await Promise.all([
            // Join with kelas_list and kamars to get names
            supabase.from('santri').select('id, nama, kelas_id, kamar_id, kelas_list ( nama_kelas ), kamars ( id, nama_kamar, musyrif_id, musyrifs ( nama ) )').order('nama', { ascending: true }),
            supabase.from('musyrifs').select('*').order('nama', { ascending: true }),
            supabase.from('kamars').select('*').order('nama_kamar', { ascending: true })
        ]);

        if (santriRes.data && santriRes.data.length > 0) {
            setSantriList(santriRes.data);
            setSantriId(santriRes.data[0].id);
        }
        if (musyrifRes.data) setMusyrifList(musyrifRes.data);
        if (kamarRes.data) setKamarList(kamarRes.data);
    };

    const filteredSantri = santriList.filter(s => {
        const matchKamar = kamar === 'Semua' || s.kamar_id === kamar;
        const matchMusyrif = musyrif === 'Semua' || s.kamars?.musyrif_id === musyrif;
        return matchKamar && matchMusyrif;
    });

    const activeSantri = santriList.find(s => s.id === santriId);

    return (
        <div className="page-transition">
            <h1 className="page-title" style={{ color: 'var(--text-main)', marginBottom: '1.5rem', fontSize: '1.5rem', fontWeight: 600 }}>
                Laporan Bulanan Kegiatan
            </h1>

            <div className="filters-bar" style={{ background: 'white', border: '1px solid var(--border-color)', borderRadius: '16px', marginBottom: '2rem' }}>
                <div className="filter-group">
                    <label className="filter-label">Bulan & Tahun</label>
                    <input
                        type="month"
                        className="filter-select"
                        value={monthYear}
                        onChange={e => setMonthYear(e.target.value)}
                    />
                </div>
                <div className="filter-group">
                    <label className="filter-label">Musyrif</label>
                    <select className="filter-select" value={musyrif} onChange={e => { setMusyrif(e.target.value); setKamar('Semua'); }}>
                        <option value="Semua">Semua Musyrif</option>
                        {musyrifList.map(m => (
                            <option key={m.id} value={m.id}>{m.nama}</option>
                        ))}
                    </select>
                </div>
                <div className="filter-group">
                    <label className="filter-label">Kamar</label>
                    <select className="filter-select" value={kamar} onChange={e => setKamar(e.target.value)}>
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
                    <select className="filter-select" value={santriId} onChange={e => setSantriId(e.target.value)}>
                        <option value="">Pilih santri...</option>
                        {filteredSantri.map(s => (
                            <option key={s.id} value={s.id}>{s.nama} ({s.kelas_list?.nama_kelas || '-'})</option>
                        ))}
                    </select>
                </div>
                <div className="filter-actions" style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <button
                        className="btn-save"
                        onClick={generatePDF}
                        disabled={downloading}
                        style={{ height: '42px', minWidth: '120px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        {downloading ? (
                            <Loader className="animate-spin" size={18} />
                        ) : (
                            <>
                                <FileText size={18} /> Download
                            </>
                        )}
                    </button>
                    <button
                        className="btn-secondary"
                        onClick={() => window.print()}
                        style={{ height: '42px', minWidth: '100px', whiteSpace: 'nowrap', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
                    >
                        <Download size={18} /> Print
                    </button>
                </div>
            </div>
            {loading ? (
                <div style={{ textAlign: 'center', padding: '3rem' }}>
                    <Loader className="animate-spin inline" size={32} />
                    <p>Memproses laporan bulanan...</p>
                </div>
            ) : !activeSantri ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white' }}>
                    Pilih santri terlebih dahulu
                </div>
            ) : categoryReports.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '3rem', border: '1px solid var(--border-color)', borderRadius: '8px', background: 'white' }}>
                    Belum ada rekaman di bulan ini untuk santri tersebut.
                </div>
            ) : (
                <div className="report-container">
                    <div className="report-header">
                        <h2>LAPORAN BULANAN ADAB & IBADAH</h2>
                    </div>
                    <div className="report-meta">
                        <div className="report-meta-col">
                            <div><strong>Santri:</strong> {activeSantri?.nama}</div>
                            <div><strong>Kelas:</strong> {activeSantri?.kelas_list?.nama_kelas || '-'}</div>
                            <div><strong>Kamar:</strong> {activeSantri?.kamars?.nama_kamar || '-'}</div>
                        </div>
                        <div className="report-meta-col" style={{ textAlign: 'right' }}>
                            <div><strong>Musyrif:</strong> {activeSantri?.kamars?.musyrifs?.nama || '-'}</div>
                            <div><strong>Bulan:</strong> {monthNames[parseInt(monthYear.split('-')[1]) - 1]} {monthYear.split('-')[0]}</div>    
                        </div>
                    </div>

                    {/* Dynamic Charts for each Category - Vertical Stack */}
                    <div className="report-grid-responsive" style={{ marginBottom: '3rem', gap: '3rem' }}>
                        {categoryReports.map((catReport) => (
                            <div key={`chart-${catReport.id}`} className="report-charts" style={{ border: 'none', boxShadow: 'none', padding: '1rem 0' }}>
                                <div className="chart-circle" style={{ backgroundColor: getProgressBarColor(catReport.avg) }}>
                                    <span className="chart-circle-title">Rata-Rata<br />{catReport.title}</span>
                                    <span className="chart-circle-value">{catReport.avg.toFixed(2)}%</span>
                                </div>
                                <div style={{ height: '250px', width: '100%' }}>
                                    <ResponsiveContainer width="100%" height="100%">
                                        <BarChart data={catReport.chart} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                            <XAxis dataKey="day" tick={{ fontSize: 10 }} tickLine={false} axisLine={{ stroke: '#e2e8f0' }} />
                                            <YAxis tick={{ fontSize: 10 }} tickLine={false} axisLine={false} domain={[0, 100]} />
                                            <Tooltip formatter={(v: any) => [`${v}%`]} />
                                            <Bar dataKey="value" fill={catReport.chartColor} radius={[2, 2, 0, 0]} />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Legend Caps - Centered */}
                    <div className="legend" style={{ margin: '0 auto 2.5rem', maxWidth: '600px', display: 'flex', justifyContent: 'center', backgroundColor: 'transparent', border: 'none', padding: 0 }}>
                        <div className="legend-item bg-bad" style={{ padding: '4px 8px', fontSize: '10px' }}>0 - 40% Perlu Perbaikan</div>
                        <div className="legend-item bg-poor" style={{ padding: '4px 8px', fontSize: '10px' }}>41 - 60% Kurang</div>
                        <div className="legend-item bg-fair" style={{ padding: '4px 8px', fontSize: '10px' }}>61 - 75% Cukup</div>
                        <div className="legend-item bg-good" style={{ padding: '4px 8px', fontSize: '10px' }}>76 - 90% Baik</div>
                        <div className="legend-item bg-excellent" style={{ padding: '4px 8px', fontSize: '10px' }}>91 - 100% Sangat Baik</div>
                    </div>

                    {/* Weekly Progress - side-by-side on desktop */}
                    <div className="report-grid-2col">
                        {categoryReports.map((catReport) => (
                            <div key={`weekly-${catReport.id}`}>
                                <h4 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)', fontSize: '0.95rem' }}>{catReport.title} Berdasarkan Pekan</h4>
                                <div className="table-responsive">
                                    <table className="progress-table">
                                        <thead>
                                            <tr>
                                                <th className="dark">No</th>
                                                <th className="dark">Pekan</th>
                                                <th className="dark">Jumlah</th>
                                                <th className="dark">% Capaian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catReport.weekly.map((row: any) => (
                                                <tr key={`aw-${row.no}`}>
                                                    <td>{row.no}</td>
                                                    <td>{row.pekan}</td>
                                                    <td>{row.jumlah}</td>
                                                    <td><ProgressBar value={row.capaian} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Breakdown Items - side-by-side on desktop */}
                    <div className="report-grid-2col" style={{ marginTop: '3rem' }}>
                        {categoryReports.map((catReport) => (
                            <div key={`items-${catReport.id}`}>
                                <h4 style={{ marginBottom: '1rem', textAlign: 'center', color: 'var(--text-main)', fontSize: '0.95rem' }}>% Capaian {catReport.title}</h4>
                                <div className="table-responsive">
                                    <table className="progress-table">
                                        <thead>
                                            <tr>
                                                <th className="dark">No</th>
                                                <th className="dark">Aktivitas</th>
                                                <th className="dark">Jml</th>
                                                <th className="dark">% Capaian</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {catReport.items.map((row: any) => (
                                                <tr key={`ai-${row.no}`}>
                                                    <td>{row.no}</td>
                                                    <td>{row.aktivitas}</td>
                                                    <td>{row.jml}</td>
                                                    <td><ProgressBar value={row.capaian} /></td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Bottom Disclaimer */}
                    <div style={{ marginTop: '3rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', fontSize: '0.75rem', color: '#64748b' }}>
                        <strong>Keterangan:</strong><br />
                        - <i>Aktivitas</i>: Jenis kegiatan Adab atau Ibadah yang diamati.<br />
                        - <i>Jumlah</i>: Total frekuensi aktivitas berhasil dilakukan dalam satu bulan.<br />
                        - <i>% Capaian</i>: Persentase keberhasilan setiap aktivitas dibandingkan target maksimal.
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

export default LaporanBulanan;
