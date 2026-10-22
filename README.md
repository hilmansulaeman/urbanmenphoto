# Potobox

Potobox adalah web photobooth frontend berbasis React + Vite. Aplikasi berjalan sepenuhnya di browser untuk mengambil foto dari kamera, memilih filter, memilih frame, membuat card 1/4/6 foto, dan mengunduh hasil sebagai PNG.

## DSLR tethering (Canon USB)

## Kiosk App Windows (Electron + WebUSB)

`npm run desktop:dist` membuat installer Windows **Urbanmen Photo Kiosk**. Aplikasi ini menjalankan sesi customer dalam jendela fullscreen dan memuat deployment staging Urbanmen Photo, sehingga API web tidak diarahkan ke `file://` atau backend lokal yang tidak aktif. Kamera direct WebUSB membutuhkan driver WinUSB dari Zadig; printer tetap memakai driver resmi Windows.

Saat pengembangan, jalankan backend kiosk lokal terlebih dahulu pada `127.0.0.1:8787`, lalu jalankan `npm run desktop:dev`. Untuk produksi, gunakan `npm run desktop:dist` di Windows untuk menghasilkan installer NSIS.

Untuk memakai Canon EOS lewat kabel USB, instal `gphoto2` pada komputer yang menjalankan backend (`brew install gphoto2` di macOS atau `sudo apt install gphoto2` di Debian/Ubuntu). Nyalakan kamera, hubungkan dengan kabel USB data, kemudian di Admin → Camera Device Booth klik **Refresh Kamera**, pilih **DSLR Tethering (USB)** dan pilih port Canon yang muncul. DSLR mengambil foto asli saat shutter booth ditekan; live preview browser tidak tersedia melalui tethering USB.

DSLR tidak dapat dipakai dari frontend Vercel karena server cloud tidak memiliki akses ke USB kamera. Jalankan mode kiosk di komputer booth, lalu buka `http://localhost:8787`:

```bash
npm run kiosk:start
```

Perintah ini membangun frontend dan menyajikannya dari backend lokal pada origin yang sama dengan layanan tethering.

Untuk produksi booth, jalankan frontend, backend Go, dan Hardware Agent pada mini PC yang sama. Kamera dan printer hanya berkomunikasi melalui `localhost`, sehingga tidak membutuhkan Cloudflare Tunnel atau akses internet untuk proses capture/cetak.

### Supabase Storage

Backend kiosk dapat mengunggah foto DSLR dan hasil final langsung ke Supabase Storage. Buat bucket public bernama `potobox-galleries`, lalu isi variabel berikut pada `backend/.env` di Mac booth:

```env
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_BUCKET=potobox-galleries
```

`SUPABASE_SERVICE_ROLE_KEY` hanya untuk backend lokal dan tidak boleh memakai prefix `VITE_` atau dimasukkan ke Vercel. Saat variabel tidak diisi, backend tetap memakai folder lokal sebagai fallback.

### Camera Agent untuk Windows (fase 1)

Untuk booth Canon dengan driver **WinUSB dari Zadig**, jalankan `camera-agent.exe` di PC Windows yang tersambung langsung ke DSLR. Agent menggunakan `gphoto2`/libgphoto2 dan menyediakan `GET /api/cameras` serta `POST /api/cameras/{id}/capture` secara lokal pada `127.0.0.1:8787`.

Salin `camera-agent.env.example` menjadi `camera-agent.env`, set `CAMERA_PROVIDER=gphoto2`, `CAMERA_AGENT_STORAGE=local`, dan path `gphoto2.exe`. Set `VITE_HARDWARE_AGENT_URL=http://127.0.0.1:8787` saat membangun frontend booth. Fase ini tidak membutuhkan EDSDK, digiCamControl, Cloudflare Tunnel, atau kredensial Supabase.

### Dua DSLR Canon pada satu booth

Untuk Canon 1200D dan 4000D, gunakan **DSLR lewat Camera Agent** untuk *kedua* posisi kamera. Mode **DSLR langsung (Zadig / Chrome)** hanya mendukung satu kamera aktif karena WebUSB/browser tidak menyimpan koneksi terpisah yang stabil untuk dua DSLR.

1. Sambungkan masing-masing kamera dengan kabel USB data yang berbeda (sebaiknya ke port komputer atau powered USB hub), nyalakan keduanya, dan tutup Canon EOS Utility atau aplikasi lain yang mungkin sedang mengunci kamera.
2. Pilih `CAMERA_PROVIDER=gphoto2` pada `camera-agent.env`, lalu jalankan `gphoto2 --auto-detect`. Harus muncul dua baris dengan port berbeda, misalnya `usb:001,004` dan `usb:001,005`.
3. Jalankan/restart Camera Agent. Di Admin → **Camera Device Booth**, tekan **Refresh Kamera**. Atur Posisi Kamera 1 dan 2 menjadi **DSLR lewat Camera Agent**, lalu pilih port USB yang berbeda untuk masing-masing kamera dan simpan pengaturan.

