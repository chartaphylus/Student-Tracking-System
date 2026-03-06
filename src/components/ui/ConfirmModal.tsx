import { AlertTriangle } from 'lucide-react';
import { Button } from './Button';
import { Modal } from './Modal';

interface ConfirmModalProps {
    open: boolean;
    onClose: () => void;
    onConfirm: () => void;
    title?: string;
    message: string;
    confirmLabel?: string;
    loading?: boolean;
}

export function ConfirmModal({
    open,
    onClose,
    onConfirm,
    title = 'Konfirmasi Hapus',
    message,
    confirmLabel = 'Ya, Hapus',
    loading = false,
}: ConfirmModalProps) {
    return (
        <Modal open={open} onClose={onClose} maxWidth="sm">
            <div className="flex flex-col items-center gap-4 text-center py-2">
                <div className="w-14 h-14 rounded-full bg-danger/10 flex items-center justify-center">
                    <AlertTriangle size={28} className="text-danger" />
                </div>
                <h3 className="text-lg font-bold text-slate-800">{title}</h3>
                <p className="text-slate-500 text-sm leading-relaxed">{message}</p>
                <div className="flex gap-3 w-full pt-2">
                    <Button variant="outline" fullWidth onClick={onClose} disabled={loading}>
                        Batal
                    </Button>
                    <Button variant="danger" fullWidth onClick={onConfirm} loading={loading}>
                        {confirmLabel}
                    </Button>
                </div>
            </div>
        </Modal>
    );
}
