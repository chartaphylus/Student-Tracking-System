import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Smartphone, Info, ShieldAlert, Activity, User } from 'lucide-react';
import { FullPageSpinner } from '../ui/Spinner';
import { EmptyState } from '../ui/EmptyState';

export function DataPenitipanHpWali({ santriId }: { santriId: string }) {
    const [recordsTitip, setRecordsTitip] = useState<any[]>([]);
    const [recordsSita, setRecordsSita] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        fetchData();
    }, [santriId]);

    const fetchData = async () => {
        setLoading(true);
        try {
            const [titipRes, sitaRes] = await Promise.all([
                supabase.from('penitipan_hp').select('*').eq('santri_id', santriId).order('tanggal_titip', { ascending: false }),
                supabase.from('penyitaan_hp').select('*').eq('santri_id', santriId).eq('status_ortu', 'Sudah Dikabari').order('tanggal_sita', { ascending: false })
            ]);

            if (!titipRes.error) setRecordsTitip(titipRes.data || []);
            if (!sitaRes.error) setRecordsSita(sitaRes.data || []);

        } catch (error) {
            console.error(error);
        }
        setLoading(false);
    };

    if (loading) return <FullPageSpinner label="Memuat Data Perangkat..." />;

    return (
        <div className="space-y-8 animate-slide-up">
            {/* Bagian Penitipan */}
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 md:p-8">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-blue-100 rounded-2xl flex items-center justify-center text-blue-600 shrink-0">
                        <Smartphone size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-800">Riwayat Penitipan HP</h3>
                        <p className="text-sm text-slate-500">Catatan handphone ananda yang dititipkan atau dikembalikan.</p>
                    </div>
                </div>

                <div className="mb-8 p-5 bg-amber-50 rounded-2xl border border-amber-200 flex items-start gap-4">
                    <Info size={24} className="text-amber-500 shrink-0 mt-0.5" />
                    <div className="text-amber-800 text-sm leading-relaxed">
                        <strong>Pemberitahuan:</strong> Kami sangat menyarankan agar <b>Handphone atau Barang Elektronik Berharga lainnya lebih baik disimpan di rumah saja</b> guna menjaga kefokusan ananda selama di pondok/asrama.
                    </div>
                </div>

                {recordsTitip.length === 0 ? (
                    <EmptyState message="Belum ada riwayat penitipan HP ananda." />
                ) : (
                    <div className="overflow-x-auto rounded-3xl border border-slate-100 shadow-sm">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-slate-50/50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                                    <th className="px-5 py-4">Tanggal</th>
                                    <th className="px-5 py-4">Detail Device</th>
                                    <th className="px-5 py-4">Penerima & PJ</th>
                                    <th className="px-5 py-4">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recordsTitip.map((r, i) => (
                                    <tr key={r.id} className={`border-b border-slate-50 ${i % 2 === 0 ? 'bg-white' : 'bg-slate-50/30'} hover:bg-blue-50/30 transition-colors`}>
                                        <td className="px-5 py-4 text-sm font-semibold text-slate-700 whitespace-nowrap">
                                            {r.tanggal_titip}
                                        </td>
                                        <td className="px-5 py-4 text-sm">
                                            <div className="font-bold text-slate-800">{r.merek_hp}</div>
                                            <div className="text-xs text-slate-500 mt-1">
                                                {r.tipe_hp && <span className="mr-2">Tipe: {r.tipe_hp}</span>}
                                                {r.warna && <span>Warna: {r.warna}</span>}
                                            </div>
                                        </td>
                                        <td className="px-5 py-4 text-sm">
                                            <div className="font-semibold text-slate-700 leading-tight">{r.penerima}</div>
                                            <div className="text-xs text-slate-400 mt-1 uppercase tracking-widest font-bold">PJ: {r.penanggung_jawab}</div>
                                        </td>
                                        <td className="px-5 py-4 text-sm">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${r.status === 'Dikembalikan' ? 'bg-emerald-50 text-emerald-700 border-emerald-100' : 'bg-amber-50 text-amber-700 border-amber-100'
                                                }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Bagian Penyitaan */}
            {recordsSita.length > 0 && (
                <div className="bg-white rounded-3xl border-2 border-red-100 shadow-xl p-6 md:p-8 relative overflow-hidden">
                    {/* Background Highlight */}
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-50 rounded-bl-full -z-0 opacity-50" />

                    <div className="flex items-center gap-3 mb-6 relative z-10">
                        <div className="w-12 h-12 bg-red-600 rounded-2xl flex items-center justify-center text-white shrink-0 shadow-lg shadow-red-200">
                            <ShieldAlert size={24} />
                        </div>
                        <div>
                            <h3 className="text-xl md:text-2xl font-black text-red-800 uppercase tracking-tight">Log Pelanggaran & Penyitaan</h3>
                            <p className="text-sm text-red-400 font-medium">Catatan penyitaan perangkat yang melanggar aturan asrama.</p>
                        </div>
                    </div>

                    <div className="mb-6 p-5 bg-red-50/50 rounded-2xl border border-red-100 flex items-start gap-4 relative z-10">
                        <Activity size={24} className="text-red-500 shrink-0 mt-0.5" />
                        <div className="space-y-3">
                            <div className="text-red-900 text-sm leading-relaxed">
                                <strong>Pemberitahuan:</strong> Ananda kedapatan melakukan pelanggaran terkait penggunaan perangkat di lingkungan asrama. Barang disita oleh bagian keamanan/kesantrian.
                            </div>
                            <div className="bg-white/80 p-3 rounded-xl border border-red-100 flex items-center gap-3 text-red-800 text-[11px] font-bold">
                                <User size={16} className="text-red-600" />
                                <span>Silakan hubungi Musyrif Kamar atau Bagian Kesantrian apabila ada yang ingin disampaikan terkait hal ini.</span>
                            </div>
                        </div>
                    </div>

                    <div className="overflow-x-auto rounded-3xl border border-red-50 shadow-sm relative z-10">
                        <table className="w-full text-left border-collapse min-w-[800px]">
                            <thead>
                                <tr className="bg-red-50 border-b border-red-100 text-red-600 font-bold uppercase tracking-wider text-[11px]">
                                    <th className="px-6 py-4">Waktu Sita</th>
                                    <th className="px-6 py-4">Alasan Penyitaan</th>
                                    <th className="px-6 py-4">Perangkat</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                    <th className="px-6 py-4">Petugas</th>
                                </tr>
                            </thead>
                            <tbody>
                                {recordsSita.map((r, i) => (
                                    <tr key={r.id} className={`border-b border-red-50 ${i % 2 === 0 ? 'bg-white' : 'bg-red-50/10'} hover:bg-red-50/30 transition-colors`}>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-black text-red-700 tracking-tight">{r.tanggal_sita}</div>
                                            <div className="text-[10px] text-emerald-600 font-bold mt-1 uppercase">Estimasi Kembali: {r.tanggal_kembali || '-'}</div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm text-slate-800 font-bold bg-white p-2 rounded-lg border border-red-50 italic">
                                                "{r.alasan}"
                                            </div>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-sm font-bold text-slate-700">{r.merek_hp} {r.tipe_hp}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 uppercase font-bold">{r.warna}</div>
                                        </td>
                                        <td className="px-6 py-5 text-center">
                                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest ${r.status === 'Dikembalikan' ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-100' : 'bg-red-600 text-white shadow-lg shadow-red-100'
                                                }`}>
                                                {r.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-5">
                                            <div className="text-xs font-bold text-slate-600 uppercase tracking-tight">Sita: {r.penyita}</div>
                                            <div className="text-[10px] text-slate-400 mt-1 font-medium italic">Pegang: {r.pemegang}</div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}
        </div>
    );
}
