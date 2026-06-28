# Urbanmenphoto Go Backend

Backend awal untuk API photobooth menggunakan Go standard library.

## Start

```bash
npm run backend:dev
```

Perintah tersebut menjalankan:

```bash
cd backend && go run ./cmd/api
```

Default URL:

```text
http://localhost:8787
```

Swagger UI:

```text
http://localhost:8787/swagger
```

OpenAPI spec:

```text
http://localhost:8787/swagger/openapi.yaml
```

## Environment

```bash
BACKEND_PORT=8787
BACKEND_HOST=127.0.0.1
PUBLIC_BASE_URL=http://localhost:8787
ALLOWED_ORIGINS=http://localhost:5173,http://localhost:4173
ADMIN_TOKEN_TTL_HOURS=12
PAYMENT_WEBHOOK_SECRET=secret-webhook-key
SESSION_TTL_DAYS=7
MAX_BODY_BYTES=15728640
DATABASE_URL=
```

Admin pertama tidak ditaruh di `.env`. Buat admin lewat CLI supaya password langsung disimpan sebagai hash di database/storage:

```bash
npm run backend:admin -- -email admin@urbanmenphoto.com -role owner
```

Jika admin sudah ada dan password/role perlu direset:

```bash
npm run backend:admin -- -email admin@urbanmenphoto.com -role owner -force
```

Command tersebut akan meminta password di terminal. Setelah login sebagai owner, akun admin tambahan bisa dikelola lewat `GET/POST/PATCH/DELETE /api/admin/users`.

Login admin:

```http
POST /api/admin/auth/login
content-type: application/json

{
  "email": "admin@urbanmenphoto.com",
  "password": "change-this-strong-password"
}
```

Lalu kirim token dari response sebagai header:

```text
authorization: Bearer <admin-token>
```

Webhook payment bisa dikunci dengan:

```bash
export PAYMENT_WEBHOOK_SECRET=dev-webhook-secret
```

Lalu payment gateway/backend caller harus mengirim:

```text
x-webhook-secret: dev-webhook-secret
```

Proteksi dasar yang sudah aktif:

- Rate limit per IP untuk login admin, create payment, payment webhook, dan send link.
- Limit request body lewat `MAX_BODY_BYTES`.
- Validasi email, phone, channel, provider, currency, amount, status payment, dan mime image.
- Admin route wajib memakai bearer token hasil login email/password.
- CORS dibatasi via `ALLOWED_ORIGINS`.
- Security headers aktif.
- Admin token disimpan sebagai SHA-256 hash, bukan token mentah.
- Audit log admin/payment webhook tersimpan.
- Login lockout setelah gagal berulang.

## PostgreSQL

Backend otomatis memakai PostgreSQL jika `DATABASE_URL` terisi. Semua query PostgreSQL memakai parameter `$1`, `$2`, dan seterusnya.

Jalankan database lokal:

```bash
cd backend
docker compose up -d
```

Isi `.env`:

```bash
DATABASE_URL=postgres://urbanmen:urbanmen_dev_password@localhost:5432/urbanmenphoto?sslmode=disable
```

Lalu jalankan backend:

```bash
go run ./cmd/api
```

Schema akan dibuat otomatis dari:

```text
backend/migrations/001_initial_schema.sql
```

## Endpoints

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
GET /api/admin/audit-logs
POST /api/admin/cleanup
GET /api/admin/frames
POST /api/admin/frames
PUT /api/admin/frames/:id
DELETE /api/admin/frames/:id
```

## Data Lokal

Metadata sesi sementara:

```text
backend/data/db.json
```

File foto sementara:

```text
backend/storage/sessions/:sessionId
```

Ini sengaja untuk pondasi lokal dulu. Saat database production siap, layer `backend/internal/store` bisa diganti ke PostgreSQL. Draft schema PostgreSQL tersedia di:

```text
backend/migrations/001_initial_schema.sql
```
