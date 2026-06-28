# Potobox

Potobox adalah web photobooth frontend berbasis React + Vite. Aplikasi berjalan sepenuhnya di browser untuk mengambil foto dari kamera, memilih filter, memilih frame, membuat card 1/4/6 foto, dan mengunduh hasil sebagai PNG.

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
