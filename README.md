# IbadahKu - Student Tracking System

**IbadahKu** adalah platform manajemen santri terpadu untuk **Pesantren Rabbaanii Islamic School**. Sistem ini dirancang untuk memudahkan Admin, Musyrif, dan Wali Santri dalam memantau perkembangan harian santri secara real-time.

## 🚀 Fitur Utama

### 👨‍💼 Panel Admin & Musyrif
- **Manajemen Santri**: Pengelolaan data santri lengkap berdasarkan kelas dan kamar.
- **Input Adab & Ibadah**: Pencatatan kegiatan harian santri (shalat, adab, tilaawah) secara digital.
- **Inventaris Kesehatan (UKS)**: 
    - Log Sakit (Nama santri, gejala, status kabar ortu).
    - Riwayat Obat (Pemberian obat pribadi/UKS).
    - Stok Obat UKS (Manajemen inventaris obat P3K).
- **Manajemen HP**: 
    - Log Penitipan HP (Penyimpanan resmi).
    - Log Penyitaan HP (Pelanggaran aturan asrama dengan notifikasi ke ortu).
- **Laporan Bulanan & Liburan**: Pembuatan laporan otomatis dalam format PDF.

### 🏠 Panel Wali Santri
- **Dashboard Perkembangan**: Melihat grafis prestasi ibadah ananda.
- **Riwayat Kesehatan**: Memantau status sakit dan obat yang diberikan (selama sudah dikabarkan).
- **Status HP**: Melihat status HP (dititipkan/disita) dengan pesan kebijakan asrama.
- **Profil & Keamanan**: Pengaturan mandiri kata sandi wali.

## 🛠️ Teknologi yang Digunakan

- **Core**: [React.js](https://reactjs.org/) (Vite) + [TypeScript](https://www.typescriptlang.org/)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Database**: [Supabase](https://supabase.com/) (PostgreSQL + Auth)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Charts**: [Recharts](https://recharts.org/)
- **PWA**: [vite-plugin-pwa](https://vite-pwa-org.netlify.app/) (Installable on Mobile)
- **PDF Generation**: [jsPDF](https://github.com/parallax/jsPDF) + [jspdf-autotable](https://github.com/simonbengtsson/jsPDF-AutoTable)

## 📦 Instalasi & Menjalankan Lokal

1. **Clone repositori**:
   ```bash
   git clone <repository-url>
   cd IbadahKu
   ```

2. **Instal dependensi**:
   ```bash
   npm install
   ```

3. **Konfigurasi Environment**:
   Buat file `.env` di root folder dan masukkan kredensial Supabase:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   ```

4. **Jalankan server pengembangan**:
   ```bash
   npm run dev
   ```

## 🗄️ Struktur Database (Tabel Utama)
- `santri`: Data identitas santri (NIS, Nama, Kelas, Kamar).
- `penitipan_hp`: Log penitipan perangkat elektronik secara sukarela.
- `penyitaan_hp`: Catatan pelanggaran penggunaan HP.
- `log_sakit`: Rekaman santri yang masuk UKS.
- `obat_uks`: Daftar stok obat di ruang kesehatan.
- `riwayat_obat`: Catatan pemberian obat ke santri.
- `akun_wali`: Data login untuk orang tua santri.

## 📄 Lisensi
Sistem ini bersifat internal untuk penggunaan **Pesantren Rabbaanii Islamic School**.

---
*Dikembangkan dengan ❤️ untuk kemajuan pendidikan Islam.*
