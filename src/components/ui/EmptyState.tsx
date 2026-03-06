import { LayoutGrid } from 'lucide-react';

interface EmptyStateProps {
    message?: string;
    icon?: React.ReactNode;
}

export function EmptyState({ message = 'Tidak ada data.', icon }: EmptyStateProps) {
    return (
        <div className="flex flex-col items-center justify-center py-16 gap-4 text-slate-400">
            <div className="w-16 h-16 rounded-2xl bg-slate-100 flex items-center justify-center">
                {icon ?? <LayoutGrid size={28} className="text-slate-300" />}
            </div>
            <p className="text-sm font-medium">{message}</p>
        </div>
    );
}
