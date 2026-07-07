# Task Tracking (Vibe-Coding Standard)

Dokumen ini merangkum semua tugas pengembangan (Epics & Stories). Centang `[x]` untuk tugas yang telah selesai, dan `[ ]` untuk yang masih harus dikerjakan.

## 🔴 Fase 1: Setup Proyek & Repositori
- [ ] Inisialisasi Git Repository.
- [ ] Pembuatan struktur folder dasar (`agent`, `server`, `dashboard`).
- [ ] Pembuatan `README.md` utama.
- [ ] Pembuatan file `.gitignore` dan `requirements.txt`.
- [x] Pembuatan Dokumentasi Inti (`PRD.MD`, `ARCHITECTURE.MD`, `TASKS.MD`).

## 🟢 Fase 2: Pengembangan Backend Server (FastAPI)
- [ ] Setup FastAPI + Uvicorn (`server/server.py` dan `server/main.py`).
- [ ] Konfigurasi *CORS Middleware*.
- [ ] Pembuatan struktur Router (`agents` & `files`).
- [ ] Inisialisasi State Manager (`store.py`) untuk data dalam memori.
- [ ] Validasi *Payload* (Pydantic models untuk request dari agen).
- [ ] Endpoint `GET /agents` untuk mengembalikan seluruh status *node*.
- [ ] Integrasi ke *Persistent Database* (SQLite/PostgreSQL) *[Opsional / Future]*.

## 🔵 Fase 3: Pengembangan Agent Client (Python)
- [ ] Skrip pengumpul metrik sistem (`collector.py`).
- [ ] Modul konfigurasi lokal membaca/menulis `config.json` (`config.py`).
- [ ] GUI Konfigurasi awal (`gui.py`).
- [ ] Main loop agen yang mengirim HTTP POST ke Server (`agent.py`).
- [ ] Setup skrip build `.exe` menggunakan PyInstaller (`agent.spec`).
- [ ] Penanganan *error* koneksi (jika server *down*, agen me-*retry* atau *backoff*).
- [ ] Menjadikan agen berjalan otomatis saat *startup* Windows.
- [ ] Membuat fitur sharing screen

## 🟡 Fase 4: Pengembangan Dashboard Web (React)
- [ ] Inisialisasi Vite + React.
- [ ] Instalasi dependensi UI (Tailwind, Lucide, Recharts, SweetAlert2).
- [ ] Desain dan implementasi antarmuka utama (Tabel list PC).
- [ ] Implementasi grafik *Real-time* untuk RAM dan CPU.
- [ ] Integrasi `axios` dengan API Server.
- [ ] Mekanisme pembaruan otomatis (Polling atau WebSockets).
- [ ] Desain state *Online / Offline* berdasarkan selisih waktu (*Last seen*).
- [ ] Implementasi halaman monitoring layar agent

## 🟣 Fase 5: Pengujian & Rilis
- [ ] Uji coba agen pada PC target sebenarnya (Windows 10/11).
- [ ] *Load testing* (mensimulasikan 30+ agen mengirim data bersamaan).
- [ ] *Build* versi *Production* untuk Frontend Dashboard.
- [ ] Dokumentasi panduan *deployment* server menggunakan Docker.
