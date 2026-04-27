# GEMINI.md — Get Music

## Project Context
This is **Get Music** — a web-based Suno AI music generator application.

## Version
**1.1.0**

## Quick Facts
- Language: JavaScript (Node.js backend + Vanilla frontend)
- Framework: Express.js (backend only)
- Styling: Vanilla CSS with custom properties
- API Provider: sunoapi.org (Suno API)
- No build step required — plain static files served by Express

## Important Files
| File | Purpose |
|------|---------|
| `server.js` | Express server, API proxy routes |
| `public/index.html` | Single-page app HTML |
| `public/style.css` | Design system, dark theme |
| `public/app.js` | All frontend logic |
| `.env` | `SUNO_API_KEY`, `SUNO_API_BASE`, `PORT` |

## Rules
1. **Versioning:** Semantic versioning (MAJOR.MINOR.PATCH). Current: `1.1.0`
2. **API Key:** Always stored in `.env`, referenced via `process.env`
3. **No global JS:** Frontend uses IIFE pattern
4. **CSS Variables:** All colors/sizes defined as CSS custom properties in `:root`
5. **No frameworks/libraries** on frontend — pure vanilla JS
6. **CORS:** Audio files proxied through `/api/proxy-audio` endpoint

## How to Run
```bash
npm install
npm run dev
# Open http://localhost:3000
```

## Feature Map
- [x] Text prompt input
- [x] Song count selector (+/- buttons)
- [x] Generate button → queues tasks via API
- [x] Status polling with progress bar
- [x] Left panel playlist with track list
- [x] Double-click to play tracks
- [x] Mini player: play/pause, prev/next, rewind/forward 10s, seek bar (mouse drag), mute/unmute
- [x] WAV format download via API conversion pipeline (MP3 fallback)
- [x] Full-width interactive seek bar with thumb drag
- [x] Reset button clears everything
- [x] API balance display in header
