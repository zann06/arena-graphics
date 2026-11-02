# ARENA GRAPHICS — OBS Setup Guide

## 1. Requirements

- OBS Studio with Browser Source support.
- ARENA GRAPHICS backend and frontend running locally.
- Recommended canvas/output: 1920×1080.
- OBS WebSocket is optional for overlay rendering; it is required only for remote scene/source controls.

## 2. Start the application

From the project root, install dependencies and run the documented development command:

```powershell
pnpm install
pnpm db:migrate
pnpm dev
```

Use the actual ports printed by the application. Do not assume ports if they have been changed in configuration.

Open the operator dashboard in a browser and select or create a match.

## 3. Add a Browser Source

In OBS:

1. Open the scene where the graphic should appear.
2. Under Sources, click `+`.
3. Select `Browser`.
4. Give it a clear name, for example `ARENA - Scoreboard`.
5. Enter the overlay URL, for example `http://127.0.0.1:5173/overlay/scoreboard` (use the actual frontend port shown by the app).
6. Set Width to `1920`.
7. Set Height to `1080`.
8. Keep the source background transparent.
9. Confirm the source is not hidden behind an opaque gameplay/background source.
10. Click OK and verify the overlay.

Create separate Browser Sources for the graphics you need, such as:
- `/overlay/scoreboard`
- `/overlay/player-intro`
- `/overlay/draft`
- `/overlay/statistics`
- `/overlay/mvp`
- `/overlay/fullscreen`

The exact routes must match the routes implemented by the application.

## 4. Layer order

A typical OBS scene may use this order, from top to bottom:

1. ARENA fullscreen graphics / alerts.
2. ARENA player introduction or lower third.
3. ARENA scoreboard.
4. Gameplay capture.
5. Background.

Adjust layer order to match the production design. Do not place an opaque overlay above gameplay unless it is an intentional full-screen graphic.

## 5. OBS WebSocket (optional)

1. In OBS, open `Tools` → `WebSocket Server Settings`.
2. Enable the WebSocket server.
3. Confirm the port (default is 4455).
4. Set a strong password.
5. Set the connection details on the **server** (project root `.env`):

   ```ini
   OBS_HOST=127.0.0.1
   OBS_PORT=4455
   OBS_PASSWORD=your-strong-password
   # Optional: connect automatically when the server starts.
   OBS_AUTO_CONNECT=false
   ```

6. Restart the server, open the dashboard's **OBS Integration** page, and click **Connect**
   (or set `OBS_AUTO_CONNECT=true`).
7. Confirm the status badge shows **Connected**, then test scene listing, a scene switch, and a
   safe source visibility toggle.

Keep the password on the backend/server side. Never paste it into an overlay URL, frontend source
code, or a public repository. The password is never returned to browser clients.

## 6. Troubleshooting

### Overlay is blank
- Confirm the frontend is running.
- Open the overlay URL directly in a browser.
- Check browser developer console and backend logs.
- Confirm the selected match exists.
- Confirm the overlay has received its initial state.

### Overlay has a black background
- Confirm the overlay document and root stage use transparent backgrounds.
- Check Browser Source custom CSS and remove unintended opaque backgrounds.
- Verify no opaque panel covers the full canvas.

### Overlay appears stretched
- Confirm Browser Source is 1920×1080.
- Confirm the renderer uses proportional scaling of a 1920×1080 logical stage.
- Avoid setting independent width and height scaling.

### Updates do not appear
- Check Socket.IO connection status.
- Confirm the dashboard and overlay use the same backend.
- Reconnect the overlay and request the latest state.
- Check server logs for rejected validation or stale revisions.

### OBS controls do not work
- Confirm WebSocket is enabled in OBS.
- Confirm host, port, and password.
- Check that the backend can reach OBS.
- Confirm scene/source names through discovery rather than assuming names.
- Remember that Browser Source rendering does not require WebSocket.

## 7. Live-event safety checklist

Before going live:
- Test every overlay in the actual OBS scene.
- Verify all team logos and player names.
- Confirm the correct match and game are selected.
- Confirm scoreboard and series score.
- Test show/hide and entrance/exit animations.
- Test reconnect behavior.
- Keep a manual fallback scene available.
- Avoid testing destructive reset actions during a live match.
