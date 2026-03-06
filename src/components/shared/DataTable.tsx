interface DataTableProps {
    children: React.ReactNode;
    className?: string;
}

// Wrapper with horizontal scroll — fixes "table terpotong" on mobile
export function DataTable({ children, className = '' }: DataTableProps) {
    return (
        <div className={`w-full overflow-x-auto rounded-xl border border-slate-200 bg-white ${className}`}>
            <table className="min-w-full text-sm text-left">
                {children}
            </table>
        </div>
    );
}

export function Th({ children, className = '', ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
    return (
        <th
            className={`px-4 py-3 text-xs font-semibold text-primary bg-slate-50 border-b border-slate-200 whitespace-nowrap ${className}`}
            {...props}
        >
            {children}
        </th>
    );
}

export function Td({ children, className = '', ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
    return (
        <td
            className={`px-4 py-3 text-slate-700 border-b border-slate-50 last:border-b-0 ${className}`}
            {...props}
        >
            {children}
        </td>
    );
}

export function Tr({ children, className = '', ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
    return (
        <tr
            className={`hover:bg-slate-50/80 transition-colors ${className}`}
            {...props}
        >
            {children}
        </tr>
    );
}
