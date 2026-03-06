interface PaginationProps {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
    onPageChange: (page: number) => void;
}

export function Pagination({ currentPage, totalPages, totalItems, itemsPerPage, onPageChange }: PaginationProps) {
    if (totalPages <= 1) return null;

    const start = (currentPage - 1) * itemsPerPage + 1;
    const end = Math.min(currentPage * itemsPerPage, totalItems);

    // Build page number array
    const pages: (number | '...')[] = [];
    const maxVisible = 5;
    let rangeStart = Math.max(1, currentPage - Math.floor(maxVisible / 2));
    let rangeEnd = Math.min(totalPages, rangeStart + maxVisible - 1);
    if (rangeEnd - rangeStart + 1 < maxVisible) rangeStart = Math.max(1, rangeEnd - maxVisible + 1);

    if (rangeStart > 1) { pages.push(1); if (rangeStart > 2) pages.push('...'); }
    for (let i = rangeStart; i <= rangeEnd; i++) pages.push(i);
    if (rangeEnd < totalPages) { if (rangeEnd < totalPages - 1) pages.push('...'); pages.push(totalPages); }

    return (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-slate-100">
            <p className="text-xs text-slate-400 font-medium">
                Menampilkan <span className="font-semibold text-slate-600">{start}–{end}</span> dari <span className="font-semibold text-slate-600">{totalItems}</span> data
            </p>
            <div className="flex items-center gap-1">
                <PageBtn onClick={() => onPageChange(currentPage - 1)} disabled={currentPage === 1}>‹</PageBtn>
                {pages.map((p, i) =>
                    p === '...' ? (
                        <span key={`dots-${i}`} className="w-8 text-center text-slate-400 text-sm">…</span>
                    ) : (
                        <PageBtn key={p} active={p === currentPage} onClick={() => onPageChange(p as number)}>
                            {p}
                        </PageBtn>
                    )
                )}
                <PageBtn onClick={() => onPageChange(currentPage + 1)} disabled={currentPage === totalPages}>›</PageBtn>
            </div>
        </div>
    );
}

function PageBtn({ children, active, disabled, onClick }: {
    children: React.ReactNode;
    active?: boolean;
    disabled?: boolean;
    onClick: () => void;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            className={[
                'w-8 h-8 rounded-lg text-sm font-medium transition-all',
                active
                    ? 'bg-primary text-white shadow-sm'
                    : 'text-slate-600 hover:bg-slate-100 disabled:opacity-30 disabled:cursor-not-allowed',
            ].join(' ')}
        >
            {children}
        </button>
    );
}
