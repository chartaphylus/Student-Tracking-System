import { useState } from 'react';
import { KeyRound, Lock } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { Button } from '../ui/Button';
import { useToast } from '../../hooks/useToast';
import { ToastContainer } from '../ui/Toast';

interface PengaturanAkunProps {
    nim: string;
}

export function PengaturanAkun({ nim }: PengaturanAkunProps) {
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
            .eq('nim', nim);

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
        <div className="bg-white rounded-3xl border border-slate-200 shadow-card p-5 md:p-7 animate-slide-up">
            <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 bg-primary/10 rounded-2xl flex items-center justify-center text-primary shrink-0">
                    <KeyRound size={24} />
                </div>
                <div>
                    <h3 className="text-xl md:text-2xl font-bold text-slate-800">Ubah Password</h3>
                    <p className="text-sm text-slate-500">Ubah kata sandi akun wali untuk keamanan (NIS: {nim})</p>
                </div>
            </div>

            <form onSubmit={handleSave} className="max-w-xl space-y-5 bg-slate-50/50 p-6 md:p-8 rounded-3xl border border-slate-100 shadow-inner">
                <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
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
                    <label className="block text-sm font-medium text-slate-700 mb-1.5 flex items-center gap-2">
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
                    <Button type="submit" loading={submitting} fullWidth>
                        Simpan Password
                    </Button>
                </div>
            </form>

            <ToastContainer toasts={toasts} onClose={removeToast} />
        </div>
    );
}
