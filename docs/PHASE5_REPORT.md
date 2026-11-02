# Phase 5 — OBS Integration (Report)

Tanggal: 2026-11-02
Status: **Adapter & UI selesai; terverifikasi dengan mock. BELUM terverifikasi dengan instance OBS nyata.**

> Catatan jujur: lingkungan pengembangan ini tidak memiliki OBS Studio yang berjalan,
> sehingga koneksi/switch scene/visibilitas source belum diuji terhadap OBS sungguhan.
> Semua logika adapter diuji terhadap klien `obs-websocket` palsu (mock). Sebelum siaran,
> wajib diuji dengan OBS nyata (lihat `OBS-SETUP.md` §5).

## 1. Fitur yang dibangun

### 1.1 Backend OBS adapter (`apps/server/src/services/obs.ts`)
- Menggunakan `obs-websocket-js` v5, **hanya di server**.
- `connect()` / `disconnect()` / `getStatus()`.
- Status: `state` (`disconnected|connecting|connected|error`), versi OBS, program scene,
  flag `streaming`/`recording`, `lastError`, `everConnected`.
- `listScenes()` — daftar scene + penanda scene program aktif (urutan OBS di-reverse ke urutan stabil).
- `switchScene(name)` — ganti program scene.
- `listSources(sceneName)` — daftar source pada scene + status visibilitas.
- `setSourceVisibility(scene, source, visible)` — toggle visibilitas source.
- **Reconnect otomatis** saat `ConnectionClosed` tak terduga (delay 5 detik).
- Saat OBS tidak tersedia/salah password: status kembali `error` dengan `lastError`, tanpa crash.
- `ObsNotConnectedError` (HTTP 409) untuk perintah saat OBS belum terhubung.
- **Password hanya ada di server** (dari env), tidak pernah dikirim ke browser.
- Injection point `setClientFactory()` agar adapter dapat diuji dengan mock.

### 1.2 REST API (`apps/server/src/routes/obs.ts`)
| Method | Path | Fungsi |
|---|---|---|
| GET | `/api/obs/status` | Status koneksi |
| POST | `/api/obs/connect` | Connect (override host/port, tanpa password dari klien) |
| POST | `/api/obs/disconnect` | Disconnect |
| GET | `/api/obs/scenes` | Daftar scene |
| POST | `/api/obs/scene` | Switch scene `{ sceneName }` |
| GET | `/api/obs/sources?sceneName=` | Daftar source pada scene |
| POST | `/api/obs/source-visibility` | Set visibilitas `{ sceneName, sourceName, visible }` |

### 1.3 Konfigurasi
- Env baru: `OBS_HOST` (default `127.0.0.1`), `OBS_PORT` (default `4455`), `OBS_PASSWORD`,
  `OBS_AUTO_CONNECT` (default `false`). Dikonfigurasi di boot via `configureObs()`.
- `/api/health` sekarang menyertakan `obs` (`connected|disconnected|error`) dan `phase: 5`;
  `capabilities` mencakup `mlbb` dan `obs`.

### 1.4 UI — OBS Integration (`apps/web/src/pages/ObsPage.tsx`, `/dashboard/obs`)
- Badge status (Connected / Connecting / Error / Disconnected) dengan polling 5 detik.
- Ringkasan: endpoint, versi OBS, program scene, status streaming & recording.
- Panel **Connect**: input host/port + tombol Connect/Disconnect; catatan bahwa password
  ada di server (`OBS_PASSWORD`).
- **Scene list**: klik untuk switch scene; scene aktif ditandai "On Program".
- **Source list** (saat terhubung): tombol Visible/Hidden per source pada scene aktif.
- Banner kuning jelas: "Not verified against a live OBS instance…".
- Nav sidebar baru: **OBS Integration**.

## 2. File utama
- `apps/server/src/services/obs.ts` — adapter OBS.
- `apps/server/src/routes/obs.ts` — 7 endpoint REST.
- `apps/server/src/config/env.ts` — variabel OBS_*.
- `apps/server/src/routes/health.ts` — status OBS + phase 5.
- `apps/server/src/index.ts` — registrasi route, `configureObs`, auto-connect opt-in.
- `apps/web/src/hooks/api/useObs.ts` — hooks React Query (status, scenes, sources, mutations).
- `apps/web/src/pages/ObsPage.tsx` — halaman OBS.
- `apps/web/src/App.tsx` — route + nav.
- `.env.example`, `OBS-SETUP.md` — dokumentasi konfigurasi & Browser Source.
- `scripts/obs-adapter-test.mjs`, `scripts/obs-shot.mjs` — pengujian & screenshot.

## 3. Testing & hasil

| Uji | Perintah | Hasil |
|---|---|---|
| Adapter (mock) | `pnpm test:obs` | **ALL OBS ADAPTER CHECKS PASSED** (17 cek: guard 409, connect, versi, scene, reverse-order, switch, sources, visibility, password tidak bocor, jalur gagal, disconnect) |
| REST (tanpa OBS) | probe manual | `status`→disconnected; `scenes`→409; `connect`→`ECONNREFUSED` graceful; `disconnect`→200 |
| Health | `GET /api/health` | `obs: disconnected`, `phase: 5`, `capabilities: [... mlbb, obs]` |
| UI | `node scripts/obs-shot.mjs` | `artifacts/ui-obs.png` — halaman OBS ter-render dengan status live |
| Typecheck/Build | `pnpm --filter @arena/{server,web} typecheck/build` | bersih / sukses |
| Regresi Phase 3–4 | graphics-smoke, mlbb-smoke, verify-overlays, ui-screenshots | semua tetap hijau |

## 4. Batasan & tindak lanjut
1. **Belum diuji dengan OBS nyata.** Langkah verifikasi:
   - Aktifkan WebSocket di OBS (`Tools → WebSocket Server Settings`), set password.
   - Isi `OBS_PASSWORD` di `.env`, restart server, buka halaman OBS Integration, klik Connect.
   - Pastikan badge **Connected**, daftar scene muncul, switch scene & toggle source bekerja.
2. `connect()` mengembalikan status tanpa reconnect bila sudah terhubung; untuk mengubah
   host/port, disconnect dulu.
3. `everConnected` baru `true` setelah koneksi OBS nyata berhasil.

## 5. Rencana berikutnya (Phase 6)
- Asset upload lokal (`@fastify/multipart`, tabel `assets`), validasi tipe/ukuran/dimensi.
- Template Studio: daftar template, warna & tipografi, layout preset, duplikasi/reset.
- Verifikasi perubahan template di preview overlay.
