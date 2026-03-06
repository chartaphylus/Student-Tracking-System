import { Loader2 } from 'lucide-react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    variant?: 'primary' | 'secondary' | 'danger' | 'ghost' | 'outline';
    size?: 'sm' | 'md' | 'lg';
    loading?: boolean;
    icon?: React.ReactNode;
    fullWidth?: boolean;
}

const variants = {
    primary: 'bg-primary text-white hover:bg-primary-hover shadow-sm hover:shadow active:scale-95',
    secondary: 'bg-white text-primary border border-primary/20 hover:bg-primary-light hover:border-primary/40',
    danger: 'bg-danger text-white hover:bg-danger-hover shadow-sm hover:shadow active:scale-95',
    ghost: 'bg-transparent text-slate-600 hover:bg-slate-100',
    outline: 'bg-transparent border border-slate-200 text-slate-700 hover:bg-slate-50',
};

const sizes = {
    sm: 'h-8 px-3 text-sm gap-1.5 rounded-lg',
    md: 'h-10 px-4 text-sm gap-2 rounded-xl',
    lg: 'h-11 px-6 text-base gap-2 rounded-xl',
};

export function Button({
    variant = 'primary',
    size = 'md',
    loading = false,
    icon,
    fullWidth = false,
    children,
    disabled,
    className = '',
    ...props
}: ButtonProps) {
    return (
        <button
            disabled={disabled || loading}
            className={[
                'inline-flex items-center justify-center font-medium transition-all duration-200',
                'focus:outline-none focus:ring-2 focus:ring-primary/30',
                'disabled:opacity-50 disabled:cursor-not-allowed disabled:active:scale-100',
                variants[variant],
                sizes[size],
                fullWidth ? 'w-full' : '',
                className,
            ].join(' ')}
            {...props}
        >
            {loading ? (
                <Loader2 size={16} className="animate-spin shrink-0" />
            ) : icon ? (
                <span className="shrink-0">{icon}</span>
            ) : null}
            {children}
        </button>
    );
}
