// ─── Supabase / Database Types ───────────────────────────────────────

export interface Santri {
    id: string;
    nama: string;
    kelas_list?: { id: string; nama_kelas: string };
    kamars?: { id: string; nama_kamar: string; musyrifs?: { nama: string } };
}

export interface Musyrif {
    id: string;
    nama: string;
}

export interface Kamar {
    id: string;
    nama_kamar: string;
    musyrif_id?: string;
    musyrifs?: { nama: string };
}

export interface Kelas {
    id: string;
    nama_kelas: string;
}

export interface KategoriKegiatan {
    id: string;
    nama_kategori: string;
}

export interface Kegiatan {
    id: string;
    nama_kegiatan: string;
    kategori_id: string;
    kategori_kegiatan?: { nama_kategori: string };
}

export interface KegiatanRecord {
    id: string;
    santri_id: string;
    kegiatan_id: string;
    tanggal: string;
    nilai: number;
    santris?: Pick<Santri, 'id' | 'nama'>;
    kegiatans?: Kegiatan;
}

// ─── UI Types ──────────────────────────────────────────────────────────

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

export interface PaginationState {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    itemsPerPage: number;
}

// ─── Report Types ──────────────────────────────────────────────────────

export interface ReportItem {
    no: number;
    aktivitas: string;
    capaian: number;
}

export interface CategoryReport {
    id: string;
    title: string;
    avg: number;
    chartColor: string;
    chart: Array<{ day: string; value: number }>;
    items: ReportItem[];
}
