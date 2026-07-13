# CI/CD

Repository ini memakai GitHub Actions untuk validasi dan deploy ke Vercel.

## Workflow

- `CI`: jalan saat `pull_request` dan push ke `dev`, `staging`, atau `main`.
- `Deploy`: jalan saat push ke `dev`, `staging`, atau `main`, dan bisa dijalankan manual dari tab Actions.

## Branch Mapping

- `dev`: deploy frontend ke project `photo-box-dev` dengan `VITE_PAYMENT_MODE=dummy`.
- `staging` atau `main`: deploy backend ke `urbanmenphoto-backend-staging`, lalu deploy frontend ke `photo-box-staging`.

## GitHub Secrets

Isi secrets ini di GitHub repository settings:

| Secret | Value |
| --- | --- |
| `VERCEL_TOKEN` | Token dari Vercel account |
| `VERCEL_ORG_ID` | `team_X1ahv31ssj1feDNJbRoUFpc1` |
| `VERCEL_FRONTEND_DEV_PROJECT_ID` | `prj_FVhH9hyD2mjuvDZjpzGd8X81fzeY` |
| `VERCEL_FRONTEND_STAGING_PROJECT_ID` | `prj_7d3gZ1ub9HwavH8jRW7IJJQvoQIS` |
| `VERCEL_BACKEND_STAGING_PROJECT_ID` | `prj_uS01x6FawdpZj6hAEfQhlIIDjihD` |

## Catatan Env

Env rahasia seperti `DATABASE_URL`, SMTP, Midtrans server key, dan Midtrans client key tetap diatur di Vercel project masing-masing. Workflow hanya memilih project dan menjalankan deploy.
