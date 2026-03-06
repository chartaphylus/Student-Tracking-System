import { CheckCircle, XCircle, AlertCircle, Info, X } from 'lucide-react';
import type { ToastType } from '../../types';

interface ToastItemProps {
    id: string;
    message: string;
    type: ToastType;
    onClose: (id: string) => void;
}

const configs: Record<ToastType, { icon: React.ReactNode; classes: string }> = {
    success: { icon: <CheckCircle size={18} />, classes: 'bg-success text-white' },
    error: { icon: <XCircle size={18} />, classes: 'bg-danger text-white' },
    warning: { icon: <AlertCircle size={18} />, classes: 'bg-warning text-white' },
    info: { icon: <Info size={18} />, classes: 'bg-primary text-white' },
};

function ToastItem({ id, message, type, onClose }: ToastItemProps) {
    const { icon, classes } = configs[type];
    return (
        <div className={`flex items-center gap-3 px-4 py-3 rounded-xl shadow-card min-w-[260px] max-w-sm animate-slide-up ${classes}`}>
            <span className="shrink-0">{icon}</span>
            <span className="text-sm font-medium flex-1">{message}</span>
            <button onClick={() => onClose(id)} className="shrink-0 opacity-80 hover:opacity-100 transition-opacity">
                <X size={16} />
            </button>
        </div>
    );
}

interface ToastContainerProps {
    toasts: { id: string; message: string; type: ToastType }[];
    onClose: (id: string) => void;
}

export function ToastContainer({ toasts, onClose }: ToastContainerProps) {
    return (
        <div className="fixed bottom-20 right-4 left-4 sm:left-auto z-[9999] flex flex-col gap-2 items-end">
            {toasts.map(t => (
                <ToastItem key={t.id} {...t} onClose={onClose} />
            ))}
        </div>
    );
}
