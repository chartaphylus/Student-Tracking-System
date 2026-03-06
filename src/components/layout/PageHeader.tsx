interface PageHeaderProps {
    title: string;
    subtitle?: string;
    action?: React.ReactNode;
}

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-6">
            <div>
                <h1 className="text-xl md:text-2xl font-bold text-slate-800 leading-tight">{title}</h1>
                {subtitle && <p className="text-sm text-slate-400 mt-0.5">{subtitle}</p>}
            </div>
            {action && <div className="shrink-0 w-full sm:w-auto">{action}</div>}
        </div>
    );
}
