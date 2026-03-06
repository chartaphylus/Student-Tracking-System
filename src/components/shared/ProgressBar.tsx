interface ProgressBarProps {
    value: number; // 0–100
    showLabel?: boolean;
    height?: string;
}

function getColor(v: number) {
    if (v >= 91) return 'bg-emerald-500';
    if (v >= 76) return 'bg-blue-500';
    if (v >= 61) return 'bg-amber-400';
    if (v >= 41) return 'bg-orange-400';
    return 'bg-red-400';
}

function getTextColor(v: number) {
    if (v >= 91) return 'text-emerald-700 bg-emerald-50';
    if (v >= 76) return 'text-blue-700 bg-blue-50';
    if (v >= 61) return 'text-amber-700 bg-amber-50';
    if (v >= 41) return 'text-orange-700 bg-orange-50';
    return 'text-red-700 bg-red-50';
}

export function ProgressBar({ value, showLabel = true, height = 'h-2' }: ProgressBarProps) {
    const clamped = Math.min(100, Math.max(0, value));
    return (
        <div className="flex items-center gap-2">
            <div className={`flex-1 bg-slate-100 rounded-full overflow-hidden ${height}`}>
                <div
                    className={`h-full rounded-full transition-all duration-500 ${getColor(clamped)}`}
                    style={{ width: `${clamped}%` }}
                />
            </div>
            {showLabel && (
                <span className={`text-xs font-semibold px-1.5 py-0.5 rounded-md min-w-[44px] text-center shrink-0 ${getTextColor(clamped)}`}>
                    {clamped.toFixed(0)}%
                </span>
            )}
        </div>
    );
}

// Circle variant (for summary cards / laporan)
export function ProgressCircle({ value, label, size = 88 }: { value: number; label: string; size?: number }) {
    const clamped = Math.min(100, Math.max(0, value));
    const r = 28;
    const circ = 2 * Math.PI * r;
    const offset = circ - (clamped / 100) * circ;

    return (
        <div className="flex flex-col items-center gap-1">
            <div className="relative" style={{ width: size, height: size }}>
                <svg viewBox="0 0 64 64" style={{ width: size, height: size }}>
                    <circle cx="32" cy="32" r={r} fill="none" stroke="#e2e8f0" strokeWidth="6" />
                    <circle
                        cx="32" cy="32" r={r}
                        fill="none"
                        stroke={clamped >= 91 ? '#10b981' : clamped >= 76 ? '#3b82f6' : clamped >= 61 ? '#f59e0b' : clamped >= 41 ? '#f97316' : '#ef4444'}
                        strokeWidth="6"
                        strokeDasharray={circ}
                        strokeDashoffset={offset}
                        strokeLinecap="round"
                        transform="rotate(-90 32 32)"
                    />
                </svg>
                <div className="absolute inset-0 flex items-center justify-center">
                    <span className="text-sm font-bold text-slate-700">{clamped.toFixed(0)}%</span>
                </div>
            </div>
            <span className="text-xs font-medium text-slate-500 text-center leading-tight">{label}</span>
        </div>
    );
}
