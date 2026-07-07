# Product Requirements Document (PRD)

## 1. Pendahuluan
**Nama Produk:** Sistem Monitoring Lab 17
**Deskripsi:** Sistem pemantauan Komputer lab sekolah yang mendukung aktivitas belajar mengajar di Lab komputer

## 2. Latar Belakang & Masalah
Saat proses belajar mengajar di lab komputer sekolah. Sering kali guru kesulitan mengawasi proses belajar siswa karena siswa sering kali mendownload game di komputer sekolah hal ini tentu menjadi masalah utama dalam kegiatan belajar mengajar. BUkan hanya itu, biasanya siswa juga bisa mencontek saat ujian sedang berlangsung. Harapannya dengan adanya produk ini dapat membantu guru dalam proses mengajar di sekolah dan sebagai langkah pencegahan siswa mencontek.

## 3. Tujuan dan Sasaran (Goals & Objectives)
* **Real-time Monitoring:** Menyediakan informasi aktual terkait metrik kinerja (CPU, RAM, Disk) komputer laboratorium.
* **Kemudahan Instalasi:** Agent pemantau dapat dikompilasi menjadi satu *executable* (`.exe`) dan dilengkapi GUI konfigurasi awal sehingga mudah dipasang tanpa pengetahuan teknis mendalam.
* **Visibilitas Terpusat:** Server dapat melihat semua status komputer dalam satu *dashboard* web interaktif yang modern.

## 4. Target Pengguna
* **Laboran / Admin Lab/ Guru:** Memerlukan antarmuka visual untuk memonitor semua perangkat secara bersamaan.

## 5. Cakupan Fungsionalitas (Scope)
### 5.1. Agent (Client)
* Mampu mengambil metrik sistem seperti CPU usage, RAM usage, kapasitas Disk, dan status *online/offline*.
* Memiliki antarmuka grafis (GUI) sederhana saat instalasi awal untuk menentukan `Server URL`, `Nama PC`, dan `Interval Pengiriman Data`.
* Berjalan di latar belakang setelah konfigurasi selesai.
* Mampu mengirimkan laporan metrik (telemetri) secara berkala ke Server.
* Dapat didistribusikan dalam format `.exe` untuk PC Windows.
* Mendukung fitur sharing screen menggunakan aiortc
* Mampu mengirimkan aplikasi apa saja yang terinstall
* Mampu mengirimkan service apa saja yang berjalan

### 5.2. Server (Backend)
* Menyediakan REST API untuk menerima data dari agen-agen yang berjalan.
* Menyediakan REST API untuk diakses oleh Web Dashboard.
* Mengelola koneksi klien, pendaftaran PC baru, dan melacak kapan PC terakhir kali aktif (*last seen*).
* Mendukung fitur manajemen *file* / distribusi berkas (*shared files*).
* Mampu menerima sharing screen yang dikirim oleh agent dan meneruskannya ke frontend
* Memeiliki fitur untuk mengirim perintah untuk menghentikan service yang sedang berjalan
* Memiliki fitur untuk menguninstall aplikasi yang ada di agent

### 5.3. Dashboard (Frontend)
* Menampilkan daftar semua komputer lab dan statusnya (Online/Offline).
* Visualisasi grafik untuk beban CPU dan RAM (*Recharts*).
* UI/UX modern, responsif, dan memberikan *feedback* visual (Notifikasi *SweetAlert*).
* Memiliki halaman untuk memonitor seluruh layar Agent dalam satu halaman

## 6. Kebutuhan Non-Fungsional (Non-Functional Requirements)
* **Performa:** Sistem harus ringan agar Agent tidak membebani komputer laboratorium (penggunaan CPU < 2%).
* **Skalabilitas:** Server mampu menangani puluhan hingga ratusan klien secara bersamaan.
* **Portabilitas:** Agent ditargetkan untuk lingkungan Windows (dengan PyInstaller), dan Server/Dashboard bisa di-*deploy* lintas *platform* (Linux/Windows).
* **Usability:** Antarmuka *dashboard* harus intuitif (*vibe-coding* standar, *clean and clear*).
