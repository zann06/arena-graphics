# Phase 6 — Template Studio & Assets (Report)

Tanggal: 2026-11-02
Status: **Selesai & terverifikasi end-to-end (upload aset, edit template, tema tampil di overlay on air).**

## 1. Fitur yang dibangun

### 1.1 Asset library (backend)
- Upload multipart dengan `@fastify/multipart` (`POST /api/assets/upload`).
- **Validasi tipe**: allow-list MIME `image/png`, `image/jpeg`, `image/webp`, `image/gif`,
  `image/svg+xml` (selain itu → HTTP 415).
- **Batas ukuran**: 8 MB, ditegakkan saat membaca stream + `limits` plugin (413).
- **Validasi dimensi**: pembacaan header PNG / JPEG / WebP / GIF tanpa dependensi eksternal
  (`readImageDimensions` / `parseImageDimensions`). SVG dilewati (berbasis teks).
- **Keamanan path**: nama file dibuat server-side (`<timestamp>-<uuid>.<ext>`), bukan nama
  klien; `deleteAssetFile` menolak nama yang mengandung `/`, `\`, atau `..`.
- Penyimpanan di `<dataDir>/assets/<kind>/`, disajikan read-only di `/uploads/*`.
  `dataDir` = `ARENA_DATA_DIR` (env) atau `<workspace>/data`. Root workspace dideteksi dengan
  menelusuri ke atas sampai menemukan `pnpm-workspace.yaml` (stabil untuk mode `src` tsx
  maupun bundle `dist`).
- Kategori: `teams`, `players`, `heroes`, `sponsors`, `backgrounds`.

### 1.2 Template persistence & tema (backend)
- Tabel `graphicsTemplates` diberi kolom `isActive` (migrasi idempoten
  `2026-11-02_template_active_flag`). Satu template aktif per `templateType`.
- Baris `graphicsTemplates`: `name`, `templateType`, `configurationJson` (theme), `isActive`.
- Seed otomatis di boot: satu template default per tipe jika tabel kosong.
- Tema = `TemplateTheme`: `accentColor`, `panelColor`, `textColor`, `displayFont`,
  `scale` (0.8–1.2), `radius` (0–64), `showAccentBar` — divalidasi Zod di route.
- `activeThemeMap()` memetakan `GraphicKey → Theme`; dimuat ke `state.payload.themes` dan
  di-broadcast ulang setiap ada perubahan template (`reloadThemes()`), sehingga overlay
  langsung memakai tema baru tanpa reload halaman.

### 1.3 REST API
| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/assets?kind=` | Daftar aset (terbaru dulu) |
| POST | `/api/assets/upload` | Upload (field `file` + `kind`) |
| DELETE | `/api/assets/:id` | Hapus baris + file |
| GET | `/uploads/<kind>/<file>` | Serve file statis |
| GET | `/api/templates` | Daftar template |
| GET | `/api/templates/:id` | Detail template |
| POST | `/api/templates` | Buat template |
| PUT | `/api/templates/:id` | Update nama/theme |
| POST | `/api/templates/:id/activate` | Aktifkan (menonaktifkan tipe sama) |
| POST | `/api/templates/:id/duplicate` | Duplikat (non-aktif) |
| POST | `/api/templates/:id/reset` | Reset theme ke default |
| DELETE | `/api/templates/:id` | Hapus template |

Health: `phase: 6`, `capabilities` mencakup `templates` dan `assets`.

### 1.4 UI — Asset Library (`/dashboard/assets`)
- Tab kategori (Team Logos / Player Photos / Hero Portraits / Sponsors / Backgrounds).
- Kartu upload drag-and-drop + tombol pilih file; batas 8 MB ditampilkan.
- Grid aset dengan preview (checkerboard untuk transparansi), nama, dimensi, ukuran, tombol Delete.

### 1.5 UI — Template Studio (`/dashboard/templates`)
- Daftar template (badge ACTIVE untuk yang on air), pilih untuk diedit.
- Editor: nama, warna Accent/Panel/Text (color picker + hex), Display Font
  (Barlow Condensed / Inter / Oswald / Rajdhani / Teko), Scale slider, Corner Radius slider,
  toggle accent bar.
- Tombol: Save changes, Set active on air, Duplicate, Reset theme, Delete (disabled saat aktif).
- **Live Overlay Preview**: iframe yang memuat overlay on air sesungguhnya
  (`/overlay/<kind>?preview=1`), sehingga preview = yang tampil di OBS.
- Buat template baru per tipe dari dropdown + tombol New.
- Nav sidebar baru: **Asset Library** dan **Template Studio**.

### 1.6 Tema diterapkan di overlay (`graphics.tsx`, `theme.ts`)
- Semua graphic (scoreboard, player intro, team intro, draft, statistics, MVP, fullscreen)
  menerima prop `theme` dari `state.payload.themes[key]`.
- `resolveTheme()` menggabungkan tema tersimpan dengan default bila belum ada, dan menurunkan
  nilai turunan (gradien panel, warna teks transparan, alpha accent).
- Accent menggerakkan pill "Game N", border atas panel statistik, aksen fullscreen, badge level,
  dan warna label; `panelColor` menggerakkan latar; `textColor` menggerakkan teks; `displayFont`
  mengganti `--font-display` (memuat Google Fonts sesuai pilihan); `scale` memperbesar/mengecilkan
  graphic; `radius` membulatkan sudut panel.
- Ketika tema = default, tampilan identik dengan Phase 4/5 (regresi visual aman).

## 2. File utama
- `packages/shared/src/types/templates.ts` — tipe aset + `TemplateTheme` + default/fonts.
- `packages/shared/src/types/realtime.ts` — `themes?` pada `MatchStatePayload`.
- `apps/server/src/services/assets.ts` — penyimpanan, MIME allow-list, parser dimensi.
- `apps/server/src/services/templates.ts` — CRUD, activate/duplicate/reset, `activeThemeMap`, seed.
- `apps/server/src/routes/assets.ts`, `routes/templates.ts` — handler REST.
- `apps/server/src/db/schema.ts`, `db/migrate.ts` — `assets` table, `isActive`, migrasi.
- `apps/server/src/config/env.ts` — `ARENA_DATA_DIR`.
- `apps/server/src/realtime/state.ts` — `reloadThemes()`.
- `apps/server/src/index.ts` — multipart, route, mount `/uploads`, seed + reload saat boot.
- `apps/web/src/hooks/api/useAssets.ts`, `useTemplates.ts` — hooks React Query.
- `apps/web/src/pages/AssetsPage.tsx`, `pages/TemplateStudioPage.tsx`.
- `apps/web/src/overlay/theme.ts`, `overlay/graphics.tsx`, `overlay/OverlayApp.tsx`.
- `apps/web/src/App.tsx` — route + nav.
- `scripts/phase6-smoke.mjs`, `scripts/verify-template-theme.mjs` — pengujian.

## 3. Testing & hasil

| Uji | Perintah | Hasil |
|---|---|---|
| Smoke Template + Asset | `node scripts/phase6-smoke.mjs` | **17/17 PASS** (seed 7 tipe, aktivasi tunggal, validasi warna 400, update, activate, theme sampai ke state socket, duplicate, reset, delete; upload PNG 1×1 + dimensi, serve `/uploads` byte-identik, miss `/uploads`→404 non-HTML, list, MIME 415, kind 400, delete) |
| Tema di overlay | `node scripts/verify-template-theme.mjs` | **PASS** — accent `#ff0ea0` & font `Oswald` sampai ke state overlay; capture 1920×1080 tema vs default berbeda (`overlay-scoreboard-themed.png` vs `overlay-scoreboard-default.png`) |
| Regresi Phase 3 | `node scripts/graphics-smoke.mjs` | ALL CHECKS PASSED (reconnect recover) |
| Regresi Phase 4 | `node scripts/mlbb-smoke.mjs` | ALL CHECKS PASSED |
| Overlay on air | `node scripts/verify-overlays.mjs` | ALL OVERLAYS CAPTURED (draft/statistics/mvp 1920×1080) |
| OBS (mock) | `pnpm test:obs` | ALL OBS ADAPTER CHECKS PASSED |
| UI | `node scripts/ui-screenshots.mjs` | `ui-assets.png`, `ui-template-studio.png`, dll. PASS |
| Typecheck/Build | `pnpm --filter @arena/{shared,server,web} typecheck/build` | bersih / sukses |

Bukti visual: `artifacts/overlay-scoreboard-themed.png` menampilkan pill "GAME 1" magenta,
panel burgundy gelap, dan font Oswald; `artifacts/ui-template-studio.png` menampilkan preview
iframe overlay on air; `artifacts/ui-assets.png` menampilkan logo ter-upload di grid.

## 4. Batasan & catatan
1. `/uploads/*` dilayani dari direktori data; direktori dibuat saat boot (`ensureAssetsRoot`)
   agar static plugin tidak gagal pada instalasi baru.
2. Preview Template Studio menampilkan **tema on air** (dari state), bukan nilai draft yang belum
   disimpan. Untuk melihat perubahan di preview, klik **Save changes** lalu **Set active on air**.
   Ini disengaja agar preview = kenyataan siaran.
3. Validasi dimensi SVG tidak dilakukan (dilewati); aset SVG diterima apa adanya.
4. Hapus template yang sedang aktif dinonaktifkan di UI (harus aktifkan template lain dulu).

## 5. Rencana berikutnya (Phase 7 — QA & rilis)
- TypeScript check, ESLint, unit/integration test, build produksi.
- Verifikasi transparansi overlay & output 1920×1080.
- Verifikasi pemulihan state setelah reconnect.
- Verifikasi integrasi OBS nyata (masih belum, sama seperti Phase 5).
- Uji setup bersih di Windows dari dokumentasi.
- Review `.gitignore`/rahasia, release notes, README/OBS-SETUP.
