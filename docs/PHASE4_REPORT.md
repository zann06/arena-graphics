# Phase 4 — MLBB Features (Report)

Tanggal: 2026-11-02
Status: **Selesai & terverifikasi** (kecuali verifikasi OBS nyata — masuk Phase 5)

## 1. Fitur yang dibangun

### 1.1 Hero Library
- Tabel `heroes` dengan CRUD penuh: `GET/POST/PUT/DELETE /api/heroes`.
- **Bulk import** `POST /api/heroes/import` — menerima `{ names: string[] }`, men-dedupe
  case-insensitive, melewati nama yang sudah ada, mengembalikan `{ imported, skipped }`.
- Halaman UI **Hero Library** (`/dashboard/heroes`): tabel, tambah/edit/hapus, import massal.

### 1.2 Draft pick & ban
- Format configurable: **Standard** (5 ban / 5 pick per sisi) dan **Quick** (3 ban / 5 pick).
- Slot deterministik 20 per game (ban 1..5, pick 1..5 × blue/red), disimpan ke tabel lama
  `draftSlots` dengan key `match.gameId = matchId * 100 + gameNumber`.
- REST: `GET/PUT/DELETE /api/matches/:id/draft`.
- Realtime: `draft:set`, `draft:format`, `draft:reset`.
- UI: grid pick & ban per sisi, format selector, tombol **Reset draft**.

### 1.3 Statistik per game (manual)
- Kills, turrets, turtles, lords, **gold (boleh negatif)**, durasi (opsional).
- REST: `GET/PUT /api/matches/:id/games/:gameNumber/statistics`.
- Realtime: `statistics:set`, `statistics:reset`.
- UI: stepper per sisi, duration input, **Apply statistics** / **Clear**.

### 1.4 MVP + KDA
- Pilih pemain (dari roster tim biru/merah), hero, dan K/D/A.
- REST: `GET/POST /api/matches/:id/mvp`.
- Realtime: `mvp:set`.
- UI: player select, hero select, stepper K/D/A, **Apply MVP**, label "Saved: …".

### 1.5 Overlay
- **Draft overlay**: crest + wordmark kedua tim, slot ban/pick berwarna tim, format & game.
- **Statistics overlay**: perbandingan dua sisi dengan bar berwarna tim.
- **MVP overlay**: kartu MVP dengan inisial, nama, role, hero, dan K/D/A.
- Semua overlay memakai stage logis 1920×1080 dan data yang sama dengan panel operator.

## 2. File utama
- Server
  - `apps/server/src/services/mlbb.ts` — persistensi draft/statistik/MVP, `loadHero`, `draftGameKey`.
  - `apps/server/src/routes/mlbb.ts` — endpoint draft, statistik, MVP.
  - `apps/server/src/routes/heroes.ts` — CRUD hero + import.
  - `apps/server/src/realtime/state.ts` — state live, `selectMatch`, `loadGameData`, setter.
  - `apps/server/src/socket/index.ts` — handler Socket.IO + skema Zod.
  - `apps/server/src/index.ts` — registrasi route, static SPA yang tahan rebuild.
- Shared
  - `packages/shared/src/types/realtime.ts` — `DRAFT_FORMATS`, `StatisticsCommand`, `MvpCommand`.
- Web
  - `apps/web/src/pages/HeroesPage.tsx`, `ControlPage.tsx`, `MonitorPage.tsx`.
  - `apps/web/src/hooks/api/useHeroes.ts`, `apps/web/src/hooks/useRealtime.ts`.
  - `apps/web/src/overlay/OverlayApp.tsx`, `graphics.tsx`, `OverlayStage.tsx`.
  - `apps/web/src/lib/api-client.ts`, `apps/web/vite.config.ts`.
- Skrip uji
  - `scripts/mlbb-smoke.mjs`, `scripts/graphics-smoke.mjs`,
    `scripts/verify-overlays.mjs`, `scripts/cdp-shot.mjs`,
    `scripts/ui-screenshots.mjs`, `scripts/phase4-demo.mjs`, `scripts/start-server.mjs`.

## 3. Testing & hasil

| Uji | Perintah | Hasil |
|---|---|---|
| API MLBB | `node scripts/mlbb-smoke.mjs` | **ALL CHECKS PASSED** (hero import/CRUD, draft round-trip DB, statistik, MVP, reset) |
| Realtime grafis | `node scripts/graphics-smoke.mjs` | **ALL CHECKS PASSED** (~35 cek: snapshot, 7 overlay, stepping, team intro, statistik, MVP, validasi, reconnect) |
| Overlay visual | `node scripts/verify-overlays.mjs` | **ALL OVERLAYS CAPTURED** (draft/statistics/mvp, 1920×1080, data nyata) |
| UI dashboard | `node scripts/ui-screenshots.mjs` | **ALL SCREENSHOTS CAPTURED** (Heroes/Control/Monitor/Matches) |
| Demo end-to-end | `node scripts/phase4-demo.mjs` | UI dengan data live tersimpan |
| Typecheck | `pnpm --filter @arena/{server,web,graphics-core} typecheck` | bersih |
| Build | `pnpm --filter @arena/{server,web} build` | sukses |

Bukti visual (folder `artifacts/`):
- `overlay-draft-live.png` — 10 pick + 6 ban, wordmark RRQ/ONIC, warna tim merah/emas.
- `overlay-statistics-live.png` — RRQ vs ONIC, bar berwarna tim.
- `overlay-mvp-live.png` — RRQ1 · 12/1/8 · Ling.
- `ui-control-live.png` — control room dengan semua data live.
- `ui-heroes.png`, `ui-monitor.png`, `ui-matches.png`.

## 4. Kendala & perbaikan
1. **`@fastify/static` meng-cache daftar file** → bundle `vite build` baru 404 sampai restart.
   Diperbaiki: `wildcard: true`, `index.html` `no-store`, aset hashed `max-age 1y`.
2. **Wordmark tim tidak tampil** — teks putih di atas header transparan. Diperbaiki: header
   draft diberi gradient gelap sehingga teks selalu terbaca di scene apa pun.
3. **Slot draft terkompresi** — flex-shrink mengecilkan slot. Diperbaiki: `flex: 0 0 92px`
   dan kolom `shrink-0`.
4. **Warna slot pucat** — alpha `44` pada hex. Diperbaiki: gradient tim lebih pekat
   (`cc → 55 → gelap`) + inset border.
5. **Screenshot headless kosong** — `--screenshot` balapan dengan handshake socket.
   Diperbaiki: `scripts/cdp-shot.mjs` menunggu grafis benar-benar ter-render (CDP) lalu
   menangkap pada viewport 1920×1080 yang sebenarnya.
6. **Proses server mati bersama shell** — launcher lama piping stdout. Diperbaiki:
   `scripts/start-server.mjs` memakai `spawn(detached)` dengan **file descriptor** stdio.
7. **`player-intro:step` index besar ditolak** (max 50). Diperbaiki: batas 10.000; handler
   tetap meng-clamp ke ukuran roster.
8. **mlbb-smoke tidak deterministik** — bergantung draft kosong. Diperbaiki: reset draft di
   awal skrip.
9. **Warning "Hero library is empty" muncul saat loading** — diperbaiki dengan `isLoading`.

## 5. Rencana berikutnya (Phase 5)
- Adapter OBS WebSocket (status, connect/disconnect, daftar scene, switch scene,
  visibilitas source, reconnect) + panel UI.
- Password OBS disimpan di server, tidak pernah dikirim ke browser.
- Tandai "belum terverifikasi dengan OBS nyata" sampai diuji dengan instance OBS.
