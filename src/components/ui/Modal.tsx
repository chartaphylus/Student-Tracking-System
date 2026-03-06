import { X } from 'lucide-react';

interface ModalProps {
    open: boolean;
    onClose: () => void;
    title?: string;
    children: React.ReactNode;
    maxWidth?: 'sm' | 'md' | 'lg' | 'xl';
}

const maxWidths = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-2xl',
};

export function Modal({ open, onClose, title, children, maxWidth = 'md' }: ModalProps) {
    if (!open) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm animate-fade-in"
            onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
        >
            <div
                className={`bg-white rounded-2xl shadow-modal w-full ${maxWidths[maxWidth]} max-h-[90vh] flex flex-col animate-slide-up`}
            >
                {title && (
                    <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                        <h2 className="text-lg font-bold text-primary">{title}</h2>
                        <button
                            onClick={onClose}
                            className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 hover:text-slate-600 transition-colors"
                        >
                            <X size={18} />
                        </button>
                    </div>
                )}
                <div className="overflow-y-auto p-6 flex-1">
                    {children}
                </div>
            </div>
        </div>
    );
}
