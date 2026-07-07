# Task Tracking (Vibe-Coding Standard)

Dokumen ini merangkum semua tugas pengembangan (Epics & Stories). Centang `[x]` untuk tugas yang telah selesai, dan `[ ]` untuk yang masih harus dikerjakan.

## 🔴 Fase 1: Setup Proyek & Repositori
- [x] Inisialisasi Git Repository.
- [x] Pembuatan struktur folder dasar (`agent`, `server`, `dashboard`).
- [x] Pembuatan `README.md` utama.
- [x] Pembuatan file `.gitignore` dan `requirements.txt`.
- [x] Pembuatan Dokumentasi Inti (`PRD.MD`, `ARCHITECTURE.MD`, `TASKS.MD`).

## 🟢 Fase 2: Pengembangan Backend Server (FastAPI)
- [x] Setup FastAPI + Uvicorn (`server/server.py` dan `server/main.py`).
- [x] Konfigurasi *CORS Middleware*.
- [x] Pembuatan struktur Router (`agents` & `files`).
- [x] Inisialisasi State Manager (`store.py`) untuk data dalam memori.
- [x] Validasi *Payload* (Pydantic models untuk request dari agen).
- [x] Endpoint `GET /agents` untuk mengembalikan seluruh status *node*.
- [x] Implementasi manajemen *shared files* (upload, download, delete) via `/files`.
- [x] Implementasi *command channel* (`/commands`) — kirim perintah ke agent via WebSocket.
- [x] Endpoint `POST /commands/stop-service` untuk menghentikan service di agent.
- [x] Endpoint `POST /commands/uninstall-app` untuk menguninstall aplikasi di agent.
- [ ] Integrasi ke *Persistent Database* (SQLite/PostgreSQL) *[Opsional / Future]*.

## 🔵 Fase 3: Pengembangan Agent Client (Python)
- [x] Skrip pengumpul metrik sistem (`collector.py`).
- [x] Modul konfigurasi lokal membaca/menulis `config.json` (`config.py`).
- [x] GUI Konfigurasi awal (`gui.py`).
- [x] Main loop agen yang mengirim HTTP POST ke Server (`agent.py`).
- [x] Setup skrip build `.exe` menggunakan PyInstaller (`agent.spec`).
- [x] Penanganan *error* koneksi (jika server *down*, agen me-*retry* atau *backoff*).
- [x] Menjadikan agen berjalan otomatis saat *startup* Windows.
- [x] Membuat fitur sharing screen.
- [x] Enumerasi aplikasi terinstall (Windows registry, cache 60 detik).
- [x] Enumerasi service/proses yang berjalan (`psutil`).
- [x] Command handler — menerima & menjalankan perintah dari server (`command_handler.py`).

## 🟡 Fase 4: Pengembangan Dashboard Web (React)
- [x] Inisialisasi Vite + React.
- [x] Instalasi dependensi UI (Tailwind, Lucide, Recharts, SweetAlert2).
- [x] Desain dan implementasi antarmuka utama (Tabel list PC).
- [x] Implementasi grafik *Real-time* untuk RAM dan CPU (Recharts sparkline).
- [x] Integrasi `axios` dengan API Server.
- [x] Mekanisme pembaruan otomatis (Polling atau WebSockets).
- [x] Desain state *Online / Offline* berdasarkan selisih waktu (*Last seen*).
- [x] Implementasi halaman monitoring layar agent.
- [x] Tampilan daftar apps terinstall & services pada detail agent (tabel + filter).
- [x] Halaman *Multi-Screen Monitor* — melihat semua layar agent sekaligus.

## 🟣 Fase 5: Pengujian & Rilis
- [ ] Uji coba agen pada PC target sebenarnya (Windows 10/11).
- [ ] *Load testing* (mensimulasikan 30+ agen mengirim data bersamaan).
- [x] *Build* versi *Production* untuk Frontend Dashboard.
- [x] Dokumentasi panduan *deployment* server menggunakan Docker.
