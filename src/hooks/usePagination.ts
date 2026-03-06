import { useState, useMemo } from 'react';

export function usePagination<T>(items: T[], itemsPerPage = 10) {
    const [currentPage, setCurrentPage] = useState(1);

    const totalPages = Math.max(1, Math.ceil(items.length / itemsPerPage));

    const paginatedItems = useMemo(() => {
        const start = (currentPage - 1) * itemsPerPage;
        return items.slice(start, start + itemsPerPage);
    }, [items, currentPage, itemsPerPage]);

    const goToPage = (page: number) => {
        setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    };

    const reset = () => setCurrentPage(1);

    return {
        currentPage,
        totalPages,
        totalItems: items.length,
        paginatedItems,
        goToPage,
        reset,
    };
}
