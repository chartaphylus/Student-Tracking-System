import { Loader2 } from 'lucide-react';

interface SpinnerProps {
    size?: number;
    className?: string;
}

export function Spinner({ size = 24, className = '' }: SpinnerProps) {
    return <Loader2 size={size} className={`animate-spin text-primary ${className}`} />;
}

export function FullPageSpinner({ label = 'Memuat...' }: { label?: string }) {
    return (
        <div className="flex flex-col items-center justify-center min-h-[200px] gap-3">
            <Spinner size={36} />
            <p className="text-sm text-slate-400 font-medium">{label}</p>
        </div>
    );
}