Jika `gphoto2 --auto-detect` masih hanya menampilkan satu kamera, aplikasi web belum dapat menambahkan kamera kedua. Periksa kabel/port USB, gunakan powered hub, dan pastikan kedua kamera terlihat di Device Manager sebelum membuka Camera Agent.

Alternatif agent juga mendukung gphoto2. Instal [MSYS2](https://www.msys2.org/), buka terminal **MSYS2 UCRT64**, lalu jalankan:

```bash
pacman -Syu
pacman -S mingw-w64-ucrt-x86_64-gphoto2
gphoto2 --auto-detect
```

Untuk instalasi booth lokal, gunakan `hardware-agent/` berbasis .NET. Jalankan Hardware Agent di mini PC pada `127.0.0.1:8790`, lalu set `HARDWARE_AGENT_URL=http://127.0.0.1:8790` pada backend Go. Browser kiosk cukup membuka `http://localhost:8787`; tidak ada URL Camera Agent atau Cloudflare Tunnel yang perlu diisi.

## Fitur

- Capture foto dari kamera browser.
- Switch kamera depan/belakang.
- Mode single, 4 shots, dan 6 shots.
- Filter foto: normal, black & white, vintage, warm, cool, bright, contrast.
- Frame photobooth modern, birthday, wedding, retro, fun, dan holiday.
- Download hasil PNG di sisi client.
- Modal support Saweria sebelum download.
- Tanpa backend, database, login, atau upload server.

## Development

```bash
npm install
npm run dev
```

## Backend API

Backend Go tersedia di folder `backend/` dan bisa dijalankan terpisah dari frontend:

```bash
npm run backend:dev
```

Default API berjalan di:

```text
http://localhost:8787
```

Swagger UI tersedia di:

```text
http://localhost:8787/swagger
```

Untuk endpoint admin, buat admin pertama lewat CLI. Jangan simpan email/password admin di `.env`.

```bash
npm run backend:admin -- -email admin@urbanmenphoto.com -role owner
npm run backend:dev
```

Login ke `POST /api/admin/auth/login`, lalu gunakan header:

```text
authorization: Bearer <admin-token>
```

Untuk PostgreSQL lokal:

```bash
cd backend
docker compose up -d
```

Lalu isi `DATABASE_URL` di `backend/.env`. Jika `DATABASE_URL` kosong, backend tetap memakai JSON lokal.

Endpoint utama:

```text
GET /health
GET /swagger
GET /swagger/openapi.yaml
GET /api/galleries/:sessionId
POST /api/sessions
GET /api/sessions/:id
PATCH /api/sessions/:id
POST /api/sessions/:id/finalize
POST /api/sessions/:id/send-link
POST /api/sessions/:id/expire
POST /api/payments
GET /api/payments/:id
POST /api/payments/:id/webhook
GET /api/frames
GET /api/admin/sessions
GET /api/admin/sessions/:id
GET /api/admin/stats
DELETE /api/admin/sessions/:id
POST /api/admin/auth/login
POST /api/admin/auth/logout
GET /api/admin/auth/me
GET /api/admin/users
POST /api/admin/users
PATCH /api/admin/users/:id
DELETE /api/admin/users/:id
GET /api/admin/messages
GET /api/admin/payments
GET /api/admin/payment-logs
GET /api/admin/transactions
POST /api/admin/cleanup
GET /api/admin/frames
POST /api/admin/frames
PUT /api/admin/frames/:id
DELETE /api/admin/frames/:id
```

Metadata sesi sementara disimpan di `backend/data/db.json`, sedangkan file foto di `backend/storage/`. Keduanya diabaikan oleh Git karena hanya untuk data runtime lokal. Draft schema PostgreSQL tersedia di `backend/migrations/001_initial_schema.sql`.

## Build

```bash
npm run build
```

Output production akan tersedia di folder `dist/`.

## PM2

Jalankan production preview dengan auto build setiap start/restart:

```bash
pm2 start ecosystem.config.cjs
```

Perintah PM2 tersebut menjalankan:

```bash
npm run build
npm run preview -- --host 0.0.0.0 --port 4173
```

Di Windows, jangan ubah `script` PM2 ke `src`. Gunakan `ecosystem.config.cjs` apa adanya karena file ini menjalankan `scripts/pm2-start.cjs` untuk build dan preview secara cross-platform.

Jika PM2 masih membaca entry lama seperti `src`, hapus proses lama dulu:

```bash
pm2 delete potobox
pm2 delete all
git pull origin master
npm install
pm2 start ecosystem.config.cjs
pm2 save
```

Perintah umum:

```bash
pm2 restart potobox
pm2 logs potobox
pm2 stop potobox
```

## Nginx

Contoh konfigurasi Nginx tersedia di `nginx.conf`. Arahkan `root` ke folder `dist` hasil build.
