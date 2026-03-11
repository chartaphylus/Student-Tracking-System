import { useState } from 'react';
import { KeyRound, Lock, User, MapPin, GraduationCap, Shield } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';

interface ProfilWaliProps {
    nim: string;
    santri: any;
}

export function ProfilWali({ nim, santri }: ProfilWaliProps) {
    const [passwordBaru, setPasswordBaru] = useState('');
    const [konfirmasiPassword, setKonfirmasiPassword] = useState('');
    const [submitting, setSubmitting] = useState(false);
    const { toasts, showToast, removeToast } = useToast();

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();

        if (passwordBaru.length < 5) {
            showToast('Password baru terlalu pendek, minimal 5 karakter', 'error');
            return;
        }

        if (passwordBaru !== konfirmasiPassword) {
            showToast('Konfirmasi tidak sesuai dengan password baru', 'error');
            return;
        }

        setSubmitting(true);
        const { error } = await supabase
            .from('akun_wali')
            .update({ password: passwordBaru })
            .eq('nim_id', nim);

        if (error) {
            showToast('Gagal memperbarui password: ' + error.message, 'error');
        } else {
            showToast('Password berhasil diperbarui', 'success');
            setPasswordBaru('');
            setKonfirmasiPassword('');
        }
        setSubmitting(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-6 md:p-8 animate-slide-up">
                <div className="flex items-center gap-3 mb-6">
                    <div className="w-12 h-12 bg-indigo-100 rounded-2xl flex items-center justify-center text-indigo-600 shrink-0">
                        <User size={24} />
                    </div>
                    <div>
                        <h3 className="text-xl md:text-2xl font-bold text-slate-800">Profil Wali & Santri</h3>
                        <p className="text-sm text-slate-500">Informasi detail ananda dan pengaturan akun wali.</p>
                    </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-slate-400">
                            <User size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Nama Santri</p>
                            <p className="font-bold text-slate-800">{santri?.nama || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-slate-400">
                            <GraduationCap size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kelas</p>
                            <p className="font-bold text-slate-800">{santri?.kelas_list?.nama_kelas || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-slate-400">
                            <MapPin size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Kamar Asrama</p>
                            <p className="font-bold text-slate-800">{santri?.kamars?.nama_kamar || '-'}</p>
                        </div>
                    </div>
                    <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0 text-slate-400">
                            <Shield size={20} />
                        </div>
                        <div>
                            <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Musyrif Pembina</p>
                            <p className="font-bold text-slate-800">Ustadz {santri?.kamars?.musyrifs?.nama || '-'}</p>
                        </div>
                    </div>
                </div>

                <div className="border-t border-slate-100 pt-8 mt-4">
                    <div className="flex items-center gap-3 mb-6">
                        <div className="w-10 h-10 bg-rose-50 rounded-xl flex items-center justify-center text-rose-500 shrink-0">
                            <KeyRound size={20} />
                        </div>
                        <div>
                            <h4 className="text-lg font-bold text-slate-800">Ubah Kata Sandi</h4>
                            <p className="text-sm text-slate-500">Ubah sandi login untuk NIS: <strong className="text-slate-700">{nim}</strong></p>
                        </div>
                    </div>

                    <form onSubmit={handleSave} className="max-w-xl space-y-5 bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                                <Lock size={15} className="text-slate-400" /> Password Baru
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                placeholder="Masukkan sandi baru..."
                                value={passwordBaru}
                                onChange={e => setPasswordBaru(e.target.value)}
                            />
                        </div>
                        <div>
                            <label className="text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
                                <Lock size={15} className="text-slate-400" /> Konfirmasi Password
                            </label>
                            <input
                                type="password"
                                required
                                className="w-full h-11 px-4 rounded-xl border border-slate-200 bg-white text-sm focus:outline-none focus:ring-2 focus:ring-primary/20 transition-all font-mono"
                                placeholder="Ulangi sandi baru..."
                                value={konfirmasiPassword}
                                onChange={e => setKonfirmasiPassword(e.target.value)}
                            />
                        </div>
                        <div className="pt-3">
                            <Button type="submit" loading={submitting} className="w-full sm:w-auto">
                                Simpan Password Baru
                            </Button>
                        </div>
                    </form>
                </div>
            </div>
            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
