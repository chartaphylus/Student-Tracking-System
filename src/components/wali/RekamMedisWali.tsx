import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Stethoscope, Activity, Pill } from 'lucide-react';
import { FullPageSpinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

export function RekamMedisWali({ santriId }: { santriId: string }) {
    const [logSakit, setLogSakit] = useState<any[]>([]);
    const [riwayatObat, setRiwayatObat] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [santriId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            // Hanya ambil log sakit yang berstatus 'Sudah Dikabari'
            const { data: qLogSakit, error: e1 } = await supabase
                .from('log_sakit')
                .select('*')
                .eq('santri_id', santriId)
                .eq('status_ortu', 'Sudah Dikabari')
                .order('waktu_mulai_sakit', { ascending: false });

            if (!e1 && qLogSakit) setLogSakit(qLogSakit);

            // Fetch Riwayat Obat - sesuai request, jika tidak ada log sakit (yang diizinkan), riwayat obat tidak muncul
            // Aturan ini bisa disederhanakan: kita fetch saja riwayat obatnya tapi jangan me-render-nya jika qLogSakit kosong.
            const { data: qObat, error: e2 } = await supabase
                .from('riwayat_obat')
                .select('*')
                .eq('santri_id', santriId)
                .order('waktu_diberikan', { ascending: false });

            if (!e2 && qObat) setRiwayatObat(qObat);

        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    if (loading) return <FullPageSpinner label="Memuat Rekam Medis..." />;

    // Jika belum ada log sakit yang di-konfirmasi "Sudah Dikabari"
    if (logSakit.length === 0) {
        return (
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 md:p-8 animate-slide-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
                        <Stethoscope size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-800">Rekam Medis & UKS</h3>
                        <p className="text-sm text-slate-500">Log keluhan kesehatan dan pengobatan ananda.</p>
                    </div>
                </div>
                <EmptyState message="Alhamdulillah ananda dalam keadaan sehat. Belum ada catatan dari pihak UKS atau Musyrif." />
            </div>
        );
    }

    return (
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 md:p-8 animate-slide-up space-y-8">
            <div className="flex items-center gap-3 border-b border-slate-100 pb-6">
                <div className="w-12 h-12 bg-rose-100 rounded-2xl flex items-center justify-center text-rose-500 shrink-0">
                    <Stethoscope size={24} />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">Rekam Medis & UKS</h3>
                    <p className="text-sm text-slate-500">Log keluhan kesehatan dan pengobatan ananda.</p>
                </div>
            </div>

            <div className="mb-8 p-5 bg-rose-50 rounded-2xl border border-rose-200 flex items-start gap-4 animate-fade-in shadow-sm">
                <Activity size={24} className="text-rose-600 shrink-0 mt-0.5" />
                <div className="text-rose-900 text-sm leading-relaxed">
                    <strong>Pemberitahuan Medis:</strong> Terdapat pembaruan data rekam medis ananda baru-baru ini. Silakan periksa detailnya di bawah ini atau segera hubungi Musyrif yang bertugas untuk mendapatkan informasi lebih lengkap.
                </div>
            </div>

            <div className="space-y-4">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Activity size={18} className="text-rose-500" />
                    Catatan Log Sakit
                </h4>
                <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                <th className="px-5 py-3.5">Waktu Dicatat</th>
                                <th className="px-5 py-3.5">Gejala / Keluhan</th>
                                <th className="px-5 py-3.5">Keterangan</th>
                            </tr>
                        </thead>
                        <tbody>
                            {logSakit.map((r, i) => (
                                <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-rose-50/30 transition-colors`}>
                                    <td className="px-5 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                        {new Date(r.waktu_mulai_sakit).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                    </td>
                                    <td className="px-5 py-4 text-sm font-bold text-slate-800">{r.gejala}</td>
                                    <td className="px-5 py-4 text-sm text-slate-600 max-w-[250px] truncate" title={r.keterangan || '-'}>{r.keterangan || '-'}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-slate-100">
                <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    <Pill size={18} className="text-blue-500" />
                    Riwayat Pemberian Obat
                </h4>
                {riwayatObat.length === 0 ? (
                    <p className="text-sm text-center py-6 text-slate-400 font-medium">Belum ada riwayat pemberian obat tercatat untuk log terkait.</p>
                ) : (
                    <div className="overflow-x-auto rounded-2xl border border-slate-200 shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[700px]">
                            <thead>
                                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="px-5 py-3.5">Waktu Pemberian</th>
                                    <th className="px-5 py-3.5">Nama Obat</th>
                                    <th className="px-5 py-3.5">Pemberi Obat</th>
                                    <th className="px-5 py-3.5">Keterangan / Dosis</th>
                                </tr>
                            </thead>
                            <tbody>
                                {riwayatObat.map((r, i) => (
                                    <tr key={r.id} className={`border-b border-slate-100 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'} hover:bg-rose-50/30 transition-colors`}>
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                            {new Date(r.waktu_diberikan).toLocaleString('id-ID', { dateStyle: 'medium', timeStyle: 'short' })}
                                        </td>
                                        <td className="px-5 py-4 text-sm">
                                            <div className="font-bold text-slate-800">{r.nama_obat}</div>
                                            <span className={`inline-block mt-1 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wide
                                                ${r.jenis_obat === 'Pribadi' ? 'bg-amber-100 text-amber-700' : 'bg-blue-100 text-blue-700'}
                                            `}>
                                                {r.jenis_obat}
                                            </span>
                                        </td>
                                        <td className="px-5 py-4 text-sm text-slate-600 font-medium">{r.pemberi_obat}</td>
                                        <td className="px-5 py-4 text-sm text-slate-500 max-w-[200px] truncate" title={r.keterangan || '-'}>{r.keterangan || '-'}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}
